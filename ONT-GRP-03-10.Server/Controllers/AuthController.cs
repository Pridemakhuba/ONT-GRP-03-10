// ============================================================
// PRS.Backend/Controllers/AuthController.cs
// Handles Active Directory + Database authentication + JWT
// Auto-creates Student record for new Student users
// 
// TEST USERS: admin/test123, supervisor/test123, evaluator/test123
// AD USERS: s226147568/campus_password
// ============================================================
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.DTOs;
using PRS.Backend.Helpers;
using PRS.Backend.Models;
using PRS.Backend.Services;
using System.Security.Claims;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IActiveDirectoryService _ad;
    private readonly JwtHelper _jwt;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ApplicationDbContext db,
        IActiveDirectoryService ad,
        JwtHelper jwt,
        ILogger<AuthController> logger)
    {
        _db = db;
        _ad = ad;
        _jwt = jwt;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] ADLoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var cleanUsername = dto.Username.Contains('\\')
            ? dto.Username.Split('\\', 2)[1]
            : dto.Username;

        _logger.LogInformation("=== LOGIN ATTEMPT: {Username} ===", cleanUsername);

        // Find user in database
        var user = await _db.Users.FirstOrDefaultAsync(u => u.ADUsername == cleanUsername);

        // === STEP 1: Try database password first (for test accounts) ===
        if (user != null && !string.IsNullOrEmpty(user.PasswordHash))
        {
            try
            {
                if (BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                {
                    _logger.LogInformation("DB LOGIN: {Username} ({Role})", cleanUsername, user.Role);
                    return await BuildLoginResponse(user, cleanUsername);
                }
            }
            catch { /* BCrypt failed, try AD */ }
        }

        // === STEP 2: Try Active Directory ===
        bool adValid = false;
        try
        {
            adValid = await _ad.ValidateCredentialsAsync(cleanUsername, dto.Password);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AD unavailable for: {Username}", cleanUsername);
            
            // If AD is down and no database password, reject
            if (user == null || string.IsNullOrEmpty(user.PasswordHash))
                return StatusCode(503, new { message = "Authentication service unavailable." });
        }

        if (adValid)
        {
            // Get AD details
            ADUserDto? adUser = null;
            try { adUser = await _ad.GetUserFromADAsync(cleanUsername, dto.Password); } catch { }

            if (user == null)
            {
                user = new User
                {
                    ADUsername = cleanUsername,
                    Email = adUser?.Email ?? $"{cleanUsername}@mandela.ac.za",
                    FirstName = adUser?.FirstName ?? cleanUsername,
                    LastName = adUser?.LastName ?? "",
                    Department = adUser?.Department,
                    Role = "Student",
                    IsActive = true
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
                _logger.LogInformation("New user from AD: {Username}", cleanUsername);
            }
            else if (adUser != null)
            {
                user.Email = !string.IsNullOrEmpty(adUser.Email) ? adUser.Email : user.Email;
                user.FirstName = !string.IsNullOrEmpty(adUser.FirstName) ? adUser.FirstName : user.FirstName;
                user.LastName = !string.IsNullOrEmpty(adUser.LastName) ? adUser.LastName : user.LastName;
                user.Department = adUser.Department ?? user.Department;
                user.UpdatedDate = DateTime.UtcNow;
            }

            return await BuildLoginResponse(user, cleanUsername);
        }

        // === NO VALID LOGIN ===
        _logger.LogWarning("Failed login: {Username}", cleanUsername);
        return Unauthorized(new { message = "Invalid credentials." });
    }

    private async Task<IActionResult> BuildLoginResponse(User user, string cleanUsername)
    {
        if (!user.IsActive)
            return Unauthorized(new { message = "Account deactivated." });

        // Auto-create Student record if missing
        if (user.Role == "Student")
        {
            var existingStudent = await _db.Students.FirstOrDefaultAsync(s => s.UserID == user.UserID);
            if (existingStudent == null)
            {
                _db.Students.Add(new Student
                {
                    UserID = user.UserID,
                    StudentNumber = cleanUsername,
                    Program = "",
                    ResearchTopic = ""
                });
                _logger.LogInformation("Student record auto-created: {Username}", cleanUsername);
            }
        }

        user.LastLoginDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var token = _jwt.GenerateToken(user);
        _logger.LogInformation("=== LOGIN SUCCESS: {Username} ({Role}) ===", cleanUsername, user.Role);

        return Ok(new LoginResponseDto
        {
            Token = token,
            Username = user.ADUsername,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            Department = user.Department,
            UserID = user.UserID,
            ExpiresAt = _jwt.GetExpiry()
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(new UserDto
        {
            UserID = user.UserID,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Department = user.Department,
            Role = user.Role,
            ADUsername = user.ADUsername,
            IsActive = user.IsActive,
            LastLoginDate = user.LastLoginDate,
            CreatedDate = user.CreatedDate
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return Ok(new { message = "Logged out successfully." });
    }
}