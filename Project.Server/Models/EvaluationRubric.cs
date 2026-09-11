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
    [Range(1, 5)] public int ClarityScore { get; set; }
    [MaxLength(1000)] public string? ClarityComment { get; set; }

    [Range(1, 5)] public int LiteratureScore { get; set; }
    [MaxLength(1000)] public string? LiteratureComment { get; set; }

    [Range(1, 5)] public int MethodologyScore { get; set; }
    [MaxLength(1000)] public string? MethodologyComment { get; set; }

    [Range(1, 5)] public int FeasibilityScore { get; set; }
    [MaxLength(1000)] public string? FeasibilityComment { get; set; }

    // ---- Section 2: Originality & Contribution (Weight: 30%) ----
    [Range(1, 5)] public int NoveltyScore { get; set; }
    [MaxLength(1000)] public string? NoveltyComment { get; set; }

    [Range(1, 5)] public int ContributionScore { get; set; }
    [MaxLength(1000)] public string? ContributionComment { get; set; }

    [Range(1, 5)] public int InnovationScore { get; set; }
    [MaxLength(1000)] public string? InnovationComment { get; set; }

    // ---- Section 3: Presentation & Structure (Weight: 20%) ----
    [Range(1, 5)] public int WritingScore { get; set; }
    [MaxLength(1000)] public string? WritingComment { get; set; }

    [Range(1, 5)] public int LogicScore { get; set; }
    [MaxLength(1000)] public string? LogicComment { get; set; }

    [Range(1, 5)] public int CitationScore { get; set; }
    [MaxLength(1000)] public string? CitationComment { get; set; }

    // ---- Section 4: Ethics Consideration (Weight: 10%) ----
    [Range(1, 5)] public int EthicsScore { get; set; }
    [MaxLength(1000)] public string? EthicsComment { get; set; }

    [Range(1, 5)] public int RiskScore { get; set; }
    [MaxLength(1000)] public string? RiskComment { get; set; }

    // ---- Calculated Fields ----
    [Column(TypeName = "decimal(5,2)")]
    public decimal TotalScore { get; set; }

    [Required, MaxLength(50)]
    public string Recommendation { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string FeedbackNotes { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? ConfidentialNotes { get; set; }

    [MaxLength(500)]
    public string? EvaluationDocumentPath { get; set; }

    public DateTime SubmittedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Proposal Proposal { get; set; } = null!;
    public Supervisor Evaluator { get; set; } = null!;
}