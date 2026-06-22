/*
 * ============================================================
 * FILE: Models/Proposal.cs
 * STEP: 1F — Proposal Entity
 * ============================================================
 * Represents a student's research proposal submission.
 *
 * WORKFLOW:
 *   Student creates Draft → Submits → Admin assigns Evaluators
 *   → Status = Assigned → Evaluators review → Status = UnderReview
 *   → Admin releases feedback → Status = Approved/Rejected/RevisionsRequired
 *
 * BUSINESS RULES:
 *   1. A student can only have ONE active proposal at a time
 *   2. A submitted proposal can NEVER be deleted — only archived
 *   3. If revisions are required, a new version (VersionNumber++) is created
 *   4. DocumentPath stores the relative path to the uploaded PDF/DOCX file
 *
 * RELATIONSHIPS:
 *   Proposal (many) ──── (1)    Student
 *   Proposal (1)    ──── (many) ProposalReview
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PGRS.Api.Models;

public class Proposal
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ProposalID { get; set; }

    // ── Foreign Keys ──────────────────────────────────────────────────────────

    [Required]
    public int StudentID { get; set; }

    // ── Proposal Content ──────────────────────────────────────────────────────

    /// <summary>Version 1 for first submission, 2 for resubmission after revisions, etc.</summary>
    public int VersionNumber { get; set; } = 1;

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>500–2000 character abstract</summary>
    public string? Abstract { get; set; }

    /// <summary>Comma-separated keywords for searching</summary>
    [MaxLength(500)]
    public string? Keywords { get; set; }

    // ── Uploaded Document ─────────────────────────────────────────────────────

    /// <summary>
    /// Relative path to uploaded file e.g. "Uploads/Proposals/2026/prop_1_v1.pdf"
    /// Full path = FileStorage:UploadPath in appsettings.json + DocumentPath
    /// </summary>
    public string? DocumentPath { get; set; }

    /// <summary>SHA-256 hash of the file — used to detect tampering</summary>
    public string? DocumentHash { get; set; }

    public long? FileSize { get; set; }

    [MaxLength(10)]
    public string? FileType { get; set; }  // "pdf" or "docx"

    // ── Workflow Status ───────────────────────────────────────────────────────

    public DateTime? SubmissionDate { get; set; }

    public ProposalStatus CurrentStatus { get; set; } = ProposalStatus.Draft;

    /// <summary>When the status last changed — used for reporting</summary>
    public DateTime StatusDate { get; set; } = DateTime.UtcNow;

    /// <summary>Student confirms supervisor has seen the proposal before submitting</summary>
    public bool SupervisorAcknowledged { get; set; } = false;

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ─────────────────────────────────────────────────

    public Student Student { get; set; } = null!;

    /// <summary>All reviews assigned for this proposal (can have 2-3 evaluators)</summary>
    public ICollection<ProposalReview> Reviews { get; set; } = new List<ProposalReview>();
}


/*
 * ============================================================
 * FILE: Models/ProposalReview.cs (in same file)
 * STEP: 1F — ProposalReview Entity
 * ============================================================
 * One record per evaluator per proposal.
 * e.g. 2 evaluators on 1 proposal = 2 ProposalReview records.
 *
 * SCORING (weighted rubric from prototype):
 *   Research Quality       40%  (ResearchQualityScore * 0.40)
 *   Originality            30%  (OriginalityScore     * 0.30)
 *   Presentation           20%  (PresentationScore    * 0.20)
 *   Ethics Consideration   10%  (EthicsScore          * 0.10)
 *   ─────────────────────────────────────────────────────────
 *   OverallScore = sum of above (computed in ProposalService)
 *
 * BUSINESS RULES:
 *   1. An evaluator CANNOT be assigned if they are the supervisor
 *      of this student (COI rule — checked in ProposalService)
 *   2. Max 3 evaluators per proposal
 *   3. Feedback is NOT visible to the student until Admin releases it
 *      (ReleasedToStudent flag)
 *   4. ConfidentialNotes are ONLY visible to admins — never to students
 *
 * RELATIONSHIPS:
 *   ProposalReview (many) ──── (1) Proposal
 *   ProposalReview (many) ──── (1) User (evaluator)
 * ============================================================
 */

public class ProposalReview
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ReviewID { get; set; }

    // ── Foreign Keys ──────────────────────────────────────────────────────────

    [Required]
    public int ProposalID { get; set; }

    /// <summary>
    /// The UserID of the evaluator (Role = Evaluator or Supervisor).
    /// IMPORTANT: Must NOT be the supervisor of this proposal's student (COI).
    /// </summary>
    [Required]
    public int EvaluatorUserID { get; set; }

    /// <summary>The admin who assigned this evaluator</summary>
    public int AssignedByUserID { get; set; }

    // ── Assignment Details ────────────────────────────────────────────────────

    public DateTime AssignmentDate { get; set; } = DateTime.UtcNow;

    /// <summary>Deadline for this evaluator to submit feedback (default 14 days)</summary>
    public DateTime DueDate { get; set; }

    // ── Review Scores (1–5 scale) ─────────────────────────────────────────────

    [Column(TypeName = "decimal(4,2)")]
    public decimal? ResearchQualityScore { get; set; }   // 40% weight

    [Column(TypeName = "decimal(4,2)")]
    public decimal? OriginalityScore { get; set; }        // 30% weight

    [Column(TypeName = "decimal(4,2)")]
    public decimal? PresentationScore { get; set; }       // 20% weight

    [Column(TypeName = "decimal(4,2)")]
    public decimal? EthicsScore { get; set; }             // 10% weight

    /// <summary>Computed weighted score: R*0.4 + O*0.3 + P*0.2 + E*0.1</summary>
    [Column(TypeName = "decimal(4,2)")]
    public decimal? OverallScore { get; set; }

    // ── Feedback ──────────────────────────────────────────────────────────────

    public ReviewRecommendation? Recommendation { get; set; }

    /// <summary>Detailed written feedback — released to student by admin</summary>
    public string? Comments { get; set; }

    /// <summary>
    /// Internal notes — visible to admins ONLY. Never shown to students.
    /// </summary>
    public string? ConfidentialNotes { get; set; }

    public DateTime? SubmissionDate { get; set; }

    /// <summary>Pending | InProgress | Submitted | Overdue</summary>
    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Admin must explicitly release feedback before student can see it.
    /// This allows admin to review all evaluations before releasing.
    /// </summary>
    public bool ReleasedToStudent { get; set; } = false;

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ─────────────────────────────────────────────────

    public Proposal Proposal { get; set; } = null!;
    public User Evaluator { get; set; } = null!;
}