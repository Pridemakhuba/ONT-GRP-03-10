// ============================================================
// PRS.Backend/Helpers/JwtHelper.cs
// Generates JWT tokens after successful AD authentication
// ============================================================
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using PRS.Backend.Models;

namespace PRS.Backend.Helpers;

public class JwtHelper
{
    private readonly IConfiguration _config;

    public JwtHelper(IConfiguration config) => _config = config;

    /// <summary>Creates a signed JWT token containing user identity and role claims</summary>
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
            new Claim(JwtRegisteredClaimNames.Sub,   user.UserID.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username",   user.ADUsername),
            new Claim("fullName",   user.FullName),
            new Claim("role",       user.Role),
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

    /// <summary>Returns the expiry time for a token generated now</summary>
    public DateTime GetExpiry() =>
        DateTime.UtcNow.AddHours(int.Parse(_config["Jwt:ExpiryInHours"] ?? "8"));
}

// ============================================================
// PRS.Backend/Services/IEmailService.cs + EmailService.cs
// Sends email notifications via SMTP (Ethereal for testing)
// ============================================================
namespace PRS.Backend.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string toName, string subject, string htmlBody);
    Task SendEvaluationAssignedAsync(string evaluatorEmail, string evaluatorName, string proposalTitle);
    Task SendProposalStatusUpdateAsync(string studentEmail, string studentName, string proposalTitle, string status);
    Task SendSupervisorSignoffRequestAsync(string supervisorEmail, string supervisorName, string studentName, string proposalTitle);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    /// <summary>Sends a raw HTML email via SMTP using MailKit</summary>
    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        try
        {
            var host = _config["Email:SmtpHost"] ?? "smtp.ethereal.email";
            var port = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var useSsl = bool.Parse(_config["Email:UseSsl"] ?? "false");
            var username = _config["Email:Username"] ?? "";
            var password = _config["Email:Password"] ?? "";
            var fromAddr = _config["Email:FromAddress"] ?? "prs@university.ac.za";
            var fromName = _config["Email:FromName"] ?? "PRS System";

            var message = new MimeKit.MimeMessage();
            message.From.Add(new MimeKit.MailboxAddress(fromName, fromAddr));
            message.To.Add(new MimeKit.MailboxAddress(toName, toEmail));
            message.Subject = subject;

            var bodyBuilder = new MimeKit.BodyBuilder { HtmlBody = htmlBody };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new MailKit.Net.Smtp.SmtpClient();
            await client.ConnectAsync(host, port, useSsl ? MailKit.Security.SecureSocketOptions.SslOnConnect
                                                          : MailKit.Security.SecureSocketOptions.StartTlsWhenAvailable);
            if (!string.IsNullOrEmpty(username))
                await client.AuthenticateAsync(username, password);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
        }
    }

    public async Task SendEvaluationAssignedAsync(string email, string name, string proposalTitle)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {name},</p>
            <p>You have been assigned to evaluate the proposal: <strong>{proposalTitle}</strong>.</p>
            <p>Please log in to the PRS system to complete your evaluation.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, name, "PRS: Evaluation Assignment", html);
    }

    public async Task SendProposalStatusUpdateAsync(string email, string name, string proposalTitle, string status)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {name},</p>
            <p>Your proposal <strong>{proposalTitle}</strong> has been updated to status: <strong>{status}</strong>.</p>
            <p>Log in to PRS to view the full evaluation results and feedback.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, name, $"PRS: Proposal Status Update — {status}", html);
    }

    public async Task SendSupervisorSignoffRequestAsync(string email, string supervisorName, string studentName, string proposalTitle)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {supervisorName},</p>
            <p>Your student <strong>{studentName}</strong> has submitted a proposal requiring your sign-off:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p>Please log in to PRS to review and sign off.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, supervisorName, "PRS: Proposal Sign-Off Required", html);
    }
}

// ============================================================
// PRS.Backend/Services/FileUploadService.cs
// Handles proposal documents and ethics certificate uploads
// ============================================================
public interface IFileUploadService
{
    Task<string> UploadProposalAsync(IFormFile file, int proposalId);
    Task<string> UploadEthicsCertificateAsync(IFormFile file, int proposalId);
    Task<string> UploadEvaluationDocumentAsync(IFormFile file, int rubricId);
    bool DeleteFile(string filePath);
}

public class FileUploadService : IFileUploadService
{
    private readonly IConfiguration _config;
    private readonly ILogger<FileUploadService> _logger;
    private readonly IWebHostEnvironment _env;

    private long MaxBytes => (long)((double)(_config.GetValue<int>("FileUpload:MaxFileSizeMB", 20)) * 1024 * 1024);
    private string[] AllowedExt => _config.GetSection("FileUpload:AllowedExtensions").Get<string[]>()
                                   ?? new[] { ".pdf", ".docx" };

    public FileUploadService(IConfiguration config, ILogger<FileUploadService> logger, IWebHostEnvironment env)
    {
        _config = config;
        _logger = logger;
        _env = env;
    }

    public async Task<string> UploadProposalAsync(IFormFile file, int proposalId)
        => await SaveFileAsync(file, $"proposals/{proposalId}");

