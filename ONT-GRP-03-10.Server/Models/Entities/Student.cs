/*
 * ============================================================
 * FILE: Models/Student.cs
 * STEP: 1D — Student Entity
 * ============================================================
 * The central entity of the PGRS system.
 * Represents a Masters or PhD postgraduate student.
 *
 * RELATIONSHIPS:
 *   Student (many) ──── (1)    Program
 *   Student (many) ──── (1)    Faculty
 *   Student (1)    ──── (many) SupervisorAssignment
 *   Student (1)    ──── (many) Proposal
 *   Student (1)    ──── (many) EthicsApplication
 *   Student (1)    ──── (many) StudentMilestone
 *   Student (1)    ──── (many) ProgressReport
 *   Student (0..1) ──── (1)    User   (via User.AssociatedStudentID)
 *
 * BUSINESS RULES (enforced in StudentService):
 *   1. StudentNumber must be unique across all students
 *   2. IDNumber must be unique across all students
 *   3. A student cannot be deleted if they have any linked records
 *      (proposals, ethics apps, milestones). We soft-delete instead.
 *   4. Only Administrators can change a student's Status
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PGRS.Api.Models;

public class Student
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int StudentID { get; set; }

    // ── Personal Information ──────────────────────────────────────────────────

    /// <summary>University student number e.g. "225569248" — must be unique</summary>
    [Required]
    [MaxLength(20)]
    public string StudentNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    public DateTime DateOfBirth { get; set; }

    /// <summary>SA ID number or passport number — must be unique</summary>
    [Required]
    [MaxLength(20)]
    public string IDNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public string? PhysicalAddress { get; set; }

    // ── Academic Information ──────────────────────────────────────────────────

    /// <summary>Foreign key to the Program the student is enrolled in</summary>
    [Required]
    public int ProgramID { get; set; }

    /// <summary>Foreign key to the student's Faculty</summary>
    [Required]
    public int FacultyID { get; set; }

    /// <summary>
    /// The date the student officially registered.
    /// Used as the base date for calculating milestone due dates.
    /// e.g. 6-Month milestone = RegistrationDate + 6 months
    /// </summary>
    public DateTime RegistrationDate { get; set; }

    public StudyMode StudyMode { get; set; } = StudyMode.FullTime;

    /// <summary>Working title of the research (can change before final submission)</summary>
    [MaxLength(500)]
    public string? ResearchTopic { get; set; }

    // ── Status ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Current status in the program.
    /// NEVER hard-delete a student — always set Status = Withdrawn.
    /// </summary>
    public StudentStatus Status { get; set; } = StudentStatus.Active;

    // ── Audit Fields ──────────────────────────────────────────────────────────

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }

    // ── Navigation Properties ─────────────────────────────────────────────────

    public Program Program { get; set; } = null!;
    public Faculty Faculty { get; set; } = null!;

    /// <summary>
    /// All supervisor assignments for this student (current and historical).
    /// Filter by IsActive = true to get the current supervisor.
    /// </summary>
    public ICollection<SupervisorAssignment> SupervisorAssignments { get; set; }
        = new List<SupervisorAssignment>();

    public ICollection<Proposal> Proposals { get; set; } = new List<Proposal>();
    public ICollection<EthicsApplication> EthicsApplications { get; set; }
        = new List<EthicsApplication>();
    public ICollection<StudentMilestone> StudentMilestones { get; set; }
        = new List<StudentMilestone>();
    public ICollection<ProgressReport> ProgressReports { get; set; }
        = new List<ProgressReport>();

    // ── Computed helpers (not mapped to DB) ───────────────────────────────────

    [NotMapped]
    public string FullName => $"{FirstName} {LastName}";
}