// ============================================================
// PRS.Backend/DTOs/AllDTOs.cs
// Data Transfer Objects for API request/response
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.DTOs;

// ---- Auth DTOs ----

/// <summary>Login request using AD credentials (domain\username format)</summary>
public class ADLoginDto
{
    [Required(ErrorMessage = "Username is required")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Returned after successful login</summary>
public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Department { get; set; }
    public int UserID { get; set; }
    public DateTime ExpiresAt { get; set; }
}

// ---- User DTOs ----

public class UserDto
{
    public int UserID { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string? Department { get; set; }
    public string Role { get; set; } = string.Empty;
    public string ADUsername { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class UpdateRoleDto
{
    [Required]
    public string Role { get; set; } = string.Empty;
}

// ---- Student DTOs ----

public class StudentDto
{
    public int StudentID { get; set; }
    public int UserID { get; set; }
    public string StudentNumber { get; set; } = string.Empty;
    public string Program { get; set; } = string.Empty;
    public string? ResearchTopic { get; set; }
    public UserDto User { get; set; } = null!;
    public List<SupervisorDto> Supervisors { get; set; } = new();
}

public class CreateStudentDto
{
    [Required] public int UserID { get; set; }
    [Required, MaxLength(50)] public string StudentNumber { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string Program { get; set; } = string.Empty;
    public string? ResearchTopic { get; set; }
}

// ---- Supervisor DTOs ----

public class SupervisorDto
{
    public int SupervisorID { get; set; }
    public int UserID { get; set; }
    public string? Expertise { get; set; }
    public UserDto User { get; set; } = null!;
    public bool IsPrimary { get; set; }
}

public class CreateSupervisorDto
{
    [Required] public int UserID { get; set; }
    public string? Expertise { get; set; }
}

// ---- Supervisor Assignment DTOs ----

public class AssignSupervisorDto
{
    [Required] public int StudentID { get; set; }
    [Required] public int SupervisorID { get; set; }
    public bool IsPrimary { get; set; } = false;
}

// ---- Proposal DTOs ----

public class ProposalDto
{
    public int ProposalID { get; set; }
    public int StudentID { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Abstract { get; set; } = string.Empty;
    public string? Keywords { get; set; }
    public string DocumentPath { get; set; } = string.Empty;
    public bool SupervisorSigned { get; set; }
    public DateTime? SupervisorSignedDate { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime? SubmissionDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public StudentDto? Student { get; set; }
    public List<EvaluationRubricDto> Evaluations { get; set; } = new();
    public List<EvaluatorAssignmentDto> AssignedEvaluators { get; set; } = new();
}

public class CreateProposalDto
{
    [Required, MaxLength(500)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(4000)] public string Abstract { get; set; } = string.Empty;
    [MaxLength(500)] public string? Keywords { get; set; }
}

public class UpdateProposalDto
{
    [MaxLength(500)] public string? Title { get; set; }
    [MaxLength(4000)] public string? Abstract { get; set; }
    [MaxLength(500)] public string? Keywords { get; set; }
}

public class RequestChangesDto
{
    [Required, MaxLength(2000)] public string Comments { get; set; } = string.Empty;
}

// ---- Evaluator Assignment DTOs ----

public class AssignEvaluatorsDto
{
    [Required] public int ProposalID { get; set; }
    [Required, MinLength(2, ErrorMessage = "At least 2 evaluators required")]
    public List<int> EvaluatorIDs { get; set; } = new();
}

public class EvaluatorAssignmentDto
{
    public int ProposalEvaluatorID { get; set; }
    public int EvaluatorID { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;
    public DateTime AssignedDate { get; set; }
    public bool HasSubmittedEvaluation { get; set; }
}

// ---- Evaluation Rubric DTOs ----

public class EvaluationRubricDto
{
    public int RubricID { get; set; }
    public int ProposalID { get; set; }
    public int EvaluatorID { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;

    // Section 1: Research Quality (40%)
    public int ClarityScore { get; set; }
    public string? ClarityComment { get; set; }
    public int LiteratureScore { get; set; }
    public string? LiteratureComment { get; set; }
    public int MethodologyScore { get; set; }
    public string? MethodologyComment { get; set; }
    public int FeasibilityScore { get; set; }
    public string? FeasibilityComment { get; set; }

    // Section 2: Originality & Contribution (30%)
    public int NoveltyScore { get; set; }
    public string? NoveltyComment { get; set; }
    public int ContributionScore { get; set; }
    public string? ContributionComment { get; set; }
    public int InnovationScore { get; set; }
    public string? InnovationComment { get; set; }

    // Section 3: Presentation & Structure (20%)
    public int WritingScore { get; set; }
    public string? WritingComment { get; set; }
    public int LogicScore { get; set; }
    public string? LogicComment { get; set; }
    public int CitationScore { get; set; }
    public string? CitationComment { get; set; }

    // Section 4: Ethics Consideration (10%)
    public int EthicsScore { get; set; }
    public string? EthicsComment { get; set; }
    public int RiskScore { get; set; }
    public string? RiskComment { get; set; }

    public decimal TotalScore { get; set; }
    public string Recommendation { get; set; } = string.Empty;
    public string FeedbackNotes { get; set; } = string.Empty;
    public string? ConfidentialNotes { get; set; }
    public string? EvaluationDocumentPath { get; set; }
    public DateTime SubmittedDate { get; set; }

    public RubricSectionScores? SectionScores { get; set; }
}

public class SubmitEvaluationDto
{
    [Required] public int ProposalID { get; set; }

    // Section 1: Research Quality
    [Required, Range(1, 5)] public int ClarityScore { get; set; }
    [MaxLength(1000)] public string? ClarityComment { get; set; }

    [Required, Range(1, 5)] public int LiteratureScore { get; set; }
    [MaxLength(1000)] public string? LiteratureComment { get; set; }

    [Required, Range(1, 5)] public int MethodologyScore { get; set; }
    [MaxLength(1000)] public string? MethodologyComment { get; set; }

    [Required, Range(1, 5)] public int FeasibilityScore { get; set; }
    [MaxLength(1000)] public string? FeasibilityComment { get; set; }

    // Section 2: Originality & Contribution
    [Required, Range(1, 5)] public int NoveltyScore { get; set; }
    [MaxLength(1000)] public string? NoveltyComment { get; set; }

    [Required, Range(1, 5)] public int ContributionScore { get; set; }
    [MaxLength(1000)] public string? ContributionComment { get; set; }

    [Required, Range(1, 5)] public int InnovationScore { get; set; }
    [MaxLength(1000)] public string? InnovationComment { get; set; }

    // Section 3: Presentation & Structure
    [Required, Range(1, 5)] public int WritingScore { get; set; }
    [MaxLength(1000)] public string? WritingComment { get; set; }

    [Required, Range(1, 5)] public int LogicScore { get; set; }
    [MaxLength(1000)] public string? LogicComment { get; set; }

    [Required, Range(1, 5)] public int CitationScore { get; set; }
    [MaxLength(1000)] public string? CitationComment { get; set; }

    // Section 4: Ethics Consideration
    [Required, Range(1, 5)] public int EthicsScore { get; set; }
    [MaxLength(1000)] public string? EthicsComment { get; set; }

    [Required, Range(1, 5)] public int RiskScore { get; set; }
    [MaxLength(1000)] public string? RiskComment { get; set; }

    [Required] public string Recommendation { get; set; } = string.Empty;
    [Required, MaxLength(2000)] public string FeedbackNotes { get; set; } = string.Empty;
    [MaxLength(2000)] public string? ConfidentialNotes { get; set; }
}

/// <summary>Section-level breakdown of rubric scores</summary>
public class RubricSectionScores
{
    public decimal Section1Raw { get; set; }
    public decimal Section1Percentage { get; set; }
    public decimal Section1Weighted { get; set; }

    public decimal Section2Raw { get; set; }
    public decimal Section2Percentage { get; set; }
    public decimal Section2Weighted { get; set; }

    public decimal Section3Raw { get; set; }
    public decimal Section3Percentage { get; set; }
    public decimal Section3Weighted { get; set; }

    public decimal Section4Raw { get; set; }
    public decimal Section4Percentage { get; set; }
    public decimal Section4Weighted { get; set; }

    public decimal TotalScore { get; set; }
}

/// <summary>Aggregated results from all evaluators</summary>
public class ProposalRubricResultsDto
{
    public int ProposalID { get; set; }
    public string ProposalTitle { get; set; } = string.Empty;
    public string OverallDecision { get; set; } = string.Empty;
    public decimal AverageScore { get; set; }
    public int EvaluatorCount { get; set; }
    public List<EvaluationRubricDto> Evaluations { get; set; } = new();
}

// ---- Ethics Certificate DTOs ----

public class EthicsCertificateDto
{
    public int EthicsID { get; set; }
    public int ProposalID { get; set; }
    public string CertificatePath { get; set; } = string.Empty;
    public string CertificateNumber { get; set; } = string.Empty;
    public DateTime IssuedDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime UploadedDate { get; set; }
}

public class UploadEthicsDto
{
    [Required, MaxLength(100)] public string CertificateNumber { get; set; } = string.Empty;
    [Required] public DateTime IssuedDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
}

// ---- Notification DTOs ----

public class NotificationDto
{
    public int NotificationID { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedDate { get; set; }
}

// ---- AD Import DTOs ----

public class ADUserDto
{
    public string ADUsername { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Title { get; set; }
    public bool AlreadyInSystem { get; set; }
}

public class ImportUsersDto
{
    [Required] public List<string> ADUsernames { get; set; } = new();
    [Required] public string Role { get; set; } = "Student";
}

// ---- Report DTOs ----
public class ProposalReportDto
{
    public int ProposalID { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Department { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime? SubmissionDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool SupervisorSigned { get; set; }
}

public class EvaluationReportDto
{
    public int RubricID { get; set; }
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string ProposalTitle { get; set; } = "";
    public string EvaluatorName { get; set; } = "";
    public decimal TotalScore { get; set; }
    public string Recommendation { get; set; } = "";
    public DateTime? SubmittedDate { get; set; }
    public string Department { get; set; } = "";
}

public class SupervisorWorkloadDto
{
    public int SupervisorID { get; set; }
    public string SupervisorName { get; set; } = "";
    public string Expertise { get; set; } = "";
    public int TotalStudents { get; set; }
    public int PendingSignoffs { get; set; }
    public int CompletedProposals { get; set; }
}

public class DepartmentSummaryDto
{
    public string Department { get; set; } = "";
    public int StudentCount { get; set; }
    public int ProposalCount { get; set; }
    public int AcceptedCount { get; set; }
}

public class StudentProgressDto
{
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Department { get; set; } = "";
    public string Program { get; set; } = "";
    public string PrimarySupervisor { get; set; } = "";
    public int TotalProposals { get; set; }
    public int DraftProposals { get; set; }
    public int SubmittedProposals { get; set; }
    public int UnderReviewProposals { get; set; }
    public int AcceptedProposals { get; set; }
    public int RejectedProposals { get; set; }
    public DateTime? LatestSubmission { get; set; }
    public string DeadlineStatus { get; set; } = "";
    public int EthicsCertificates { get; set; }
}

public class DepartmentPerformanceDto
{
    public string Department { get; set; } = "";
    public int TotalStudents { get; set; }
    public int TotalProposals { get; set; }
    public int AcceptedProposals { get; set; }
    public int RejectedProposals { get; set; }
    public int UnderReviewProposals { get; set; }
    public double AcceptanceRate { get; set; }
    public double AverageScore { get; set; }
    public int TotalEvaluations { get; set; }
    public int StudentsWithSupervisor { get; set; }
}

public class DeadlineComplianceDto
{
    public string DeadlineName { get; set; } = "";
    public string DeadlineType { get; set; } = "";
    public DateTime DueDate { get; set; }
    public int TotalExpected { get; set; }
    public int SubmittedOnTime { get; set; }
    public int SubmittedLate { get; set; }
    public int NotSubmitted { get; set; }
    public double ComplianceRate { get; set; }
    public List<DeadlineStudentDto> Students { get; set; } = new();
}

public class DeadlineStudentDto
{
    public string StudentNumber { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime? SubmissionDate { get; set; }
}

// ---- Progress Report DTOs ----

public class ProgressReportDto
{
    public int ProgressReportID { get; set; }
    public int StudentID { get; set; }
    public int SupervisorID { get; set; }
    public string? SupervisorName { get; set; }
    public string? StudentName { get; set; }
    public string? StudentNumber { get; set; }
    public int AcademicYear { get; set; }
    public string? ProgressStatus { get; set; }
    public DateTime? AnticipatedCompletionDate { get; set; }
    public string? StandingStatus { get; set; }
    public string? Comments { get; set; }
    public DateTime SubmittedDate { get; set; }
}

public class CreateProgressReportDto
{
    [Required] public int StudentID { get; set; }
    [Required] public int AcademicYear { get; set; }
    [Required, MaxLength(50)] public string ProgressStatus { get; set; } = string.Empty;
    public DateTime? AnticipatedCompletionDate { get; set; }
    [MaxLength(100)] public string? StandingStatus { get; set; }
    [MaxLength(2000)] public string? Comments { get; set; }
}