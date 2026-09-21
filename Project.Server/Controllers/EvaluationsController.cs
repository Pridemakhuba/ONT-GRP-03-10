using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.DTOs;
using PRS.Backend.Models;
using PRS.Backend.Services;
using System.Security.Claims;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/evaluations")]
[Authorize]
public class EvaluationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly RubricCalculatorService _rubric;
    private readonly IFileUploadService _files;
    private readonly IEmailService _email;
    private readonly ILogger<EvaluationsController> _logger;

    public EvaluationsController(
        ApplicationDbContext db,
        RubricCalculatorService rubric,
        IFileUploadService files,
        IEmailService email,
        ILogger<EvaluationsController> logger)
    {
        _db = db;
        _rubric = rubric;
        _files = files;
        _email = email;
        _logger = logger;
    }

    /// <summary>GET /api/evaluations/evaluator/{evaluatorId}</summary>
    [HttpGet("evaluator/{evaluatorId}")]
    public async Task<IActionResult> GetByEvaluator(int evaluatorId)
    {
        var rubrics = await _db.EvaluationRubrics
            .Where(r => r.EvaluatorID == evaluatorId)
            .Include(r => r.Proposal)
            .OrderByDescending(r => r.SubmittedDate)
            .Select(r => new
            {
                rubricID = r.RubricID,
                proposalID = r.ProposalID,
                title = r.Proposal != null ? r.Proposal.Title : "",
                totalScore = r.TotalScore,
                recommendation = r.Recommendation ?? "",
                submittedDate = r.SubmittedDate
            })
            .ToListAsync();

        return Ok(rubrics);
    }

    /// <summary>GET /api/evaluations/proposal/{proposalId} — full evaluation details including per-criterion comments</summary>
    [HttpGet("proposal/{proposalId}")]
    public async Task<IActionResult> GetByProposal(int proposalId)
    {
        var rubrics = await _db.EvaluationRubrics
            .Where(r => r.ProposalID == proposalId)
            .Select(r => new
            {
                rubricID = r.RubricID,
                proposalID = r.ProposalID,
                evaluatorID = r.EvaluatorID,
                totalScore = r.TotalScore,
                recommendation = r.Recommendation ?? "",
                feedbackNotes = r.FeedbackNotes ?? "",
                submittedDate = r.SubmittedDate,

                // Section 1 - scores + comments
                clarityScore = r.ClarityScore,
                clarityComment = r.ClarityComment,
                literatureScore = r.LiteratureScore,
                literatureComment = r.LiteratureComment,
                methodologyScore = r.MethodologyScore,
                methodologyComment = r.MethodologyComment,
                feasibilityScore = r.FeasibilityScore,
                feasibilityComment = r.FeasibilityComment,

                // Section 2
                noveltyScore = r.NoveltyScore,
                noveltyComment = r.NoveltyComment,
                contributionScore = r.ContributionScore,
                contributionComment = r.ContributionComment,
                innovationScore = r.InnovationScore,
                innovationComment = r.InnovationComment,

                // Section 3
                writingScore = r.WritingScore,
                writingComment = r.WritingComment,
                logicScore = r.LogicScore,
                logicComment = r.LogicComment,
                citationScore = r.CitationScore,
                citationComment = r.CitationComment,

                // Section 4
                ethicsScore = r.EthicsScore,
                ethicsComment = r.EthicsComment,
                riskScore = r.RiskScore,
                riskComment = r.RiskComment
                // NOTE: ConfidentialNotes is intentionally NOT returned here
                // so students and other evaluators cannot see supervisor-only notes.
            })
            .ToListAsync();

        return Ok(rubrics);
    }

    /// <summary>GET /api/evaluations/proposal/{proposalId}/results — aggregated results with per-criterion detail</summary>
    [HttpGet("proposal/{proposalId}/results")]
    public async Task<IActionResult> GetResults(int proposalId)
    {
        var rubrics = await _db.EvaluationRubrics
            .Where(r => r.ProposalID == proposalId)
            .ToListAsync();

        if (rubrics.Count == 0)
            return NotFound(new { message = "No evaluations found" });

        var avgScore = rubrics.Average(r => r.TotalScore);

        return Ok(new
        {
            proposalID = proposalId,
            evaluatorCount = rubrics.Count,
            averageScore = Math.Round(avgScore, 1),
            recommendation = rubrics.FirstOrDefault()?.Recommendation ?? "Pending",
            overallDecision = rubrics.FirstOrDefault()?.Recommendation ?? "Pending",
            evaluations = rubrics.Select(r => new
            {
                rubricID = r.RubricID,
                totalScore = r.TotalScore,
                recommendation = r.Recommendation,
                feedbackNotes = r.FeedbackNotes,

                // Section 1 scores + comments
                clarityScore = r.ClarityScore,
                clarityComment = r.ClarityComment,
                literatureScore = r.LiteratureScore,
                literatureComment = r.LiteratureComment,
                methodologyScore = r.MethodologyScore,
                methodologyComment = r.MethodologyComment,
                feasibilityScore = r.FeasibilityScore,
                feasibilityComment = r.FeasibilityComment,

                // Section 2
                noveltyScore = r.NoveltyScore,
                noveltyComment = r.NoveltyComment,
                contributionScore = r.ContributionScore,
                contributionComment = r.ContributionComment,
                innovationScore = r.InnovationScore,
                innovationComment = r.InnovationComment,

                // Section 3
                writingScore = r.WritingScore,
                writingComment = r.WritingComment,
                logicScore = r.LogicScore,
                logicComment = r.LogicComment,
                citationScore = r.CitationScore,
                citationComment = r.CitationComment,

                // Section 4
                ethicsScore = r.EthicsScore,
                ethicsComment = r.EthicsComment,
                riskScore = r.RiskScore,
                riskComment = r.RiskComment

                // ConfidentialNotes intentionally NOT returned
            }).ToList()
        });
    }

    /// <summary>POST /api/evaluations — Submit evaluation with rubric scores + comments</summary>
    [HttpPost]
    [Authorize(Roles = "Evaluator,Supervisor")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Submit([FromForm] SubmitEvaluationDto dto, IFormFile? evaluationDocument)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var supervisor = await _db.Supervisors.FirstOrDefaultAsync(s => s.UserID == userId);
        if (supervisor == null) return Forbid();

        if (await _db.EvaluationRubrics.AnyAsync(r => r.ProposalID == dto.ProposalID && r.EvaluatorID == supervisor.SupervisorID))
            return Conflict(new { message = "You have already submitted an evaluation for this proposal" });

        string? docPath = null;
        if (evaluationDocument != null)
        {
            try { docPath = await _files.UploadEvaluationDocumentAsync(evaluationDocument, dto.ProposalID); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        var rubric = new EvaluationRubric
        {
            ProposalID = dto.ProposalID,
            EvaluatorID = supervisor.SupervisorID,

            // Section 1
            ClarityScore = dto.ClarityScore,
            ClarityComment = dto.ClarityComment,
            LiteratureScore = dto.LiteratureScore,
            LiteratureComment = dto.LiteratureComment,
            MethodologyScore = dto.MethodologyScore,
            MethodologyComment = dto.MethodologyComment,
            FeasibilityScore = dto.FeasibilityScore,
            FeasibilityComment = dto.FeasibilityComment,

            // Section 2
            NoveltyScore = dto.NoveltyScore,
            NoveltyComment = dto.NoveltyComment,
            ContributionScore = dto.ContributionScore,
            ContributionComment = dto.ContributionComment,
            InnovationScore = dto.InnovationScore,
            InnovationComment = dto.InnovationComment,

            // Section 3
            WritingScore = dto.WritingScore,
            WritingComment = dto.WritingComment,
            LogicScore = dto.LogicScore,
            LogicComment = dto.LogicComment,
            CitationScore = dto.CitationScore,
            CitationComment = dto.CitationComment,

            // Section 4
            EthicsScore = dto.EthicsScore,
            EthicsComment = dto.EthicsComment,
            RiskScore = dto.RiskScore,
            RiskComment = dto.RiskComment,

            Recommendation = dto.Recommendation,
            FeedbackNotes = dto.FeedbackNotes,
            ConfidentialNotes = dto.ConfidentialNotes,
            EvaluationDocumentPath = docPath,
            SubmittedDate = DateTime.UtcNow
        };
        rubric.TotalScore = _rubric.CalculateTotalScore(rubric);

        _db.EvaluationRubrics.Add(rubric);

        // If both evaluators submitted, notify Admin (in-app + email)
        var totalAssigned = await _db.ProposalEvaluators.CountAsync(pe => pe.ProposalID == dto.ProposalID);
        var completedCount = await _db.EvaluationRubrics.CountAsync(r => r.ProposalID == dto.ProposalID) + 1;

        if (completedCount >= totalAssigned)
        {
            var proposal = await _db.Proposals
                .Include(p => p.Student).ThenInclude(s => s.User)
                .FirstOrDefaultAsync(p => p.ProposalID == dto.ProposalID);

            var admins = await _db.Users.Where(u => u.Role == "Admin" && u.IsActive).ToListAsync();
            foreach (var admin in admins)
            {
                _db.Notifications.Add(new Notification
                {
                    UserID = admin.UserID,
                    Message = $"Both evaluations submitted for proposal #{dto.ProposalID}. Ready to finalise.",
                    Type = "AllEvaluationsComplete"
                });

                if (proposal != null)
                {
                    try
                    {
                        await _email.SendAllEvaluationsCompleteAsync(
                            admin.Email,
                            admin.FullName,
                            dto.ProposalID,
                            proposal.Title);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Email send failed (non-fatal)");
                    }
                }
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Evaluation submitted successfully", rubricID = rubric.RubricID, totalScore = rubric.TotalScore });
    }
}