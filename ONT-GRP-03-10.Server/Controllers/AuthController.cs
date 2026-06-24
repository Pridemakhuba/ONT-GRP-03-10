// ============================================================
// PRS.Backend/Controllers/AuthController.cs
// Handles Active Directory authentication + JWT issuance
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

    /// <summary>
    /// POST /api/auth/login
    /// Authenticates user against Active Directory, creates/updates local record, returns JWT.
    /// Username can be supplied as "username" or "domain\username".
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] ADLoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Strip domain prefix for AD lookup
        var cleanUsername = dto.Username.Contains('\\')
            ? dto.Username.Split('\\', 2)[1]
            : dto.Username;

        // Step 1: Validate credentials against Active Directory
        var isValid = await _ad.ValidateCredentialsAsync(cleanUsername, dto.Password);
        if (!isValid)
        {
            _logger.LogWarning("Failed AD login attempt for: {Username}", cleanUsername);
            return Unauthorized(new { message = "Invalid university credentials. Please try again." });
        }

        // Step 2: Fetch user details from AD
        var adUser = await _ad.GetUserFromADAsync(cleanUsername);

        // Step 3: Sync with local database
        var user = await _db.Users.FirstOrDefaultAsync(u => u.ADUsername == cleanUsername);

        if (user == null)
        {
            // New user — import from AD automatically
            user = new User
            {
                ADUsername = cleanUsername,
                Email = adUser?.Email ?? $"{cleanUsername}@university.ac.za",
                FirstName = adUser?.FirstName ?? cleanUsername,
                LastName = adUser?.LastName ?? "",
                Department = adUser?.Department,
                Role = "Student", // Default role; Admin can change later
                IsActive = true
            };
            _db.Users.Add(user);

            // Log import
            _db.ADImportLogs.Add(new ADImportLog
            {
                ADUsername = cleanUsername,
                Action = "Imported",
                Details = $"Auto-imported on first login. Email: {user.Email}"
            });

            _logger.LogInformation("New user imported from AD: {Username}", cleanUsername);
        }
        else
        {
            // Existing user — update details from AD in case anything changed
            if (adUser != null)
            {
                user.Email = adUser.Email.Length > 0 ? adUser.Email : user.Email;
                user.FirstName = adUser.FirstName.Length > 0 ? adUser.FirstName : user.FirstName;
                user.LastName = adUser.LastName.Length > 0 ? adUser.LastName : user.LastName;
                user.Department = adUser.Department ?? user.Department;
                user.UpdatedDate = DateTime.UtcNow;
            }
        }

        // Check if account is active
        if (!user.IsActive)
            return Unauthorized(new { message = "Your account has been deactivated. Contact the system administrator." });

        user.LastLoginDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Step 4: Generate JWT token
        var token = _jwt.GenerateToken(user);

        _logger.LogInformation("Successful login: {Username} ({Role})", cleanUsername, user.Role);

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

    /// <summary>
    /// GET /api/auth/me
    /// Returns the profile of the currently authenticated user.
    /// </summary>
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

    /// <summary>POST /api/auth/logout — Client-side logout (invalidate client JWT)</summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // JWT is stateless — actual invalidation happens client-side by deleting the token.
        // For production, implement a token blacklist/revocation list.
        return Ok(new { message = "Logged out successfully." });
    }
}