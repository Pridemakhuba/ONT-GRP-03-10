// ============================================================
// PRS.Backend/Helpers/JwtHelper.cs
// Generates JWT tokens after successful AD authentication
// ============================================================
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PRS.Backend.Models;

namespace PRS.Backend.Helpers;

public class JwtHelper
{
    private readonly IConfiguration _config;

    public JwtHelper(IConfiguration config) => _config = config;

    public string GenerateToken(User user)
    {
        var secret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("JWT secret not configured");
        var issuer = _config["Jwt:Issuer"] ?? "PRS.Backend";
        var audience = _config["Jwt:Audience"] ?? "PRS.Frontend";
        var expiry = int.Parse(_config["Jwt:ExpiryInHours"] ?? "8");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username", user.ADUsername),
            new Claim("fullName", user.FullName),
            new Claim("role", user.Role),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiry),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public DateTime GetExpiry() =>
        DateTime.UtcNow.AddHours(int.Parse(_config["Jwt:ExpiryInHours"] ?? "8"));
}