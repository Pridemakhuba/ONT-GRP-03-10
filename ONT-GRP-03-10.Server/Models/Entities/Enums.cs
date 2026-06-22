/*
 * ============================================================
 * FILE: Models/Enums.cs
 * STEP: 1A — Enumerations
 * ============================================================
 * Contains all enum types used across the PGRS system.
 * Enums are stored as integers in SQL Server but compared
 * as readable strings throughout the C# code.
 *
 * WHY ENUMS?
 * Instead of storing "Active" / "Inactive" as raw strings
 * (which are error-prone), we use enums. EF Core maps them
 * to int columns in the database automatically.
 * ============================================================
 */

namespace PGRS.Api.Models;

/// <summary>
/// The four roles a user can have in the system.
/// Stored as int in DB: 0=Student, 1=Supervisor, 2=Evaluator, 3=Administrator
/// NOTE: Supervisor and Evaluator share the same person — a faculty member
/// can be a Supervisor for some students and an Evaluator for others,
/// BUT they CANNOT evaluate a proposal from their own supervised student (COI rule).
/// </summary>
public enum UserRole
{
    Student = 0,
    Supervisor = 1,
    Evaluator = 2,
    Administrator = 3
}

/// <summary>
/// Where the user's authentication comes from.
/// ActiveDirectory = uses university LDAP credentials (staff/students)
/// Local           = uses password stored in our DB (external evaluators)
/// External        = external examiner with a separate login flow
/// </summary>
public enum AuthSource
{
    Local = 0,
    ActiveDirectory = 1,
    External = 2
}

/// <summary>
/// Whether a student studies full time or part time.
/// Affects milestone deadline calculations.
/// </summary>
public enum StudyMode
{
    FullTime = 0,
    PartTime = 1
}

/// <summary>
/// A student's lifecycle status within the postgraduate program.
/// </summary>
public enum StudentStatus
{
    Active = 0,
    Graduated = 1,
    Withdrawn = 2,
    Suspended = 3
}

/// <summary>
/// The type of postgraduate program.
/// Used to determine which milestone templates apply:
///   Masters → 6-month progress report at month 6
///   PhD     → Confirmation of candidature at month 12
///   Both    → Milestones that apply to all programs
/// </summary>
public enum ProgramType
{
    Masters = 0,
    PhD = 1,
    Both = 2
}

/// <summary>
/// The workflow status of a research proposal.
/// Proposals move forward through this workflow:
/// Draft → Submitted → Assigned → UnderReview → [Approved | RevisionsRequired | Rejected]
/// </summary>
public enum ProposalStatus
{
    Draft = 0,
    Submitted = 1,
    Assigned = 2,
    UnderReview = 3,
    Approved = 4,
    RevisionsRequired = 5,
    Rejected = 6
}

/// <summary>
/// The status of an ethics clearance application.
/// </summary>
public enum EthicsStatus
{
    NotSubmitted = 0,
    Submitted = 1,
    UnderReview = 2,
    Approved = 3,
    ApprovedWithConditions = 4,
    Rejected = 5
}

/// <summary>
/// The status of a student's individual milestone record.
/// The system scheduler updates these automatically every night.
/// </summary>
public enum MilestoneStatus
{
    Pending = 0,      // Not yet due
    Approaching = 1,  // Due within 30 days — amber warning
    Overdue = 2,      // Past due date and not completed
    Completed = 3,    // Supervisor approved the submission
    Waived = 4        // Admin waived this milestone (e.g., exempted)
}

/// <summary>
/// The type of in-app notification.
/// Used to determine which icon and colour to show in the UI.
/// </summary>
public enum NotificationType
{
    DeadlineReminder = 0,
    StatusChange = 1,
    NewAssignment = 2,
    ProgressReport = 3,
    SystemAlert = 4
}

/// <summary>
/// What the evaluator recommends after reviewing a proposal.
/// </summary>
public enum ReviewRecommendation
{
    Approve = 0,
    ApproveWithChanges = 1,
    RevisionsRequired = 2,
    Reject = 3
}

/// <summary>
/// The type of supervisor relationship.
/// Each student must have exactly one Primary supervisor.
/// CoSupervisor is optional.
/// </summary>
public enum SupervisionType
{
    Primary = 0,
    CoSupervisor = 1
}