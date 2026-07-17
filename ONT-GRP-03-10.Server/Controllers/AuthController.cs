// ============================================================
// PRS.Backend/Controllers/AuthController.cs
// Handles Authentication + JWT Issuance
// 
// AUTH FLOW:
//   1. First checks database for test users (PasswordHash column)
//   2. If not found in DB or no hash, falls back to Active Directory
//   3. If both fail, returns 401 Unauthorized
// 
// TEST USERS (set via SQL script):
//   admin      / test123  (Admin role)
//   supervisor / test123  (Supervisor role)
//   evaluator  / test123  (Evaluator role)
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
        
        if (user == null)
        {
            _logger.LogWarning("User NOT FOUND in database: {Username}", cleanUsername);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        _logger.LogInformation("User FOUND: {Username}, HasPasswordHash: {HasHash}", 
            cleanUsername, !string.IsNullOrEmpty(user.PasswordHash));

        // CHECK DATABASE PASSWORD FIRST
        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            var dbResult = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            _logger.LogInformation("Database password check: {Result}", dbResult);
            
            if (!dbResult)
                return Unauthorized(new { message = "Invalid credentials." });
        }
        else
        {
            // NO PASSWORD HASH - try Active Directory
            _logger.LogInformation("No PasswordHash, trying AD...");
            try
            {
                var adResult = await _ad.ValidateCredentialsAsync(cleanUsername, dto.Password);
                if (!adResult)
                    return Unauthorized(new { message = "Invalid credentials." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AD authentication failed");
                return Unauthorized(new { message = "Authentication unavailable." });
            }
        }

        if (!user.IsActive)
            return Unauthorized(new { message = "Account deactivated." });

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