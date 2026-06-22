/*
 * ============================================================
 * FILE: Models/SupervisorAssignment.cs
 * STEP: 1E — SupervisorAssignment Entity
 * ============================================================
 * Links a Student to a Supervisor (User with Role=Supervisor).
 *
 * WHY A SEPARATE TABLE?
 *   - A student can have BOTH a primary supervisor AND a co-supervisor
 *   - Supervisor assignments have a history (start/end dates)
 *   - This table is used by the COI (Conflict of Interest) check:
 *     When assigning evaluators, the system queries this table to
 *     prevent a supervisor from being assigned to evaluate their
 *     own student's proposal.
 *
 * BUSINESS RULES:
 *   1. A student must have exactly ONE active Primary supervisor
 *   2. A supervisor cannot be assigned to more than the configured
 *      max students (enforced in StudentService)
 *   3. When a new supervisor is assigned, the previous one's
 *      EndDate is set and IsActive becomes false
 *   4. *** KEY RULE ***: SupervisorUserID is used in the
 *      ProposalService.CheckConflictOfInterestAsync() method to
 *      block supervisors from evaluating their own students
 *
 * RELATIONSHIPS:
 *   SupervisorAssignment (many) ──── (1) Student
 *   SupervisorAssignment (many) ──── (1) User (the supervisor)
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PGRS.Api.Models;

public class SupervisorAssignment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int AssignmentID { get; set; }

    // ── Foreign Keys ──────────────────────────────────────────────────────────

    [Required]
    public int StudentID { get; set; }

    /// <summary>
    /// The UserID of the supervisor (a User with Role = Supervisor).
    /// This is the field used for the COI check.
    /// </summary>
    [Required]
    public int SupervisorUserID { get; set; }

    // ── Assignment Details ────────────────────────────────────────────────────

    /// <summary>Primary or CoSupervisor</summary>
    public SupervisionType AssignmentType { get; set; } = SupervisionType.Primary;

    public DateTime StartDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Set when a new supervisor is assigned or the student graduates/withdraws.
    /// Null means this is the current active assignment.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>True = current assignment. False = historical record.</summary>
    public bool IsActive { get; set; } = true;

    public string? Notes { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ─────────────────────────────────────────────────

    public Student Student { get; set; } = null!;

    /// <summary>
    /// The supervisor's User record.
    /// OnDelete = Restrict (configured in AppDbContext) — we cannot delete a User
    /// who has supervisor assignments because that would break the audit trail.
    /// </summary>
    public User Supervisor { get; set; } = null!;
}