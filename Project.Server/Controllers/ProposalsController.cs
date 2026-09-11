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
using System.Security.Claims;

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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await LoadProposal(id);
        return p == null ? NotFound() : Ok(ToDto(p));
    }

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

    [HttpGet("pending-evaluation")]
    [Authorize(Roles = "Supervisor,Admin,Evaluator")]
    public async Task<IActionResult> GetPendingEvaluation()
    {
        var proposals = await _db.Proposals
            .Where(p => p.Status == "UNDER_EVALUATION" && p.SupervisorSigned)
            .Include(p => p.Student).ThenInclude(s => s.User)
            .Include(p => p.AssignedEvaluators)
            .ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    [HttpGet("ready-for-examination")]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<IActionResult> GetReadyForExamination()
    {
        var proposals = await _db.Proposals
            .Where(p => p.Status == "READY_FOR_EXAMINATION")
            .Include(p => p.Student).ThenInclude(s => s.User)
            .OrderBy(p => p.SupervisorSignedDate)
            .ToListAsync();
        return Ok(proposals.Select(ToDto));
    }

    /// <summary>POST /api/proposals — Submit a new proposal with document upload.</summary>
    [HttpPost]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Create([FromForm] CreateProposalDto dto, IFormFile document)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (document == null) return BadRequest(new { message = "Proposal document is required" });

        var proposalDeadline = await _db.Deadlines
            .Where(d => d.DeadlineType == "Proposal" && d.IsActive)
            .OrderByDescending(d => d.DueDate)
            .FirstOrDefaultAsync();

        if (proposalDeadline != null && DateTime.UtcNow > proposalDeadline.DueDate)
            return BadRequest(new { message = $"Proposal submission closed. Deadline was {proposalDeadline.DueDate:dd MMMM yyyy}." });

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var student = await _db.Students.Include(s => s.User).FirstOrDefaultAsync(s => s.UserID == userId);
        if (student == null)
            return BadRequest(new { message = "Student profile not found. Contact the administrator." });

        var hasSupervisor = await _db.StudentSupervisors
            .AnyAsync(ss => ss.StudentID == student.StudentID);

        if (!hasSupervisor)
            return BadRequest(new { message = "You must have a supervisor assigned before submitting a proposal. Contact the administrator." });

        var proposal = new Proposal
        {
            StudentID = student.StudentID,
            Title = dto.Title,
            Abstract = dto.Abstract,
            Keywords = dto.Keywords,
            DocumentPath = string.Empty,
            Status = "SUPERVISION_STAGE"
        };
        _db.Proposals.Add(proposal);
        await _db.SaveChangesAsync();

        try
        {
            proposal.DocumentPath = await _files.UploadProposalAsync(document, proposal.ProposalID);
            await _db.SaveChangesAsync();
        }
        catch (InvalidOperationException ex)
        {
            _db.Proposals.Remove(proposal);
            await _db.SaveChangesAsync();
            return BadRequest(new { message = ex.Message });
        }

        proposal.Student = student;

        var primarySupervisor = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == student.StudentID && ss.IsPrimary)
            .Include(ss => ss.Supervisor).ThenInclude(s => s.User)
            .FirstOrDefaultAsync();

        if (primarySupervisor != null)
        {
            try
            {
                await _email.SendSupervisorSignoffRequestAsync(
                    primarySupervisor.Supervisor.User.Email,
                    primarySupervisor.Supervisor.User.FullName,
                    student.User?.FullName ?? "Student",
                    proposal.Title);
            }
            catch { }

            _db.Notifications.Add(new Notification
            {
                UserID = primarySupervisor.Supervisor.UserID,
                Message = $"New proposal '{proposal.Title}' submitted by your student. Awaiting your review.",
                Type = "ProposalSubmitted"
            });
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("Proposal {ID} created by student {StudentID}", proposal.ProposalID, student.StudentID);
        return CreatedAtAction(nameof(GetById), new { id = proposal.ProposalID }, ToDto(proposal));
    }

    /// <summary>PUT /api/proposals/{id}/resubmit — Student revises and resubmits after supervisor requested changes</summary>
    [HttpPut("{id}/resubmit")]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Resubmit(int id, [FromForm] CreateProposalDto dto, IFormFile? document)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var student = await _db.Students.Include(s => s.User).FirstOrDefaultAsync(s => s.UserID == userId);
        if (student == null) return Forbid();

        var proposal = await _db.Proposals
            .Include(p => p.Student)
            .FirstOrDefaultAsync(p => p.ProposalID == id);

        if (proposal == null) return NotFound();
        if (proposal.StudentID != student.StudentID) return Forbid();

        if (proposal.Status != "REVISION_REQUIRED")
            return BadRequest(new { message = "Only proposals in REVISION_REQUIRED status can be resubmitted." });

        var proposalDeadline = await _db.Deadlines
            .Where(d => d.DeadlineType == "Proposal" && d.IsActive)
            .OrderByDescending(d => d.DueDate)
            .FirstOrDefaultAsync();
        if (proposalDeadline != null && DateTime.UtcNow > proposalDeadline.DueDate)
            return BadRequest(new { message = $"Submission closed. Deadline was {proposalDeadline.DueDate:dd MMMM yyyy}." });

        proposal.Title = dto.Title;
        proposal.Abstract = dto.Abstract;
        proposal.Keywords = dto.Keywords;

        if (document != null)
        {
            try
            {
                proposal.DocumentPath = await _files.UploadProposalAsync(document, proposal.ProposalID);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        proposal.Status = "SUPERVISION_STAGE";
        proposal.SubmissionDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var primarySupervisor = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == student.StudentID && ss.IsPrimary)
            .Include(ss => ss.Supervisor).ThenInclude(s => s.User)
            .FirstOrDefaultAsync();

        if (primarySupervisor != null)
        {
            try
            {
                await _email.SendSupervisorSignoffRequestAsync(
                    primarySupervisor.Supervisor.User.Email,
                    primarySupervisor.Supervisor.User.FullName,
                    student.User?.FullName ?? "Student",
                    proposal.Title);
            }
            catch { }

            _db.Notifications.Add(new Notification
            {
                UserID = primarySupervisor.Supervisor.UserID,
                Message = $"Your student '{student.User?.FullName}' has resubmitted their revised proposal: '{proposal.Title}'.",
                Type = "ProposalResubmitted"
            });
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("Proposal {ID} resubmitted by student {StudentID}", proposal.ProposalID, student.StudentID);
        return Ok(new { message = "Proposal resubmitted successfully", proposal = ToDto(proposal) });
    }

    /// <summary>PUT /api/proposals/{id} — Update draft proposal details (metadata only)</summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProposalDto dto)
    {
        var proposal = await _db.Proposals.FindAsync(id);
        if (proposal == null) return NotFound();
        if (proposal.Status != "REVISION_REQUIRED")
            return BadRequest(new { message = "Only proposals in REVISION_REQUIRED can be updated" });

        if (dto.Title != null) proposal.Title = dto.Title;
        if (dto.Abstract != null) proposal.Abstract = dto.Abstract;
        if (dto.Keywords != null) proposal.Keywords = dto.Keywords;
        await _db.SaveChangesAsync();
        return Ok(proposal);
    }

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
        proposal.Status = "READY_FOR_EXAMINATION";
        await _db.SaveChangesAsync();

        _db.Notifications.Add(new Notification
        {
            UserID = proposal.Student.UserID,
            Message = $"Your supervisor has signed off on your proposal '{proposal.Title}'.",
            Type = "SupervisorSignoff"
        });

        var admins = await _db.Users.Where(u => u.Role == "Admin" && u.IsActive).ToListAsync();
        foreach (var admin in admins)
        {
            _db.Notifications.Add(new Notification
            {
                UserID = admin.UserID,
                Message = $"Proposal '{proposal.Title}' signed off by supervisor. Ready for evaluator assignment.",
                Type = "ReadyForEvaluatorAssignment"
            });
        }
        await _db.SaveChangesAsync();
        return Ok(new { message = "Proposal signed off successfully" });
    }

    [HttpPut("{id}/request-changes")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> RequestChanges(int id, [FromBody] RequestChangesDto dto)
    {
        var proposal = await _db.Proposals.Include(p => p.Student).FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        proposal.Status = "REVISION_REQUIRED";
        await _db.SaveChangesAsync();

        _db.Notifications.Add(new Notification
        {
            UserID = proposal.Student.UserID,
            Message = $"Your supervisor requested changes: {dto.Comments}",
            Type = "RevisionRequired"
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "Changes requested" });
    }

    [HttpPost("{id}/assign-evaluators")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignEvaluators(int id, [FromBody] AssignEvaluatorsDto dto)
    {
        if (dto.EvaluatorIDs.Count < 2)
            return BadRequest(new { message = "At least 2 evaluators must be assigned" });

        var proposal = await _db.Proposals
            .Include(p => p.Student)
            .Include(p => p.AssignedEvaluators)
            .FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        if (proposal.Status != "READY_FOR_EXAMINATION")
            return BadRequest(new { message = "Only READY_FOR_EXAMINATION proposals can have evaluators assigned" });

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

                var evaluator = await _db.Supervisors.Include(s => s.User).FirstOrDefaultAsync(s => s.SupervisorID == evaluatorId);
                if (evaluator != null)
                {
                    try { await _email.SendEvaluationAssignedAsync(evaluator.User.Email, evaluator.User.FullName, proposal.Title); }
                    catch { }

                    _db.Notifications.Add(new Notification
                    {
                        UserID = evaluator.UserID,
                        Message = $"You have been assigned to evaluate proposal: '{proposal.Title}'.",
                        Type = "EvaluationAssigned"
                    });
                }
            }
        }

        proposal.Status = "UNDER_EVALUATION";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Evaluators assigned successfully" });
    }

    /// <summary>PUT /api/proposals/{id}/finalise — Auto-decides based on evaluation scores</summary>
    [HttpPut("{id}/finalise")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Finalise(int id)
    {
        var proposal = await _db.Proposals
            .Include(p => p.Student).ThenInclude(s => s.User)
            .FirstOrDefaultAsync(p => p.ProposalID == id);
        if (proposal == null) return NotFound();

        var evaluations = await _db.EvaluationRubrics
            .Where(e => e.ProposalID == id)
            .ToListAsync();

        if (evaluations.Count < 2)
            return BadRequest(new { message = "Both evaluators must submit before finalising" });

        // AUTO-DECISION LOGIC
        var avgScore = evaluations.Average(e => e.TotalScore);
        var recommendations = evaluations.Select(e => e.Recommendation?.ToLower() ?? "").ToList();

        string finalStatus;
        string resultMessage;

        bool needsRevision = recommendations.Any(r =>
            r.Contains("major") || r.Contains("resubmit") || r.Contains("revision"));

        if (needsRevision)
        {
            finalStatus = "REVISION_REQUIRED";
            resultMessage = $"Revision required. Average score: {avgScore:F1}%. Please revise and resubmit.";
        }
        else if (avgScore >= 50)
        {
            finalStatus = "APPROVED_GRADUATION";
            resultMessage = $"🎉 Congratulations! Your proposal has been APPROVED. Average score: {avgScore:F1}%.";
        }
        else
        {
            finalStatus = "REJECTED";
            resultMessage = $"Your proposal has been rejected. Average score: {avgScore:F1}%. Please contact your supervisor.";
        }

        proposal.Status = finalStatus;
        await _db.SaveChangesAsync();

        // Notify Student
        _db.Notifications.Add(new Notification
        {
            UserID = proposal.Student.UserID,
            Message = resultMessage,
            Type = "FinalResult"
        });

        // Notify Primary Supervisor
        var supervisorAssignment = await _db.StudentSupervisors
            .Where(ss => ss.StudentID == proposal.StudentID && ss.IsPrimary)
            .Include(ss => ss.Supervisor).ThenInclude(s => s.User)
            .FirstOrDefaultAsync();

        if (supervisorAssignment != null)
        {
            _db.Notifications.Add(new Notification
            {
                UserID = supervisorAssignment.Supervisor.UserID,
                Message = $"Final result for '{proposal.Title}': {finalStatus}. Avg score: {avgScore:F1}%.",
                Type = "FinalResult"
            });
        }

        // Notify Evaluators
        var evaluatorIds = await _db.ProposalEvaluators
            .Where(pe => pe.ProposalID == id)
            .Select(pe => pe.EvaluatorID)
            .ToListAsync();

        foreach (var evaluatorId in evaluatorIds)
        {
            var evaluator = await _db.Supervisors.Include(s => s.User)
                .FirstOrDefaultAsync(s => s.SupervisorID == evaluatorId);
            if (evaluator != null)
            {
                _db.Notifications.Add(new Notification
                {
                    UserID = evaluator.UserID,
                    Message = $"Proposal '{proposal.Title}' finalised: {finalStatus}.",
                    Type = "FinalResult"
                });
            }
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Proposal {ID} finalised as {Status} (avg score: {Score})", id, finalStatus, avgScore);

        return Ok(new
        {
            message = $"Proposal finalised as {finalStatus}",
            status = finalStatus,
            averageScore = Math.Round(avgScore, 1),
            resultMessage
        });
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
            User = p.Student.User != null
                ? new UserDto { UserID = p.Student.User.UserID, FirstName = p.Student.User.FirstName, LastName = p.Student.User.LastName, Email = p.Student.User.Email }
                : new UserDto { UserID = p.Student.UserID, FirstName = "Unknown", LastName = "User", Email = "" }
        } : null,
        AssignedEvaluators = p.AssignedEvaluators?.Select(pe => new EvaluatorAssignmentDto
        {
            ProposalEvaluatorID = pe.ProposalEvaluatorID,
            EvaluatorID = pe.EvaluatorID,
            EvaluatorName = pe.Evaluator?.User?.FullName ?? "",
            AssignedDate = pe.AssignedDate,
            HasSubmittedEvaluation = false
        }).ToList() ?? new()
    };
}