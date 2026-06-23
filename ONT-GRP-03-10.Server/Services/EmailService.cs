using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace PRS.Backend.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

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

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromAddr));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, useSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable);
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