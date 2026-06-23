// ============================================================
// PRS.Backend/Models/EvaluationRubric.cs
// Weighted rubric evaluation submitted by an evaluator
// ============================================================
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PRS.Backend.Models;

public class EvaluationRubric
{
    public int RubricID { get; set; }
    public int ProposalID { get; set; }
    public int EvaluatorID { get; set; }

    // ---- Section 1: Research Quality (Weight: 40%) ----
    [Range(1, 5)] public int ClarityScore { get; set; }      // Clarity of research question
    [Range(1, 5)] public int LiteratureScore { get; set; }   // Literature review quality
    [Range(1, 5)] public int MethodologyScore { get; set; }  // Methodology appropriateness
    [Range(1, 5)] public int FeasibilityScore { get; set; }  // Feasibility of timeline

    // ---- Section 2: Originality & Contribution (Weight: 30%) ----
    [Range(1, 5)] public int NoveltyScore { get; set; }      // Novelty of approach
    [Range(1, 5)] public int ContributionScore { get; set; } // Potential contribution to field
    [Range(1, 5)] public int InnovationScore { get; set; }   // Innovation in methodology

    // ---- Section 3: Presentation & Structure (Weight: 20%) ----
    [Range(1, 5)] public int WritingScore { get; set; }      // Writing quality and clarity
    [Range(1, 5)] public int LogicScore { get; set; }        // Logical flow and organization
    [Range(1, 5)] public int CitationScore { get; set; }     // Citation quality and relevance

    // ---- Section 4: Ethics Consideration (Weight: 10%) ----
    [Range(1, 5)] public int EthicsScore { get; set; }       // Ethics addressed appropriately
    [Range(1, 5)] public int RiskScore { get; set; }         // Risk assessment included

    // ---- Calculated Fields ----
    [Column(TypeName = "decimal(5,2)")]
    public decimal TotalScore { get; set; }  // 0-100 weighted score

    // Accept | Minor Revisions | Major Revisions | Resubmit | Reject
    [Required, MaxLength(50)]
    public string Recommendation { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string FeedbackNotes { get; set; } = string.Empty; // Visible to student

    [MaxLength(2000)]
    public string? ConfidentialNotes { get; set; } // Only visible to supervisor

    [MaxLength(500)]
    public string? EvaluationDocumentPath { get; set; } // Optional attachment

    public DateTime SubmittedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Proposal Proposal { get; set; } = null!;
    public Supervisor Evaluator { get; set; } = null!;
}

// ============================================================
// PRS.Backend/Models/EthicsCertificate.cs
// Ethics clearance certificate uploaded externally
// ============================================================
public class EthicsCertificate
{
    public int EthicsID { get; set; }
    public int ProposalID { get; set; }

    [Required, MaxLength(500)]
    public string CertificatePath { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string CertificateNumber { get; set; } = string.Empty;

    public DateTime IssuedDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime UploadedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Proposal Proposal { get; set; } = null!;
}

// ============================================================
// PRS.Backend/Models/Notification.cs
// In-system notification for any user
// ============================================================
public class Notification
{
    public int NotificationID { get; set; }
    public int UserID { get; set; }

    [Required, MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty; // ProposalSubmitted, EvaluationAssigned, etc.

    public bool IsRead { get; set; } = false;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}

// ============================================================
// PRS.Backend/Models/AuditLog.cs
// Records system actions for compliance/audit trail
// ============================================================
public class AuditLog
{
    public int AuditID { get; set; }
    public int UserID { get; set; }

    [Required, MaxLength(200)]
    public string Action { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [MaxLength(50)]
    public string? IPAddress { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}

// ============================================================
// PRS.Backend/Models/ADImportLog.cs
// Records every Active Directory import/update attempt
// ============================================================
public class ADImportLog
{
    public int ImportID { get; set; }

    [Required, MaxLength(100)]
    public string ADUsername { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Action { get; set; } = string.Empty; // Imported | Updated | Failed

    [MaxLength(500)]
    public string? Details { get; set; }

    public DateTime ImportDate { get; set; } = DateTime.UtcNow;
}