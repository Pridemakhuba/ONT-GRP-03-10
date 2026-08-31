// ============================================================
// PRS.Backend/Controllers/ProposalsController.cs
// ============================================================
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.DTOs;
using PRS.Backend.Models;
using PRS.Backend.Services;
using System.Security.Claims;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/proposals")]
[Authorize]
public class ProposalsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IFileUploadService _files;
    private readonly IEmailService _email;
    private readonly ILogger<ProposalsController> _logger;

    public ProposalsController(ApplicationDbContext db, IFileUploadService files, IEmailService email, ILogger<ProposalsController> logger)
    {
        _db = db;
        _files = files;
        _email = email;
        _logger = logger;
    }

    /// <summary>GET /api/proposals — All proposals (Supervisor/Admin)</summary>
    [HttpGet]
    [Authorize(Roles = "Supervisor,Admin")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var query = _db.Proposals
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.AssignedEvaluators).ThenInclude(pe => pe.Evaluator).ThenInclude(e => e.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        var proposals = await query.OrderByDescending(p => p.CreatedDate).ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>GET /api/proposals/{id}</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await LoadProposal(id);
        return p == null ? NotFound() : Ok(ToDto(p));
    }

    /// <summary>GET /api/proposals/student/{studentId}</summary>
    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetByStudent(int studentId)
    {
        var proposals = await _db.Proposals
            .Where(p => p.StudentID == studentId)
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.Evaluations)
            .OrderByDescending(p => p.CreatedDate)
            .ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>GET /api/proposals/pending-evaluation — Proposals ready to be evaluated</summary>
    [HttpGet("pending-evaluation")]
    [Authorize(Roles = "Supervisor,Admin,Evaluator")]
    public async Task<IActionResult> GetPendingEvaluation()
    {
        var proposals = await _db.Proposals
            .Where(p => p.Status == "UnderReview" && p.SupervisorSigned)
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.AssignedEvaluators)
            .ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>
    /// POST /api/proposals — Submit a new proposal with document upload.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Create([FromForm] CreateProposalDto dto, IFormFile document)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (document == null) return BadRequest(new { message = "Proposal document is required" });

        // Check proposal deadline
        var proposalDeadline = await _db.Deadlines
            .Where(d => d.DeadlineType == "Proposal" && d.IsActive)
            .OrderByDescending(d => d.DueDate)
            .FirstOrDefaultAsync();

        if (proposalDeadline != null && DateTime.UtcNow > proposalDeadline.DueDate)
        {
            return BadRequest(new { message = $"Proposal submission closed. Deadline was {proposalDeadline.DueDate:dd MMMM yyyy}." });
        }

        // Get the student profile for the current user
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");        
        var student = await _db.Students.FirstOrDefaultAsync(s => s.UserID == userId);
        if (student == null)
        {
            _logger.LogWarning("Student not found for UserID: {UserId}", userId);
            return BadRequest(new { message = "Student profile not found. Contact the administrator." });
        }

        // Upload the document
        string docPath;
        try { docPath = await _files.UploadProposalAsync(document, 0); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }

        var proposal = new Proposal
        {
            StudentID = student.StudentID,
            Title = dto.Title,
            Abstract = dto.Abstract,
            Keywords = dto.Keywords,
            DocumentPath = docPath,
            Status = "Draft"
        };
        _db.Proposals.Add(proposal);
        await _db.SaveChangesAsync();

        // Update document path now we have the ProposalID
        proposal.DocumentPath = await _files.UploadProposalAsync(document, proposal.ProposalID);
        await _db.SaveChangesAsync();

        // Notify primary supervisor
        var primarySupervisor = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == student.StudentID && ss.IsPrimary)
            .Include(ss => ss.Supervisor).ThenInclude(s => s.User)
            .FirstOrDefaultAsync();

        if (primarySupervisor != null)
        {
            await _email.SendSupervisorSignoffRequestAsync(
                primarySupervisor.Supervisor.User.Email,
                primarySupervisor.Supervisor.User.FullName,
                student.User?.FullName ?? "Student",
                proposal.Title);

            _db.Notifications.Add(new Notification
            {
                UserID = primarySupervisor.Supervisor.UserID,
                Message = $"New proposal '{proposal.Title}' submitted by your student and awaiting your sign-off.",
                Type = "ProposalSignoffRequired"
            });
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("Proposal {ID} created by student {StudentID}", proposal.ProposalID, student.StudentID);
        return CreatedAtAction(nameof(GetById), new { id = proposal.ProposalID }, ToDto(proposal));
    }

    /// <summary>PUT /api/proposals/{id} — Update draft proposal details</summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProposalDto dto)
    {
        var proposal = await _db.Proposals.FindAsync(id);
        if (proposal == null) return NotFound();
        if (proposal.Status != "Draft" && proposal.Status != "Revised")
            return BadRequest(new { message = "Only Draft or Revised proposals can be updated" });

        if (dto.Title != null) proposal.Title = dto.Title;
        if (dto.Abstract != null) proposal.Abstract = dto.Abstract;
        if (dto.Keywords != null) proposal.Keywords = dto.Keywords;
        await _db.SaveChangesAsync();
        return Ok(proposal);
    }

    /// <summary>PUT /api/proposals/{id}/submit — Student formally submits proposal</summary>
    [HttpPut("{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Submit(int id)
    {
        var proposal = await _db.Proposals.FindAsync(id);
        if (proposal == null) return NotFound();
        if (proposal.Status != "Draft" && proposal.Status != "Revised")
            return BadRequest(new { message = "Only Draft or Revised proposals can be submitted" });

        // Check deadline
        var proposalDeadline = await _db.Deadlines
            .Where(d => d.DeadlineType == "Proposal" && d.IsActive)
            .OrderByDescending(d => d.DueDate)
            .FirstOrDefaultAsync();
        if (proposalDeadline != null && DateTime.UtcNow > proposalDeadline.DueDate)
            return BadRequest(new { message = $"Submission closed. Deadline was {proposalDeadline.DueDate:dd MMMM yyyy}." });

        proposal.Status = "Submitted";
        proposal.SubmissionDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Proposal submitted successfully", proposal });
    }

    /// <summary>PUT /api/proposals/{id}/supervisor-signoff — Supervisor approves and signs off</summary>
    [HttpPut("{id}/supervisor-signoff")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> SupervisorSignoff(int id)
    {
        var proposal = await _db.Proposals
            .Include(p => p.Student).ThenInclude(s => s.User)
            .FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        proposal.SupervisorSigned = true;
        proposal.SupervisorSignedDate = DateTime.UtcNow;
        proposal.Status = "Submitted";
        await _db.SaveChangesAsync();

        _db.Notifications.Add(new Notification
        {
            UserID = proposal.Student.UserID,
            Message = $"Your supervisor has signed off on your proposal '{proposal.Title}'.",
            Type = "SupervisorSignoff"
        });
        await _db.SaveChangesAsync();
        return Ok(new { message = "Proposal signed off successfully" });
    }

    /// <summary>POST /api/proposals/{id}/assign-evaluators — Assign evaluators to a proposal</summary>
    [HttpPost("{id}/assign-evaluators")]
    [Authorize(Roles = "Supervisor,Admin")]
    public async Task<IActionResult> AssignEvaluators(int id, [FromBody] AssignEvaluatorsDto dto)
    {
        if (dto.EvaluatorIDs.Count < 2)
            return BadRequest(new { message = "At least 2 evaluators must be assigned" });

        var proposal = await _db.Proposals
            .Include(p => p.Student)
            .Include(p => p.AssignedEvaluators)
            .FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        var studentSupervisorIds = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == proposal.StudentID)
            .Select(ss => ss.SupervisorID)
            .ToListAsync();

        foreach (var evaluatorId in dto.EvaluatorIDs)
        {
            if (studentSupervisorIds.Contains(evaluatorId))
                return BadRequest(new { message = $"Evaluator {evaluatorId} is a supervisor of this student and cannot evaluate their proposal." });

            if (!await _db.ProposalEvaluators.AnyAsync(pe => pe.ProposalID == id && pe.EvaluatorID == evaluatorId))
            {
                _db.ProposalEvaluators.Add(new ProposalEvaluator
                {
                    ProposalID = id,
                    EvaluatorID = evaluatorId
                });

                var evaluator = await _db.Supervisors.Include(s => s.User).FirstOrDefaultAsync(s => s.SupervisorID == evaluatorId);
                if (evaluator != null)
                {
                    await _email.SendEvaluationAssignedAsync(evaluator.User.Email, evaluator.User.FullName, proposal.Title);
                    _db.Notifications.Add(new Notification
                    {
                        UserID = evaluator.UserID,
                        Message = $"You have been assigned to evaluate proposal: '{proposal.Title}'.",
                        Type = "EvaluationAssigned"
                    });
                }
            }
        }

        proposal.Status = "UnderReview";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Evaluators assigned successfully" });
    }

    private async Task<Proposal?> LoadProposal(int id) => await _db.Proposals
        .Include(p => p.Student).ThenInclude(s => s.User)
        .Include(p => p.Evaluations).ThenInclude(e => e.Evaluator).ThenInclude(sv => sv.User)
        .Include(p => p.AssignedEvaluators).ThenInclude(pe => pe.Evaluator).ThenInclude(sv => sv.User)
        .Include(p => p.EthicsCertificates)
        .FirstOrDefaultAsync(p => p.ProposalID == id);

    private static ProposalDto ToDto(Proposal p) => new()
    {
        ProposalID = p.ProposalID,
        StudentID = p.StudentID,
        Title = p.Title,
        Abstract = p.Abstract,
        Keywords = p.Keywords,
        DocumentPath = p.DocumentPath,
        SupervisorSigned = p.SupervisorSigned,
        SupervisorSignedDate = p.SupervisorSignedDate,
        Status = p.Status,
        SubmissionDate = p.SubmissionDate,
        CreatedDate = p.CreatedDate,
        Student = p.Student != null ? new StudentDto
        {
            StudentID = p.Student.StudentID,
            StudentNumber = p.Student.StudentNumber,
            Program = p.Student.Program,
            User = new UserDto { UserID = p.Student.User.UserID, FirstName = p.Student.User.FirstName, LastName = p.Student.User.LastName, Email = p.Student.User.Email }
        } : null,
        AssignedEvaluators = p.AssignedEvaluators?.Select(pe => new EvaluatorAssignmentDto
        {
            ProposalEvaluatorID = pe.ProposalEvaluatorID,
            EvaluatorID = pe.EvaluatorID,
            EvaluatorName = pe.Evaluator?.User?.FullName ?? "",
            AssignedDate = pe.AssignedDate,
            HasSubmittedEvaluation = false
        }).ToList() ?? new()
    };
}