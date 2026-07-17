// ============================================================
// PRS.Backend/Controllers/UsersController.cs
// ============================================================
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.DTOs;
using PRS.Backend.Models;
using PRS.Backend.Services;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IActiveDirectoryService _ad;

    public UsersController(ApplicationDbContext db, IActiveDirectoryService ad)
    {
        _db = db;
        _ad = ad;
    }

    /// <summary>GET /api/users — List all users (Admin only)</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                u.FirstName.Contains(search) ||
                u.LastName.Contains(search) ||
                u.Email.Contains(search) ||
                u.ADUsername.Contains(search));

        var users = await query.OrderBy(u => u.LastName).Select(u => ToDto(u)).ToListAsync();
        return Ok(users);
    }

    /// <summary>GET /api/users/{id}</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _db.Users.FindAsync(id);
        return user == null ? NotFound() : Ok(ToDto(user));
    }

    /// <summary>PUT /api/users/{id}/role — Change a user's role (Admin only)</summary>
    [HttpPut("{id}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
    {
        var validRoles = new[] { "Student", "Supervisor", "Evaluator", "Admin" };
        if (!validRoles.Contains(dto.Role))
            return BadRequest(new { message = "Invalid role. Must be: Student, Supervisor, Evaluator, or Admin" });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.Role = dto.Role;
        user.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Role updated to {dto.Role}", user = ToDto(user) });
    }

    /// <summary>GET /api/users/import-from-ad?search=... — Search AD and preview importable users</summary>
    [HttpGet("import-from-ad")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SearchAD([FromQuery] string search)
    {
        if (string.IsNullOrWhiteSpace(search))
            return BadRequest(new { message = "Search term required" });

        var adUsers = await _ad.SearchUsersAsync(search);

        // Mark which users are already in the system
        var existingUsernames = await _db.Users.Select(u => u.ADUsername).ToListAsync();
        foreach (var u in adUsers)
            u.AlreadyInSystem = existingUsernames.Contains(u.ADUsername);

        return Ok(adUsers);
    }

    /// <summary>POST /api/users/import — Bulk import users from AD (Admin only)</summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ImportUsers([FromBody] ImportUsersDto dto)
    {
        var results = new List<object>();

        foreach (var username in dto.ADUsernames)
        {
           var adUser = await _ad.GetUserFromADAsync(username, "");
            if (adUser == null)
            {
                _db.ADImportLogs.Add(new ADImportLog { ADUsername = username, Action = "Failed", Details = "User not found in AD" });
                results.Add(new { username, status = "Failed", reason = "Not found in AD" });
                continue;
            }

            var existing = await _db.Users.FirstOrDefaultAsync(u => u.ADUsername == username);
            if (existing != null)
            {
                existing.FirstName = adUser.FirstName;
                existing.LastName = adUser.LastName;
                existing.Email = adUser.Email;
                existing.Department = adUser.Department;
                existing.UpdatedDate = DateTime.UtcNow;
                _db.ADImportLogs.Add(new ADImportLog { ADUsername = username, Action = "Updated" });
                results.Add(new { username, status = "Updated" });
            }
            else
            {
                var newUser = new User
                {
                    ADUsername = username,
                    FirstName = adUser.FirstName,
                    LastName = adUser.LastName,
                    Email = adUser.Email,
                    Department = adUser.Department,
                    Role = dto.Role,
                    IsActive = true
                };
                _db.Users.Add(newUser);
                _db.ADImportLogs.Add(new ADImportLog { ADUsername = username, Action = "Imported", Details = $"Role: {dto.Role}" });
                results.Add(new { username, status = "Imported" });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { imported = results.Count, results });
    }

    private static UserDto ToDto(User u) => new()
    {
        UserID = u.UserID,
        Email = u.Email,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Department = u.Department,
        Role = u.Role,
        ADUsername = u.ADUsername,
        IsActive = u.IsActive,
        LastLoginDate = u.LastLoginDate,
        CreatedDate = u.CreatedDate
    };
}

// ============================================================
// PRS.Backend/Controllers/StudentsController.cs
// ============================================================
[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public StudentsController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    [Authorize(Roles = "Supervisor,Admin")]
    public async Task<IActionResult> GetAll()
    {
        var students = await _db.Students
            .Include(s => s.User)
            .Include(s => s.StudentSupervisors).ThenInclude(ss => ss.Supervisor).ThenInclude(sv => sv.User)
            .OrderBy(s => s.User.LastName)
            .Select(s => ToDto(s))
            .ToListAsync();
        return Ok(students);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _db.Students
            .Include(x => x.User)
            .Include(x => x.StudentSupervisors).ThenInclude(ss => ss.Supervisor).ThenInclude(sv => sv.User)
            .FirstOrDefaultAsync(x => x.StudentID == id);
        return s == null ? NotFound() : Ok(ToDto(s));
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        var s = await _db.Students
            .Include(x => x.User)
            .Include(x => x.StudentSupervisors).ThenInclude(ss => ss.Supervisor).ThenInclude(sv => sv.User)
            .FirstOrDefaultAsync(x => x.UserID == userId);
        return s == null ? NotFound(new { message = "Student profile not found" }) : Ok(ToDto(s));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateStudentDto dto)
    {
        if (await _db.Students.AnyAsync(s => s.UserID == dto.UserID))
            return Conflict(new { message = "Student profile already exists for this user" });
        if (await _db.Students.AnyAsync(s => s.StudentNumber == dto.StudentNumber))
            return Conflict(new { message = "Student number already in use" });

        var student = new Student
        {
            UserID = dto.UserID,
            StudentNumber = dto.StudentNumber,
            Program = dto.Program,
            ResearchTopic = dto.ResearchTopic
        };
        _db.Students.Add(student);

        // Ensure user has Student role
        var user = await _db.Users.FindAsync(dto.UserID);
        if (user != null && user.Role != "Student") { user.Role = "Student"; }

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = student.StudentID }, ToDto(student));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateStudentDto dto)
    {
        var student = await _db.Students.FindAsync(id);
        if (student == null) return NotFound();

        student.Program = dto.Program;
        student.ResearchTopic = dto.ResearchTopic;
        await _db.SaveChangesAsync();
        return Ok(student);
    }

    private static StudentDto ToDto(Student s) => new()
    {
        StudentID = s.StudentID,
        UserID = s.UserID,
        StudentNumber = s.StudentNumber,
        Program = s.Program,
        ResearchTopic = s.ResearchTopic,
        User = new UserDto
        {
            UserID = s.User.UserID,
            Email = s.User.Email,
            FirstName = s.User.FirstName,
            LastName = s.User.LastName,
            Department = s.User.Department,
            Role = s.User.Role,
            ADUsername = s.User.ADUsername,
            IsActive = s.User.IsActive
        },
        Supervisors = s.StudentSupervisors.Select(ss => new SupervisorDto
        {
            SupervisorID = ss.Supervisor.SupervisorID,
            UserID = ss.Supervisor.UserID,
            Expertise = ss.Supervisor.Expertise,
            IsPrimary = ss.IsPrimary,
            User = new UserDto
            {
                UserID = ss.Supervisor.User.UserID,
                FirstName = ss.Supervisor.User.FirstName,
                LastName = ss.Supervisor.User.LastName,
                Email = ss.Supervisor.User.Email
            }
        }).ToList()
    };
}

// ============================================================
// PRS.Backend/Controllers/SupervisorsController.cs
// ============================================================
[ApiController]
[Route("api/supervisors")]
[Authorize]
public class SupervisorsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SupervisorsController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var supervisors = await _db.Supervisors
            .Include(s => s.User)
            .OrderBy(s => s.User.LastName)
            .Select(s => new SupervisorDto
            {
                SupervisorID = s.SupervisorID,
                UserID = s.UserID,
                Expertise = s.Expertise,
                User = new UserDto
                {
                    UserID = s.User.UserID,
                    FirstName = s.User.FirstName,
                    LastName = s.User.LastName,
                    Email = s.User.Email,
                    Department = s.User.Department,
                    Role = s.User.Role,
                    ADUsername = s.User.ADUsername
                }
            }).ToListAsync();
        return Ok(supervisors);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _db.Supervisors.Include(x => x.User).FirstOrDefaultAsync(x => x.SupervisorID == id);
        if (s == null) return NotFound();
        return Ok(new SupervisorDto
        {
            SupervisorID = s.SupervisorID,
            UserID = s.UserID,
            Expertise = s.Expertise,
            User = new UserDto { UserID = s.User.UserID, FirstName = s.User.FirstName, LastName = s.User.LastName, Email = s.User.Email }
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSupervisorDto dto)
    {
        if (await _db.Supervisors.AnyAsync(s => s.UserID == dto.UserID))
            return Conflict(new { message = "Supervisor profile already exists for this user" });

        var supervisor = new Supervisor { UserID = dto.UserID, Expertise = dto.Expertise };
        _db.Supervisors.Add(supervisor);

        var user = await _db.Users.FindAsync(dto.UserID);
        if (user != null) user.Role = "Supervisor";

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = supervisor.SupervisorID }, supervisor);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateSupervisorDto dto)
    {
        var s = await _db.Supervisors.FindAsync(id);
        if (s == null) return NotFound();
        s.Expertise = dto.Expertise;
        await _db.SaveChangesAsync();
        return Ok(s);
    }
}

