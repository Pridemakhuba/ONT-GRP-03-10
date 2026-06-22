/*
 * ============================================================
 * FILE: DTOs/AllDTOs.cs
 * STEP: 2 — Data Transfer Objects
 * ============================================================
 * DTOs are the shapes of data that go IN and OUT of the API.
 *
 * WHY DTOs INSTEAD OF MODELS DIRECTLY?
 *   1. SECURITY: Models contain sensitive fields (PasswordHash,
 *      ConfidentialNotes) that must never be sent to clients.
 *   2. SHAPE: The API might need to combine data from multiple
 *      models into one response object.
 *   3. VALIDATION: DTOs carry [Required] attributes for input.
 *   4. VERSIONING: You can change the DB model without breaking
 *      the API contract.
 *
 * NAMING CONVENTION:
 *   XxxRequestDto  = body sent FROM the client TO the API (input)
 *   XxxResponseDto = body sent FROM the API TO the client (output)
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using PGRS.Api.Models;

namespace PGRS.Api.DTOs;

// ═══════════════════════════════════════════════════════════════════════════
// AUTH DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Body sent to POST /api/auth/login
/// </summary>
public class LoginRequestDto
{
    [Required(ErrorMessage = "Username is required.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// true  = external evaluator (uses local password)
    /// false = university staff/student (tries Active Directory first)
    /// </summary>
    public bool IsExternal { get; set; } = false;
}

/// <summary>
/// Returned by POST /api/auth/login on success.
/// The frontend stores the Token in localStorage and sends it
/// as "Authorization: Bearer {Token}" on every subsequent request.
/// </summary>
public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserInfoDto User { get; set; } = null!;
}

/// <summary>Safe user info — NO password hash, NO sensitive fields</summary>
public class UserInfoDto
{
    public int UserID { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;        // "Student" | "Supervisor" | etc.
    public string AuthSource { get; set; } = string.Empty;  // "ActiveDirectory" | "Local"
    public bool RequiresPasswordChange { get; set; }
    public int? AssociatedStudentID { get; set; }
}


// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Input: body for POST /api/students (register new student)
/// </summary>
public class CreateStudentRequestDto
{
    [Required][MaxLength(20)] public string StudentNumber { get; set; } = string.Empty;
    [Required][MaxLength(100)] public string FirstName { get; set; } = string.Empty;
    [Required][MaxLength(100)] public string LastName { get; set; } = string.Empty;
    [Required] public DateTime DateOfBirth { get; set; }
    [Required][MaxLength(20)] public string IDNumber { get; set; } = string.Empty;
    [Required][EmailAddress] public string Email { get; set; } = string.Empty;
    [MaxLength(20)] public string? PhoneNumber { get; set; }
    public string? PhysicalAddress { get; set; }
    [Required] public int ProgramID { get; set; }
    [Required] public int FacultyID { get; set; }
    [Required] public DateTime RegistrationDate { get; set; }
    public StudyMode StudyMode { get; set; } = StudyMode.FullTime;
    public string? ResearchTopic { get; set; }

    /// <summary>
    /// Optional: assign a supervisor at the same time as registration.
    /// If not provided, admin must assign separately.
    /// </summary>
    public int? PrimarySupervisorUserID { get; set; }
}

/// <summary>
/// Output: what the API returns when fetching a student.
/// Combines Student + current supervisor + proposal + milestone summary.
/// </summary>
public class StudentResponseDto
{
    public int StudentID { get; set; }
    public string StudentNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string ProgramCode { get; set; } = string.Empty;
    public string ProgramName { get; set; } = string.Empty;
    public string ProgramType { get; set; } = string.Empty;
    public string FacultyName { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public string StudyMode { get; set; } = string.Empty;
    public string? ResearchTopic { get; set; }
    public string Status { get; set; } = string.Empty;

    /// <summary>Current primary supervisor's name (or null if unassigned)</summary>
    public string? SupervisorName { get; set; }
    public int? SupervisorUserID { get; set; }

    /// <summary>Latest proposal status</summary>
    public string? LatestProposalStatus { get; set; }

    /// <summary>Next milestone approaching or overdue</summary>
    public string? NextMilestoneName { get; set; }
    public DateTime? NextMilestoneDue { get; set; }
    public string? NextMilestoneStatus { get; set; }

    /// <summary>Milestone completion percentage for progress bar</summary>
    public int MilestoneCompletionPercent { get; set; }
}


// ═══════════════════════════════════════════════════════════════════════════
// SUPERVISOR ASSIGNMENT DTOs
// ═══════════════════════════════════════════════════════════════════════════

public class AssignSupervisorRequestDto
{
    [Required] public int SupervisorUserID { get; set; }
    public SupervisionType AssignmentType { get; set; } = SupervisionType.Primary;
    public string? Notes { get; set; }
}


// ═══════════════════════════════════════════════════════════════════════════
// PROPOSAL DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>Input: student submits a proposal</summary>
public class SubmitProposalRequestDto
{
    [Required][MaxLength(500)] public string Title { get; set; } = string.Empty;

    [Required]
    [MinLength(100, ErrorMessage = "Abstract must be at least 100 characters.")]
    [MaxLength(2000, ErrorMessage = "Abstract cannot exceed 2000 characters.")]
    public string Abstract { get; set; } = string.Empty;

    public string? Keywords { get; set; }

    /// <summary>
    /// True = student confirms their supervisor has reviewed the proposal.
    /// Required before submission is accepted.
    /// </summary>
    [Range(typeof(bool), "true", "true", ErrorMessage = "Supervisor acknowledgement is required.")]
    public bool SupervisorAcknowledged { get; set; }

    // File upload is handled separately via IFormFile in the controller
}

/// <summary>Output: proposal details returned to client</summary>
public class ProposalResponseDto
{
    public int ProposalID { get; set; }
    public int StudentID { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;
    public string ProgramCode { get; set; } = string.Empty;
    public int VersionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Abstract { get; set; }
    public string? Keywords { get; set; }
    public string? DocumentPath { get; set; }
    public DateTime? SubmissionDate { get; set; }
    public string CurrentStatus { get; set; } = string.Empty;
    public DateTime StatusDate { get; set; }
    public List<ReviewSummaryDto> Reviews { get; set; } = new();
}

/// <summary>Slim review info shown in the proposal response</summary>
public class ReviewSummaryDto
{
    public int ReviewID { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Recommendation { get; set; }
    public decimal? OverallScore { get; set; }

    /// <summary>
    /// Only populated when ReleasedToStudent = true.
    /// Prevents students from seeing unpublished feedback.
    /// </summary>
    public string? Comments { get; set; }
}

/// <summary>Input: Admin assigns evaluators to a proposal</summary>
public class AssignEvaluatorsRequestDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one evaluator must be selected.")]
    public List<int> EvaluatorUserIds { get; set; } = new();

    [Required]
    public DateTime DueDate { get; set; }

    public string? Instructions { get; set; }
}

/// <summary>Input: Evaluator submits their review</summary>
public class SubmitReviewRequestDto
{
    [Required]
    public ReviewRecommendation Recommendation { get; set; }

    [Required]
    [Range(1, 5, ErrorMessage = "Score must be between 1 and 5.")]
    public decimal ResearchQualityScore { get; set; }

    [Required]
    [Range(1, 5)]
    public decimal OriginalityScore { get; set; }

    [Required]
    [Range(1, 5)]
    public decimal PresentationScore { get; set; }

    [Required]
    [Range(1, 5)]
    public decimal EthicsScore { get; set; }

    [Required(ErrorMessage = "Written feedback comments are required.")]
    public string Comments { get; set; } = string.Empty;

    /// <summary>Only visible to admins — never released to students</summary>
    public string? ConfidentialNotes { get; set; }
}

/// <summary>
/// Output: COI check result.
/// Returned by GET /api/proposals/{id}/check-coi/{evaluatorId}
/// </summary>
public class ConflictOfInterestDto
{
    public bool HasConflict { get; set; }
    public string Message { get; set; } = string.Empty;

    /// <summary>Name of the evaluator checked</summary>
    public string EvaluatorName { get; set; } = string.Empty;
}


// ═══════════════════════════════════════════════════════════════════════════
// ETHICS DTOs
// ═══════════════════════════════════════════════════════════════════════════

public class SubmitEthicsRequestDto
{
    [Required] public int StudentID { get; set; }
    public int? ProposalID { get; set; }

    [Required(ErrorMessage = "Supervisor must endorse the ethics application.")]
    public bool SupervisorEndorsed { get; set; }

    [Range(typeof(bool), "true", "true", ErrorMessage = "Declaration of compliance is required.")]
    public bool DeclarationChecked { get; set; }
}

public class ReviewEthicsRequestDto
{
    [Required] public string Decision { get; set; } = string.Empty; // Approved | ApprovedWithConditions | Rejected
    public string? Feedback { get; set; }
    public string? Conditions { get; set; }
}


// ═══════════════════════════════════════════════════════════════════════════
// MILESTONE DTOs
// ═══════════════════════════════════════════════════════════════════════════

public class UpdateMilestoneRequestDto
{
    [Required] public MilestoneStatus Status { get; set; }
    public string? Notes { get; set; }
    public string? EvidenceDocumentPath { get; set; }
}

public class MilestoneResponseDto
{
    public int StudentMilestoneID { get; set; }
    public string MilestoneCode { get; set; } = string.Empty;
    public string MilestoneName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SequenceOrder { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? CompletionDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int DaysUntilDue { get; set; }
}


// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS REPORT DTOs
// ═══════════════════════════════════════════════════════════════════════════

public class SubmitProgressReportRequestDto
{
    [Required] public int StudentID { get; set; }
    [Required] public DateTime ReportingPeriodStart { get; set; }
    [Required] public DateTime ReportingPeriodEnd { get; set; }
    [Required] public string OverallRating { get; set; } = string.Empty;
    [Required] public string WrittenReport { get; set; } = string.Empty;
    public string? MilestonesAchieved { get; set; }
    public string? Challenges { get; set; }
    public string? Recommendations { get; set; }
    public string? NextSteps { get; set; }
}


// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT DTOs
// ═══════════════════════════════════════════════════════════════════════════

public class CreateUserRequestDto
{
    [Required][MaxLength(100)] public string Username { get; set; } = string.Empty;
    [Required][EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Role { get; set; } = string.Empty;
    public int? AssociatedStudentID { get; set; }

    /// <summary>
    /// Optional temporary password.
    /// System uses "Change@123" if not provided.
    /// User is forced to change on first login.
    /// </summary>
    public string? TemporaryPassword { get; set; }

    public AuthSource AuthSource { get; set; } = AuthSource.Local;
}


// ═══════════════════════════════════════════════════════════════════════════
// REPORT / DASHBOARD DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Returned by GET /api/reports/dashboard
/// Powers the admin dashboard stat cards and recent activity feed.
/// </summary>
public class DashboardStatsDto
{
    public int TotalActiveStudents { get; set; }
    public int TotalSupervisors { get; set; }
    public int TotalProposals { get; set; }
    public int OverdueMilestones { get; set; }
    public int PendingProposalAssignments { get; set; }
    public int PendingEthicsReviews { get; set; }
    public int StudentsWithoutSupervisor { get; set; }
    public List<ActivityItemDto> RecentActivity { get; set; } = new();
}

public class ActivityItemDto
{
    public string Action { get; set; } = string.Empty;
    public string AffectedTable { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Username { get; set; } = string.Empty;
}

/// <summary>
/// Returned by GET /api/reports/student-progress
/// </summary>
public class StudentProgressReportItemDto
{
    public int StudentID { get; set; }
    public string StudentNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Program { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public string SupervisorName { get; set; } = string.Empty;
    public int CompletedMilestones { get; set; }
    public int OverdueMilestones { get; set; }
    public int TotalMilestones { get; set; }
    public string LatestProposalStatus { get; set; } = string.Empty;
    public string EthicsStatus { get; set; } = string.Empty;
}