/*
 * ============================================================
 * FILE: Models/EthicsApplication.cs
 * STEP: 1G — Remaining Domain Models
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PGRS.Api.Models;

// ─────────────────────────────────────────────────────────────────────────────
// ETHICS APPLICATION
// Student submits ethics clearance before data collection can start.
// Admin reviews and Approves / Rejects / Approves with Conditions.
// ─────────────────────────────────────────────────────────────────────────────
public class EthicsApplication
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int EthicsID { get; set; }

    [Required]
    public int StudentID { get; set; }

    /// <summary>Optional link to the related proposal</summary>
    public int? ProposalID { get; set; }

    /// <summary>
    /// System-generated unique reference number.
    /// Format: H{YEAR}-ENG-ITE-{SEQ} e.g. "H2026-ENG-ITE-042"
    /// </summary>
    [MaxLength(50)]
    public string ReferenceNumber { get; set; } = string.Empty;

    public DateTime ApplicationDate { get; set; } = DateTime.UtcNow;

    public EthicsStatus Status { get; set; } = EthicsStatus.Submitted;

    // Review decision fields
    public int? ReviewerUserID { get; set; }
    public DateTime? ReviewDate { get; set; }

    /// <summary>"Approved" | "ApprovedWithConditions" | "Rejected"</summary>
    [MaxLength(30)]
    public string? Decision { get; set; }

    public string? Feedback { get; set; }

    /// <summary>Required when Decision = "ApprovedWithConditions"</summary>
    public string? Conditions { get; set; }

    /// <summary>Supervisor must endorse before submission is accepted</summary>
    public bool SupervisorEndorsed { get; set; } = false;

    /// <summary>Student must check declaration of compliance before submitting</summary>
    public bool DeclarationChecked { get; set; } = false;

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ─────────────────────────────────────────────────
    public Student Student { get; set; } = null!;
    public Proposal? Proposal { get; set; }
    public User? Reviewer { get; set; }
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}


// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE (TEMPLATE)
// Defines the milestone TYPES that exist for each program.
// When a student is registered, StudentMilestone records are auto-created
// from these templates with calculated due dates.
// ─────────────────────────────────────────────────────────────────────────────
public class Milestone
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int MilestoneID { get; set; }

    /// <summary>Unique short code e.g. "M-6MON", "M-PROP", "M-ETHICS"</summary>
    [Required]
    [MaxLength(30)]
    public string MilestoneCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string MilestoneName { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>
    /// Which program type this applies to.
    /// Masters, PhD, or Both.
    /// </summary>
    public ProgramType ProgramType { get; set; }

    /// <summary>
    /// How many months after RegistrationDate this milestone is due.
    /// e.g. 6 = 6-Month Progress Report for Masters
    ///      12 = PhD Confirmation of Candidature
    /// </summary>
    public int DefaultOffsetMonths { get; set; }

    /// <summary>If true, student cannot submit thesis without completing this</summary>
    public bool IsRequired { get; set; } = true;

    /// <summary>Display order in the student's progress tracker</summary>
    public int SequenceOrder { get; set; }

    /// <summary>Soft delete — deactivated milestones stay on existing students</summary>
    public bool IsActive { get; set; } = true;

    // ── Navigation Properties ─────────────────────────────────────────────────
    public ICollection<StudentMilestone> StudentMilestones { get; set; }
        = new List<StudentMilestone>();
}


// ─────────────────────────────────────────────────────────────────────────────
// STUDENT MILESTONE (PER-STUDENT INSTANCE)
// Created automatically when a student is registered.
// One record per student per milestone template.
// The nightly scheduler updates statuses (Pending → Approaching → Overdue).
// ─────────────────────────────────────────────────────────────────────────────
public class StudentMilestone
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int StudentMilestoneID { get; set; }

    [Required]
    public int StudentID { get; set; }

    [Required]
    public int MilestoneID { get; set; }

    /// <summary>
    /// Calculated as: Student.RegistrationDate + Milestone.DefaultOffsetMonths
    /// Set when the StudentMilestone record is created on registration.
    /// </summary>
    public DateTime DueDate { get; set; }

    /// <summary>Set when supervisor approves the milestone</summary>
    public DateTime? CompletionDate { get; set; }

    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;

    /// <summary>Path to evidence document submitted by student (e.g., progress report PDF)</summary>
    public string? EvidenceDocumentPath { get; set; }

    /// <summary>Supervisor approves or rejects the milestone submission</summary>
    public bool? SupervisorApproval { get; set; }

    public DateTime? ApprovalDate { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ─────────────────────────────────────────────────
    public Student Student { get; set; } = null!;
    public Milestone Milestone { get; set; } = null!;
}


// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS REPORT
// Supervisors submit formal progress reports for each student.
// Business Rule: A supervisor can ONLY submit for students they supervise.
// ─────────────────────────────────────────────────────────────────────────────
public class ProgressReport
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ReportID { get; set; }

    [Required]
    public int StudentID { get; set; }

    [Required]
    public int SupervisorUserID { get; set; }

    public DateTime ReportingPeriodStart { get; set; }
    public DateTime ReportingPeriodEnd { get; set; }

    /// <summary>"Excellent" | "Good" | "Fair" | "Poor"</summary>
    [MaxLength(20)]
    public string OverallRating { get; set; } = string.Empty;

    public string? WrittenReport { get; set; }
    public string? MilestonesAchieved { get; set; }
    public string? Challenges { get; set; }
    public string? Recommendations { get; set; }
    public string? NextSteps { get; set; }

    public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;

    /// <summary>"Submitted" | "Acknowledged" | "Archived"</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "Submitted";

    // ── Navigation Properties ─────────────────────────────────────────────────
    public Student Student { get; set; } = null!;
    public User Supervisor { get; set; } = null!;
}


// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION
// All in-app and email notifications sent by the system.
// Created automatically by NotificationService when key events happen.
// Retained for 90 days (cleaned up by a background job in production).
// ─────────────────────────────────────────────────────────────────────────────
public class Notification
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int NotificationID { get; set; }

    [Required]
    public int RecipientUserID { get; set; }

    public NotificationType NotificationType { get; set; }

    [Required]
    [MaxLength(300)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    /// <summary>e.g. "Proposal", "EthicsApplication", "StudentMilestone"</summary>
    [MaxLength(50)]
    public string? RelatedEntityType { get; set; }

    /// <summary>The ID of the related record (for navigation links in the UI)</summary>
    public int? RelatedEntityID { get; set; }

    public DateTime SentDate { get; set; } = DateTime.UtcNow;

    /// <summary>Null = unread. Set when user clicks the notification.</summary>
    public DateTime? ReadDate { get; set; }

    /// <summary>"Sent" | "Failed" | "Pending"</summary>
    [MaxLength(20)]
    public string DeliveryStatus { get; set; } = "Sent";

    public string? FailureReason { get; set; }

    /// <summary>How many times delivery was retried after failure (max 3)</summary>
    public int RetryCount { get; set; } = 0;

    // ── Navigation Properties ─────────────────────────────────────────────────
    public User Recipient { get; set; } = null!;
}


// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT
// Generic file record for any uploaded file in the system.
// Actual file stored on disk at FilePath.
// Used by EthicsApplications (supporting documents).
// ─────────────────────────────────────────────────────────────────────────────
public class Document
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int DocumentID { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    /// <summary>Relative path to file on disk e.g. "Uploads/Ethics/2026/file.pdf"</summary>
    [Required]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? FileType { get; set; }

    public long FileSize { get; set; }

    public int UploaderUserID { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;

    /// <summary>e.g. "EthicsApplication" — what this document belongs to</summary>
    [MaxLength(50)]
    public string? AssociatedEntityType { get; set; }

    public int? AssociatedEntityID { get; set; }

    /// <summary>e.g. "ConsentForm" | "Questionnaire" | "EthicsForm"</summary>
    [MaxLength(50)]
    public string? DocumentType { get; set; }

    // Optional direct FK to EthicsApplication
    public int? EthicsApplicationID { get; set; }
    public EthicsApplication? EthicsApplication { get; set; }
}


// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// Immutable record of every significant action taken in the system.
// Every CREATE, UPDATE, DELETE, LOGIN, SUBMIT is logged.
// POPIA/GDPR compliance — logs must be retained for 5 years (university policy).
// IMPORTANT: No user (including admins) can delete or modify audit logs.
// ─────────────────────────────────────────────────────────────────────────────
public class AuditLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int AuditID { get; set; }

    /// <summary>Who performed the action. Null for automated system actions.</summary>
    public int? UserID { get; set; }

    /// <summary>
    /// What happened: "CREATE" | "UPDATE" | "DELETE" | "LOGIN_SUCCESS" |
    /// "LOGIN_FAIL" | "SUBMIT" | "ASSIGN" | "APPROVE" | "REJECT" | "RELEASE"
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>e.g. "Student" | "Proposal" | "EthicsApplication"</summary>
    [MaxLength(100)]
    public string? AffectedTable { get; set; }

    public int? AffectedRecordID { get; set; }

    /// <summary>JSON snapshot of the record BEFORE the change</summary>
    public string? OldValue { get; set; }

    /// <summary>JSON snapshot of the record AFTER the change</summary>
    public string? NewValue { get; set; }

    /// <summary>"Success" | "Failure"</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "Success";

    // ── Navigation Properties ─────────────────────────────────────────────────
    public User? User { get; set; }
}


// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL EXAMINER
// Database of external academics used for final thesis examination.
// Separate from the User table — external examiners don't log in
// until they are assigned to a specific thesis.
// ─────────────────────────────────────────────────────────────────────────────
public class ExternalExaminer
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ExaminerID { get; set; }

    [MaxLength(10)]
    public string? Title { get; set; }  // "Dr" | "Prof" | "Mr" | "Ms"

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Institution { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Department { get; set; }

    /// <summary>Must be unique — used for login when assigned to a thesis</summary>
    [Required]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    /// <summary>Comma-separated list e.g. "AI,Machine Learning,Data Science"</summary>
    public string? ExpertiseAreas { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    public int MaxStudentsPerYear { get; set; } = 3;
    public int CurrentAssignments { get; set; } = 0;

    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public string FullName => $"{Title} {FirstName} {LastName}".Trim();
}