    public async Task<string> UploadEthicsCertificateAsync(IFormFile file, int proposalId)
        => await SaveFileAsync(file, $"ethics/{proposalId}");

    public async Task<string> UploadEvaluationDocumentAsync(IFormFile file, int rubricId)
        => await SaveFileAsync(file, $"evaluations/{rubricId}");

    public bool DeleteFile(string filePath)
    {
        try
        {
            var fullPath = Path.Combine(_env.ContentRootPath, filePath);
            if (File.Exists(fullPath)) { File.Delete(fullPath); return true; }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file: {Path}", filePath);
            return false;
        }
    }

    private async Task<string> SaveFileAsync(IFormFile file, string subFolder)
    {
        // Validate size
        if (file.Length > MaxBytes)
            throw new InvalidOperationException($"File exceeds maximum size of {MaxBytes / 1024 / 1024}MB");

        // Validate extension
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExt.Contains(ext))
            throw new InvalidOperationException($"File type '{ext}' is not allowed. Allowed: {string.Join(", ", AllowedExt)}");

        // Build storage path: Uploads/proposals/1/timestamp_filename.pdf
        var basePath = _config["FileUpload:BasePath"] ?? "Uploads";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var safeFileName = $"{timestamp}_{Path.GetFileNameWithoutExtension(file.FileName).Replace(" ", "_")}{ext}";
        var relativePath = Path.Combine(basePath, subFolder, safeFileName);
        var fullPath = Path.Combine(_env.ContentRootPath, relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        _logger.LogInformation("File saved: {Path}", relativePath);
        return relativePath;
    }
}

// ============================================================
// PRS.Backend/Services/RubricCalculatorService.cs
// Calculates weighted rubric scores per the specified formula
// ============================================================
using PRS.Backend.DTOs;
using PRS.Backend.Models;

public class RubricCalculatorService
{
    // Section weights (must sum to 100)
    private const decimal Section1Weight = 0.40m; // Research Quality
    private const decimal Section2Weight = 0.30m; // Originality & Contribution
    private const decimal Section3Weight = 0.20m; // Presentation & Structure
    private const decimal Section4Weight = 0.10m; // Ethics Consideration

    /// <summary>
    /// Calculates the total weighted score out of 100.
    ///
    /// Formula per section:
    ///   sectionRaw        = sum of criteria scores
    ///   sectionPossible   = numberOfCriteria × 5
    ///   sectionPercentage = sectionRaw / sectionPossible
    ///   weightedScore     = sectionPercentage × sectionWeight × 100
    /// Total = sum of all weightedScores
    /// </summary>
    public decimal CalculateTotalScore(EvaluationRubric r)
    {
        var s = CalculateSectionScores(r);
        return Math.Round(s.TotalScore, 2);
    }

    public RubricSectionScores CalculateSectionScores(EvaluationRubric r)
    {
        // Section 1: 4 criteria × 5 max = 20 possible
        decimal s1Raw = r.ClarityScore + r.LiteratureScore + r.MethodologyScore + r.FeasibilityScore;
        decimal s1Pct = s1Raw / 20m;
        decimal s1W = s1Pct * Section1Weight * 100m;

        // Section 2: 3 criteria × 5 max = 15 possible
        decimal s2Raw = r.NoveltyScore + r.ContributionScore + r.InnovationScore;
        decimal s2Pct = s2Raw / 15m;
        decimal s2W = s2Pct * Section2Weight * 100m;

        // Section 3: 3 criteria × 5 max = 15 possible
        decimal s3Raw = r.WritingScore + r.LogicScore + r.CitationScore;
        decimal s3Pct = s3Raw / 15m;
        decimal s3W = s3Pct * Section3Weight * 100m;

        // Section 4: 2 criteria × 5 max = 10 possible
        decimal s4Raw = r.EthicsScore + r.RiskScore;
        decimal s4Pct = s4Raw / 10m;
        decimal s4W = s4Pct * Section4Weight * 100m;

        decimal total = s1W + s2W + s3W + s4W;

        return new RubricSectionScores
        {
            Section1Raw = s1Raw,
            Section1Percentage = Math.Round(s1Pct * 100, 1),
            Section1Weighted = Math.Round(s1W, 2),

            Section2Raw = s2Raw,
            Section2Percentage = Math.Round(s2Pct * 100, 1),
            Section2Weighted = Math.Round(s2W, 2),

            Section3Raw = s3Raw,
            Section3Percentage = Math.Round(s3Pct * 100, 1),
            Section3Weighted = Math.Round(s3W, 2),

            Section4Raw = s4Raw,
            Section4Percentage = Math.Round(s4Pct * 100, 1),
            Section4Weighted = Math.Round(s4W, 2),

            TotalScore = Math.Round(total, 2)
        };
    }

    /// <summary>
    /// Returns a recommendation label based on the total score.
    /// 80-100: Accept | 70-79: Minor Revisions | 60-69: Major Revisions
    /// 50-59: Resubmit | <50: Reject
    /// </summary>
    public string GetRecommendation(decimal totalScore) => totalScore switch
    {
        >= 80 => "Accept",
        >= 70 => "Minor Revisions",
        >= 60 => "Major Revisions",
        >= 50 => "Resubmit",
        _ => "Reject"
    };
}