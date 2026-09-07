// ============================================================
// PRS.Backend/Models/Student.cs
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.Models;

public class Student
{
    public int StudentID { get; set; }
    public int UserID { get; set; }

    [Required, MaxLength(50)]
    public string StudentNumber { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Program { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? ResearchTopic { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<StudentSupervisor> StudentSupervisors { get; set; } = new List<StudentSupervisor>();
    public ICollection<Proposal> Proposals { get; set; } = new List<Proposal>();
}

// ============================================================
// PRS.Backend/Models/Supervisor.cs
// ============================================================
public class Supervisor
{
    public int SupervisorID { get; set; }
    public int UserID { get; set; }

    [MaxLength(500)]
    public string? Expertise { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<StudentSupervisor> StudentSupervisors { get; set; } = new List<StudentSupervisor>();
    public ICollection<EvaluationRubric> Evaluations { get; set; } = new List<EvaluationRubric>();
    public ICollection<ProposalEvaluator> AssignedEvaluations { get; set; } = new List<ProposalEvaluator>();
}

// ============================================================
// PRS.Backend/Models/StudentSupervisor.cs
// Junction table: student <-> supervisor (primary + co-supervisors)
// ============================================================
public class StudentSupervisor
{
    public int StudentSupervisorID { get; set; }
    public int StudentID { get; set; }
    public int SupervisorID { get; set; }
    public bool IsPrimary { get; set; } = false; // true = main supervisor
    public DateTime AssignedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Student Student { get; set; } = null!;
    public Supervisor Supervisor { get; set; } = null!;
}

// ============================================================
// PRS.Backend/Models/Proposal.cs
// Research proposal submitted by a student
// ============================================================
public class Proposal
{
    public int ProposalID { get; set; }
    public int StudentID { get; set; }

    [Required, MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(4000)]
    public string Abstract { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Keywords { get; set; }

    [Required, MaxLength(500)]
    public string DocumentPath { get; set; } = string.Empty; // Server-side file path

    public bool SupervisorSigned { get; set; } = false;
    public DateTime? SupervisorSignedDate { get; set; }

    // Draft | Submitted | UnderReview | Accepted | Rejected | Revised
    [Required, MaxLength(50)]
    public string Status { get; set; } = "Draft";

    public DateTime? SubmissionDate { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Student Student { get; set; } = null!;
    public ICollection<EvaluationRubric> Evaluations { get; set; } = new List<EvaluationRubric>();
    public ICollection<ProposalEvaluator> AssignedEvaluators { get; set; } = new List<ProposalEvaluator>();
    public ICollection<EthicsCertificate> EthicsCertificates { get; set; } = new List<EthicsCertificate>();
}

// ============================================================
// PRS.Backend/Models/ProposalEvaluator.cs
// Tracks evaluator assignments to proposals
// ============================================================
public class ProposalEvaluator
{
    public int ProposalEvaluatorID { get; set; }
    public int ProposalID { get; set; }
    public int EvaluatorID { get; set; }
    public DateTime AssignedDate { get; set; } = DateTime.UtcNow;
    public int? AssignedByID { get; set; } // Supervisor who made the assignment

    // Navigation
    public Proposal Proposal { get; set; } = null!;
    public Supervisor Evaluator { get; set; } = null!;
}