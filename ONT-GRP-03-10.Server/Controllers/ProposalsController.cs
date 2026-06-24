// ============================================================
// PRS.Backend/Controllers/ProposalsController.cs
// ============================================================
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.DTOs;
using PRS.Backend.Models;
using PRS.Backend.Services;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/proposals")]
[Authorize]
public class ProposalsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IFileUploadService _files;
    private readonly IEmailService _email;
    private readonly ILogger<ProposalsController> _logger;

    public ProposalsController(ApplicationDbContext db, IFileUploadService files, IEmailService email, ILogger<ProposalsController> logger)
    {
        _db = db;
        _files = files;
        _email = email;
        _logger = logger;
    }

    /// <summary>GET /api/proposals — All proposals (Supervisor/Admin)</summary>
    [HttpGet]
    [Authorize(Roles = "Supervisor,Admin")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var query = _db.Proposals
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.AssignedEvaluators).ThenInclude(pe => pe.Evaluator).ThenInclude(e => e.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        var proposals = await query.OrderByDescending(p => p.CreatedDate).ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>GET /api/proposals/{id}</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await LoadProposal(id);
        return p == null ? NotFound() : Ok(ToDto(p));
    }

    /// <summary>GET /api/proposals/student/{studentId}</summary>
    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetByStudent(int studentId)
    {
        var proposals = await _db.Proposals
            .Where(p => p.StudentID == studentId)
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.Evaluations)
            .OrderByDescending(p => p.CreatedDate)
            .ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>GET /api/proposals/pending-evaluation — Proposals ready to be evaluated</summary>
    [HttpGet("pending-evaluation")]
    [Authorize(Roles = "Supervisor,Admin,Evaluator")]
    public async Task<IActionResult> GetPendingEvaluation()
    {
        var proposals = await _db.Proposals
            .Where(p => p.Status == "UnderReview" && p.SupervisorSigned)
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.AssignedEvaluators)
            .ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>
    /// POST /api/proposals — Submit a new proposal with document upload.
    /// Expects multipart/form-data with Title, Abstract, Keywords, Document file.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(25_000_000)] // 25MB limit to allow for multipart overhead
    public async Task<IActionResult> Create([FromForm] CreateProposalDto dto, IFormFile document)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (document == null) return BadRequest(new { message = "Proposal document is required" });

        // Get the student profile for the current user
        var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        var student = await _db.Students.FirstOrDefaultAsync(s => s.UserID == userId);
        if (student == null) return BadRequest(new { message = "Student profile not found. Contact the administrator." });

        // Upload the document
        string docPath;
        try { docPath = await _files.UploadProposalAsync(document, 0); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }

        var proposal = new Proposal
        {
            StudentID = student.StudentID,
            Title = dto.Title,
            Abstract = dto.Abstract,
            Keywords = dto.Keywords,
            DocumentPath = docPath,
            Status = "Draft"
        };
        _db.Proposals.Add(proposal);
        await _db.SaveChangesAsync();

        // Update document path now we have the ProposalID
        proposal.DocumentPath = await _files.UploadProposalAsync(document, proposal.ProposalID);
        await _db.SaveChangesAsync();

        // Notify primary supervisor to sign off
        var primarySupervisor = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == student.StudentID && ss.IsPrimary)
            .Include(ss => ss.Supervisor).ThenInclude(s => s.User)
            .FirstOrDefaultAsync();

        if (primarySupervisor != null)
        {
            await _email.SendSupervisorSignoffRequestAsync(
                primarySupervisor.Supervisor.User.Email,
                primarySupervisor.Supervisor.User.FullName,
                student.User?.FullName ?? "Student",
                proposal.Title);

            _db.Notifications.Add(new Notification
            {
                UserID = primarySupervisor.Supervisor.UserID,
                Message = $"New proposal '{proposal.Title}' submitted by your student and awaiting your sign-off.",
                Type = "ProposalSignoffRequired"
            });
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("Proposal {ID} created by student {StudentID}", proposal.ProposalID, student.StudentID);
        return CreatedAtAction(nameof(GetById), new { id = proposal.ProposalID }, ToDto(proposal));
    }

    /// <summary>PUT /api/proposals/{id} — Update draft proposal details</summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProposalDto dto)
    {
        var proposal = await _db.Proposals.FindAsync(id);
        if (proposal == null) return NotFound();
        if (proposal.Status != "Draft" && proposal.Status != "Revised")
            return BadRequest(new { message = "Only Draft or Revised proposals can be updated" });

        if (dto.Title != null) proposal.Title = dto.Title;
        if (dto.Abstract != null) proposal.Abstract = dto.Abstract;
        if (dto.Keywords != null) proposal.Keywords = dto.Keywords;
        await _db.SaveChangesAsync();
        return Ok(proposal);
    }

    /// <summary>PUT /api/proposals/{id}/submit — Student formally submits proposal</summary>
    [HttpPut("{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Submit(int id)
    {
        var proposal = await _db.Proposals.FindAsync(id);
        if (proposal == null) return NotFound();
        if (proposal.Status != "Draft" && proposal.Status != "Revised")
            return BadRequest(new { message = "Only Draft or Revised proposals can be submitted" });

        proposal.Status = "Submitted";
        proposal.SubmissionDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Proposal submitted successfully", proposal });
    }

    /// <summary>PUT /api/proposals/{id}/supervisor-signoff — Supervisor approves and signs off</summary>
    [HttpPut("{id}/supervisor-signoff")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> SupervisorSignoff(int id)
    {
        var proposal = await _db.Proposals
            .Include(p => p.Student).ThenInclude(s => s.User)
            .FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        proposal.SupervisorSigned = true;
        proposal.SupervisorSignedDate = DateTime.UtcNow;
        proposal.Status = "Submitted"; // Ready for evaluator assignment
        await _db.SaveChangesAsync();

        // Notify student
        _db.Notifications.Add(new Notification
        {
            UserID = proposal.Student.UserID,
            Message = $"Your supervisor has signed off on your proposal '{proposal.Title}'.",
            Type = "SupervisorSignoff"
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "Proposal signed off successfully" });
    }

    /// <summary>POST /api/proposals/{id}/assign-evaluators — Assign evaluators to a proposal</summary>
    [HttpPost("{id}/assign-evaluators")]
    [Authorize(Roles = "Supervisor,Admin")]
    public async Task<IActionResult> AssignEvaluators(int id, [FromBody] AssignEvaluatorsDto dto)
    {
        if (dto.EvaluatorIDs.Count < 2)
            return BadRequest(new { message = "At least 2 evaluators must be assigned" });

        var proposal = await _db.Proposals
            .Include(p => p.Student)
            .Include(p => p.AssignedEvaluators)
            .FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        // Get the student's supervisors — they CANNOT evaluate their own student
        var studentSupervisorIds = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == proposal.StudentID)
            .Select(ss => ss.SupervisorID)
            .ToListAsync();

        foreach (var evaluatorId in dto.EvaluatorIDs)
        {
            if (studentSupervisorIds.Contains(evaluatorId))
                return BadRequest(new { message = $"Evaluator {evaluatorId} is a supervisor of this student and cannot evaluate their proposal." });

            if (!await _db.ProposalEvaluators.AnyAsync(pe => pe.ProposalID == id && pe.EvaluatorID == evaluatorId))
            {
                _db.ProposalEvaluators.Add(new ProposalEvaluator
                {
                    ProposalID = id,
                    EvaluatorID = evaluatorId
                });

                // Send email notification to evaluator
                var evaluator = await _db.Supervisors.Include(s => s.User).FirstOrDefaultAsync(s => s.SupervisorID == evaluatorId);
                if (evaluator != null)
                {
                    await _email.SendEvaluationAssignedAsync(evaluator.User.Email, evaluator.User.FullName, proposal.Title);
                    _db.Notifications.Add(new Notification
                    {
                        UserID = evaluator.UserID,
                        Message = $"You have been assigned to evaluate proposal: '{proposal.Title}'.",
                        Type = "EvaluationAssigned"
                    });
                }
            }
        }

        proposal.Status = "UnderReview";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Evaluators assigned successfully" });
    }

    private async Task<Proposal?> LoadProposal(int id) => await _db.Proposals
        .Include(p => p.Student).ThenInclude(s => s.User)
        .Include(p => p.Evaluations).ThenInclude(e => e.Evaluator).ThenInclude(sv => sv.User)
        .Include(p => p.AssignedEvaluators).ThenInclude(pe => pe.Evaluator).ThenInclude(sv => sv.User)
        .Include(p => p.EthicsCertificates)
        .FirstOrDefaultAsync(p => p.ProposalID == id);

    private static ProposalDto ToDto(Proposal p) => new()
    {
        ProposalID = p.ProposalID,
        StudentID = p.StudentID,
        Title = p.Title,
        Abstract = p.Abstract,
        Keywords = p.Keywords,
        DocumentPath = p.DocumentPath,
        SupervisorSigned = p.SupervisorSigned,
        SupervisorSignedDate = p.SupervisorSignedDate,
        Status = p.Status,
        SubmissionDate = p.SubmissionDate,
        CreatedDate = p.CreatedDate,
        Student = p.Student != null ? new StudentDto
        {
            StudentID = p.Student.StudentID,
            StudentNumber = p.Student.StudentNumber,
            Program = p.Student.Program,
            User = new UserDto { UserID = p.Student.User.UserID, FirstName = p.Student.User.FirstName, LastName = p.Student.User.LastName, Email = p.Student.User.Email }
        } : null,
        AssignedEvaluators = p.AssignedEvaluators?.Select(pe => new EvaluatorAssignmentDto
        {
            ProposalEvaluatorID = pe.ProposalEvaluatorID,
            EvaluatorID = pe.EvaluatorID,
            EvaluatorName = pe.Evaluator?.User?.FullName ?? "",
            AssignedDate = pe.AssignedDate,
            HasSubmittedEvaluation = false // computed separately if needed
        }).ToList() ?? new()
    };
}

// ============================================================
// PRS.Backend/Controllers/EvaluationsController.cs
// ============================================================
[ApiController]
[Route("api/evaluations")]
[Authorize]
public class EvaluationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly RubricCalculatorService _rubric;
    private readonly IFileUploadService _files;
    private readonly IEmailService _email;

    public EvaluationsController(ApplicationDbContext db, RubricCalculatorService rubric, IFileUploadService files, IEmailService email)
    {
        _db = db;
        _rubric = rubric;
        _files = files;
        _email = email;
    }

    /// <summary>POST /api/evaluations — Submit a full rubric evaluation</summary>
    [HttpPost]
    [Authorize(Roles = "Evaluator,Supervisor")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Submit([FromForm] SubmitEvaluationDto dto, IFormFile? evaluationDocument)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Get current user's supervisor profile
        var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        var supervisor = await _db.Supervisors.FirstOrDefaultAsync(s => s.UserID == userId);
        if (supervisor == null) return Forbid();

        // Verify this evaluator is assigned to this proposal
        var isAssigned = await _db.ProposalEvaluators
            .AnyAsync(pe => pe.ProposalID == dto.ProposalID && pe.EvaluatorID == supervisor.SupervisorID);
        if (!isAssigned)
            return Forbid();

        // Prevent duplicate evaluation
        if (await _db.EvaluationRubrics.AnyAsync(r => r.ProposalID == dto.ProposalID && r.EvaluatorID == supervisor.SupervisorID))
            return Conflict(new { message = "You have already submitted an evaluation for this proposal" });

        // Upload optional evaluation document
        string? docPath = null;
        if (evaluationDocument != null)
        {
            try { docPath = await _files.UploadEvaluationDocumentAsync(evaluationDocument, 0); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        var rubric = new EvaluationRubric
        {
            ProposalID = dto.ProposalID,
            EvaluatorID = supervisor.SupervisorID,
            ClarityScore = dto.ClarityScore,
            LiteratureScore = dto.LiteratureScore,
            MethodologyScore = dto.MethodologyScore,
            FeasibilityScore = dto.FeasibilityScore,
            NoveltyScore = dto.NoveltyScore,
            ContributionScore = dto.ContributionScore,
            InnovationScore = dto.InnovationScore,
            WritingScore = dto.WritingScore,
            LogicScore = dto.LogicScore,
            CitationScore = dto.CitationScore,
            EthicsScore = dto.EthicsScore,
            RiskScore = dto.RiskScore,
            Recommendation = dto.Recommendation,
            FeedbackNotes = dto.FeedbackNotes,
            ConfidentialNotes = dto.ConfidentialNotes,
            EvaluationDocumentPath = docPath,
            TotalScore = _rubric.CalculateTotalScore(new EvaluationRubric
            {
                // Pass scores for calculation
                ClarityScore = dto.ClarityScore,
                LiteratureScore = dto.LiteratureScore,
                MethodologyScore = dto.MethodologyScore,
                FeasibilityScore = dto.FeasibilityScore,
                NoveltyScore = dto.NoveltyScore,
                ContributionScore = dto.ContributionScore,
                InnovationScore = dto.InnovationScore,
                WritingScore = dto.WritingScore,
                LogicScore = dto.LogicScore,
                CitationScore = dto.CitationScore,
                EthicsScore = dto.EthicsScore,
                RiskScore = dto.RiskScore
            })
        };

        _db.EvaluationRubrics.Add(rubric);

        // Check if ALL assigned evaluators have submitted — if so, update proposal status
        var proposal = await _db.Proposals.Include(p => p.Student).ThenInclude(s => s.User)
                                        .Include(p => p.AssignedEvaluators).FirstOrDefaultAsync(p => p.ProposalID == dto.ProposalID);
        var totalAssigned = proposal?.AssignedEvaluators.Count ?? 0;
        var completedCount = await _db.EvaluationRubrics.CountAsync(r => r.ProposalID == dto.ProposalID) + 1;

        if (proposal != null && completedCount >= totalAssigned)
        {
            // Compute average score to determine final status
            var allScores = await _db.EvaluationRubrics.Where(r => r.ProposalID == dto.ProposalID).Select(r => r.TotalScore).ToListAsync();
            allScores.Add(rubric.TotalScore);
            var avg = allScores.Average();

            proposal.Status = avg >= 70 ? "Accepted" : "Rejected";

            // Notify student
            if (proposal.Student?.User != null)
            {
                await _email.SendProposalStatusUpdateAsync(
                    proposal.Student.User.Email, proposal.Student.User.FullName, proposal.Title, proposal.Status);
                _db.Notifications.Add(new Notification
                {
                    UserID = proposal.Student.UserID,
                    Message = $"Evaluation complete for '{proposal.Title}'. Status: {proposal.Status}. Average score: {avg:F1}/100.",
                    Type = "EvaluationComplete"
                });
            }
        }

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = rubric.RubricID }, ToDto(rubric, true));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var r = await _db.EvaluationRubrics.Include(x => x.Evaluator).ThenInclude(s => s.User).FirstOrDefaultAsync(x => x.RubricID == id);
        return r == null ? NotFound() : Ok(ToDto(r, CanSeeConfidential()));
    }

    [HttpGet("proposal/{proposalId}")]
    public async Task<IActionResult> GetByProposal(int proposalId)
    {
        var rubrics = await _db.EvaluationRubrics
            .Where(r => r.ProposalID == proposalId)
            .Include(r => r.Evaluator).ThenInclude(s => s.User)
            .ToListAsync();
        return Ok(rubrics.Select(r => ToDto(r, CanSeeConfidential())));
    }

    /// <summary>GET /api/evaluations/proposal/{proposalId}/results — Aggregated rubric results</summary>
    [HttpGet("proposal/{proposalId}/results")]
    public async Task<IActionResult> GetResults(int proposalId)
    {
        var proposal = await _db.Proposals.FindAsync(proposalId);
        if (proposal == null) return NotFound();

        var rubrics = await _db.EvaluationRubrics
            .Where(r => r.ProposalID == proposalId)
            .Include(r => r.Evaluator).ThenInclude(s => s.User)
            .ToListAsync();

        var results = new ProposalRubricResultsDto
        {
            ProposalID = proposalId,
            ProposalTitle = proposal.Title,
            EvaluatorCount = rubrics.Count,
            AverageScore = rubrics.Count > 0 ? Math.Round(rubrics.Average(r => r.TotalScore), 2) : 0,
            OverallDecision = rubrics.Count > 0 ? _rubric.GetRecommendation(rubrics.Average(r => r.TotalScore)) : "Pending",
            Evaluations = rubrics.Select(r => ToDto(r, CanSeeConfidential())).ToList()
        };
        return Ok(results);
    }

    [HttpGet("evaluator/{evaluatorId}")]
    [Authorize(Roles = "Evaluator,Supervisor,Admin")]
    public async Task<IActionResult> GetByEvaluator(int evaluatorId)
    {
        var rubrics = await _db.EvaluationRubrics
            .Where(r => r.EvaluatorID == evaluatorId)
            .Include(r => r.Proposal)
            .ToListAsync();
        return Ok(rubrics.Select(r => ToDto(r, true)));
    }

    private bool CanSeeConfidential() =>
        User.IsInRole("Supervisor") || User.IsInRole("Admin");

    private EvaluationRubricDto ToDto(EvaluationRubric r, bool includeConfidential)
    {
        var sections = _rubric.CalculateSectionScores(r);
        return new EvaluationRubricDto
        {
            RubricID = r.RubricID,
            ProposalID = r.ProposalID,
            EvaluatorID = r.EvaluatorID,
            EvaluatorName = r.Evaluator?.User?.FullName ?? "",
            ClarityScore = r.ClarityScore,
            LiteratureScore = r.LiteratureScore,
            MethodologyScore = r.MethodologyScore,
            FeasibilityScore = r.FeasibilityScore,
            NoveltyScore = r.NoveltyScore,
            ContributionScore = r.ContributionScore,
            InnovationScore = r.InnovationScore,
            WritingScore = r.WritingScore,
            LogicScore = r.LogicScore,
            CitationScore = r.CitationScore,
            EthicsScore = r.EthicsScore,
            RiskScore = r.RiskScore,
            TotalScore = r.TotalScore,
            Recommendation = r.Recommendation,
            FeedbackNotes = r.FeedbackNotes,
            ConfidentialNotes = includeConfidential ? r.ConfidentialNotes : null,
            EvaluationDocumentPath = r.EvaluationDocumentPath,
            SubmittedDate = r.SubmittedDate,
            SectionScores = sections
        };
    }
}