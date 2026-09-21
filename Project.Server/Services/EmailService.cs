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

    // ---- Existing methods ----

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

    // ---- NEW METHODS ----

    public async Task SendProposalSubmittedAsync(string email, string supervisorName, string studentName, string proposalTitle)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {supervisorName},</p>
            <p>Your student <strong>{studentName}</strong> has submitted a new proposal:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p>Please log in to PRS to review and sign off.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, supervisorName, "PRS: New Proposal Submitted", html);
    }

    public async Task SendProposalResubmittedAsync(string email, string supervisorName, string studentName, string proposalTitle)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {supervisorName},</p>
            <p>Your student <strong>{studentName}</strong> has resubmitted their revised proposal:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p>Please log in to PRS to review the changes.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, supervisorName, "PRS: Revised Proposal Resubmitted", html);
    }

    public async Task SendRevisionRequiredAsync(string email, string studentName, string proposalTitle, string comments)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {studentName},</p>
            <p>Your supervisor has requested changes to your proposal:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p><strong>Comments from your supervisor:</strong></p>
            <p style='background:#fff8e1;padding:12px;border-left:4px solid #f59e0b;'>{comments}</p>
            <p>Please log in to PRS to revise and resubmit your proposal.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, studentName, "PRS: Revision Required", html);
    }

    public async Task SendSupervisorAssignedAsync(string email, string recipientName, string proposalTitle, string role)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {recipientName},</p>
            <p>{role} has been assigned for the proposal:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p>Please log in to PRS for more details.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, recipientName, "PRS: Supervisor Assigned", html);
    }

    public async Task SendFinalResultAsync(string email, string recipientName, string proposalTitle, string status, decimal avgScore, string message)
    {
        var color = status == "APPROVED_GRADUATION" ? "#10b981"
                  : status == "REJECTED" ? "#dc2626"
                  : "#f59e0b";
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {recipientName},</p>
            <p>Final result for proposal:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p style='color:{color};font-size:18px;font-weight:700;'>Status: {status}</p>
            <p>Average Score: <strong>{avgScore}%</strong></p>
            <p>{message}</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, recipientName, $"PRS: Final Result — {status}", html);
    }

    public async Task SendAllEvaluationsCompleteAsync(string email, string adminName, int proposalID, string proposalTitle)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {adminName},</p>
            <p>Both evaluations have been submitted for proposal:</p>
            <p><strong>{proposalTitle}</strong> (ID: {proposalID})</p>
            <p>Please log in to PRS to finalise the outcome.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, adminName, "PRS: Ready to Finalise", html);
    }

    public async Task SendEvaluatorAssignedAsync(string email, string evaluatorName, string proposalTitle)
    {
        var html = $@"
            <h2>SOIT Postgraduate Record System</h2>
            <p>Dear {evaluatorName},</p>
            <p>You have been assigned to evaluate the following proposal:</p>
            <p><strong>{proposalTitle}</strong></p>
            <p>Please log in to PRS to complete your evaluation using the rubric.</p>
            <br/><p>Regards,<br/>DoIT Development Team</p>";
        await SendAsync(email, evaluatorName, "PRS: Evaluation Assignment", html);
    }
}