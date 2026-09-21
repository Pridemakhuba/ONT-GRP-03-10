namespace PRS.Backend.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string toName, string subject, string htmlBody);

    // ---- Proposal lifecycle ----
    Task SendProposalSubmittedAsync(string supervisorEmail, string supervisorName, string studentName, string proposalTitle);
    Task SendProposalResubmittedAsync(string supervisorEmail, string supervisorName, string studentName, string proposalTitle);
    Task SendSupervisorSignoffRequestAsync(string supervisorEmail, string supervisorName, string studentName, string proposalTitle);
    Task SendRevisionRequiredAsync(string studentEmail, string studentName, string proposalTitle, string comments);
    Task SendProposalStatusUpdateAsync(string studentEmail, string studentName, string proposalTitle, string status);

    // ---- Assignments ----
    Task SendSupervisorAssignedAsync(string email, string recipientName, string proposalTitle, string role);
    Task SendEvaluationAssignedAsync(string evaluatorEmail, string evaluatorName, string proposalTitle);
    Task SendEvaluatorAssignedAsync(string evaluatorEmail, string evaluatorName, string proposalTitle);

    // ---- Finalisation ----
    Task SendAllEvaluationsCompleteAsync(string adminEmail, string adminName, int proposalID, string proposalTitle);
    Task SendFinalResultAsync(string email, string recipientName, string proposalTitle, string status, decimal avgScore, string message);
}