// ============================================================
// PRS.Backend/Controllers/StudentSupervisorsController.cs
// ============================================================
[ApiController]
[Route("api/student-supervisors")]
[Authorize(Roles = "Admin,Supervisor")]
public class StudentSupervisorsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public StudentSupervisorsController(ApplicationDbContext db) => _db = db;

    [HttpPost("assign")]
    public async Task<IActionResult> Assign([FromBody] AssignSupervisorDto dto)
    {
        // Prevent duplicate assignment
        if (await _db.StudentSupervisors.AnyAsync(ss => ss.StudentID == dto.StudentID && ss.SupervisorID == dto.SupervisorID))
            return Conflict(new { message = "This supervisor is already assigned to this student" });

        // Enforce single primary supervisor
        if (dto.IsPrimary && await _db.StudentSupervisors.AnyAsync(ss => ss.StudentID == dto.StudentID && ss.IsPrimary))
            return BadRequest(new { message = "Student already has a primary supervisor. Remove the existing primary first." });

        var assignment = new StudentSupervisor
        {
            StudentID = dto.StudentID,
            SupervisorID = dto.SupervisorID,
            IsPrimary = dto.IsPrimary
        };
        _db.StudentSupervisors.Add(assignment);
        await _db.SaveChangesAsync();
        return Ok(assignment);
    }

    [HttpGet("student/{studentId}")]
    [Authorize]
    public async Task<IActionResult> GetByStudent(int studentId)
    {
        var supervisors = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == studentId)
            .Include(ss => ss.Supervisor).ThenInclude(s => s.User)
            .Select(ss => new SupervisorDto
            {
                SupervisorID = ss.Supervisor.SupervisorID,
                UserID = ss.Supervisor.UserID,
                Expertise = ss.Supervisor.Expertise,
                IsPrimary = ss.IsPrimary,
                User = new UserDto { UserID = ss.Supervisor.User.UserID, FirstName = ss.Supervisor.User.FirstName, LastName = ss.Supervisor.User.LastName, Email = ss.Supervisor.User.Email }
            }).ToListAsync();
        return Ok(supervisors);
    }

    [HttpGet("supervisor/{supervisorId}")]
    [Authorize]
    public async Task<IActionResult> GetBySupervisor(int supervisorId)
    {
        var students = await _db.StudentSupervisors
            .Where(ss => ss.SupervisorID == supervisorId)
            .Include(ss => ss.Student).ThenInclude(s => s.User)
            .Select(ss => new StudentDto
            {
                StudentID = ss.Student.StudentID,
                UserID = ss.Student.UserID,
                StudentNumber = ss.Student.StudentNumber,
                Program = ss.Student.Program,
                ResearchTopic = ss.Student.ResearchTopic,
                User = new UserDto { UserID = ss.Student.User.UserID, FirstName = ss.Student.User.FirstName, LastName = ss.Student.User.LastName, Email = ss.Student.User.Email }
            }).ToListAsync();
        return Ok(students);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(int id)
    {
        var assignment = await _db.StudentSupervisors.FindAsync(id);
        if (assignment == null) return NotFound();
        _db.StudentSupervisors.Remove(assignment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}