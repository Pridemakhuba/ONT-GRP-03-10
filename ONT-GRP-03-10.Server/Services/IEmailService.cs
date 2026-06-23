namespace PRS.Backend.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string toName, string subject, string htmlBody);
    Task SendEvaluationAssignedAsync(string evaluatorEmail, string evaluatorName, string proposalTitle);
    Task SendProposalStatusUpdateAsync(string studentEmail, string studentName, string proposalTitle, string status);
    Task SendSupervisorSignoffRequestAsync(string supervisorEmail, string supervisorName, string studentName, string proposalTitle);
}