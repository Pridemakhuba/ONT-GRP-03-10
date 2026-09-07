using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.DTOs;
using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using iText.Html2pdf;
using iText.Kernel.Pdf;
using iText.Kernel.Geom;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin,Supervisor")]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ReportsController(ApplicationDbContext db) => _db = db;

    [HttpGet("proposal-submissions")]
    public async Task<IActionResult> ProposalSubmissions(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
        [FromQuery] string? status, [FromQuery] string? department, [FromQuery] string? format)
    {
        var query = _db.Proposals.Include(p => p.Student).ThenInclude(s => s.User).AsQueryable();
        if (startDate.HasValue) query = query.Where(p => p.CreatedDate >= startDate.Value);
        if (endDate.HasValue) query = query.Where(p => p.CreatedDate <= endDate.Value.AddDays(1));
        if (!string.IsNullOrEmpty(status)) query = query.Where(p => p.Status == status);
        if (!string.IsNullOrEmpty(department)) query = query.Where(p => p.Student.User.Department != null && p.Student.User.Department.Contains(department));

        var proposals = await query.OrderByDescending(p => p.CreatedDate)
            .Select(p => new ProposalReportDto
            {
                ProposalID = p.ProposalID,
                StudentNumber = p.Student.StudentNumber,
                StudentName = p.Student.User.FirstName + " " + p.Student.User.LastName,
                Title = p.Title,
                Department = p.Student.User.Department ?? "",
                Status = p.Status,
                SubmissionDate = p.SubmissionDate,
                CreatedDate = p.CreatedDate,
                SupervisorSigned = p.SupervisorSigned
            }).ToListAsync();

        if (format == "csv") return ExportCsv(proposals, "ProposalSubmissions");
        if (format == "pdf") return ExportPdf(proposals, "Proposal Submissions Report",
            new[] { "Student #", "Name", "Title", "Department", "Status", "Date", "Signed" },
            r => new[] { r.StudentNumber, r.StudentName, r.Title, r.Department, r.Status, r.CreatedDate.ToString("dd/MM/yyyy"), r.SupervisorSigned ? "Yes" : "No" });
        return Ok(proposals);
    }

    [HttpGet("evaluation-results")]
    public async Task<IActionResult> EvaluationResults(
        [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
        [FromQuery] string? department, [FromQuery] string? format)
    {
        var query = _db.EvaluationRubrics
            .Include(e => e.Proposal).ThenInclude(p => p.Student).ThenInclude(s => s.User)
            .Include(e => e.Evaluator).ThenInclude(ev => ev.User).AsQueryable();
        if (startDate.HasValue) query = query.Where(e => e.SubmittedDate >= startDate.Value);
        if (endDate.HasValue) query = query.Where(e => e.SubmittedDate <= endDate.Value.AddDays(1));
        if (!string.IsNullOrEmpty(department)) query = query.Where(e => e.Proposal.Student.User.Department != null && e.Proposal.Student.User.Department.Contains(department));

        var results = await query.OrderByDescending(e => e.SubmittedDate)
            .Select(e => new EvaluationReportDto
            {
                RubricID = e.RubricID,
                StudentNumber = e.Proposal.Student.StudentNumber,
                StudentName = e.Proposal.Student.User.FirstName + " " + e.Proposal.Student.User.LastName,
                ProposalTitle = e.Proposal.Title,
                EvaluatorName = e.Evaluator.User.FirstName + " " + e.Evaluator.User.LastName,
                TotalScore = e.TotalScore,
                Recommendation = e.Recommendation ?? "",
                SubmittedDate = e.SubmittedDate,
                Department = e.Proposal.Student.User.Department ?? ""
            }).ToListAsync();

        if (format == "csv") return ExportCsv(results, "EvaluationResults");
        if (format == "pdf") return ExportPdf(results, "Evaluation Results Report",
            new[] { "Student #", "Name", "Proposal", "Evaluator", "Score", "Recommendation", "Date" },
            r => new[] { r.StudentNumber, r.StudentName, r.ProposalTitle, r.EvaluatorName, r.TotalScore + "%", r.Recommendation, r.SubmittedDate?.ToString("dd/MM/yyyy") ?? "-" });
        return Ok(results);
    }

    [HttpGet("supervisor-workload")]
    public async Task<IActionResult> SupervisorWorkload([FromQuery] string? format)
    {
        var workload = await _db.Supervisors.Include(s => s.User).Select(s => new SupervisorWorkloadDto
        {
            SupervisorID = s.SupervisorID,
            SupervisorName = s.User.FirstName + " " + s.User.LastName,
            Expertise = s.Expertise ?? "",
            TotalStudents = s.StudentSupervisors.Count,
            PendingSignoffs = s.StudentSupervisors.SelectMany(ss => ss.Student.Proposals).Count(p => p.Status == "Draft" || p.Status == "Submitted"),
            CompletedProposals = s.StudentSupervisors.SelectMany(ss => ss.Student.Proposals).Count(p => p.Status == "Accepted" || p.Status == "Rejected")
        }).ToListAsync();

        if (format == "csv") return ExportCsv(workload, "SupervisorWorkload");
        if (format == "pdf") return ExportPdf(workload, "Supervisor Workload Report",
            new[] { "Supervisor", "Expertise", "Students", "Pending", "Completed" },
            r => new[] { r.SupervisorName, r.Expertise, r.TotalStudents.ToString(), r.PendingSignoffs.ToString(), r.CompletedProposals.ToString() });
        return Ok(workload);
    }

    [HttpGet("student-progress")]
    public async Task<IActionResult> StudentProgress(
        [FromQuery] string? studentNumber, [FromQuery] string? department,
        [FromQuery] string? status, [FromQuery] string? format)
    {
        var query = _db.Students.Include(s => s.User).Include(s => s.Proposals)
            .Include(s => s.StudentSupervisors).ThenInclude(ss => ss.Supervisor).ThenInclude(sv => sv.User).AsQueryable();
        if (!string.IsNullOrEmpty(studentNumber)) query = query.Where(s => s.StudentNumber.Contains(studentNumber));
        if (!string.IsNullOrEmpty(department)) query = query.Where(s => s.User.Department != null && s.User.Department.Contains(department));

        var students = await query.OrderBy(s => s.User.LastName).ToListAsync();
        var progressData = new List<StudentProgressDto>();

        foreach (var student in students)
        {
            var proposals = student.Proposals;
            if (!string.IsNullOrEmpty(status)) proposals = proposals.Where(p => p.Status == status).ToList();
            if (!proposals.Any() && !string.IsNullOrEmpty(status)) continue;
            var primarySupervisor = student.StudentSupervisors.FirstOrDefault(ss => ss.IsPrimary)?.Supervisor?.User;
            var deadlines = await _db.Deadlines.Where(d => d.DeadlineType == "Proposal" && d.IsActive).OrderBy(d => d.DueDate).ToListAsync();

            progressData.Add(new StudentProgressDto
            {
                StudentNumber = student.StudentNumber,
                StudentName = student.User.FullName,
                Email = student.User.Email,
                Department = student.User.Department ?? "",
                Program = student.Program ?? "",
                PrimarySupervisor = primarySupervisor != null ? $"{primarySupervisor.FirstName} {primarySupervisor.LastName}" : "Not Assigned",
                TotalProposals = proposals.Count,
                DraftProposals = proposals.Count(p => p.Status == "Draft"),
                SubmittedProposals = proposals.Count(p => p.Status == "Submitted"),
                UnderReviewProposals = proposals.Count(p => p.Status == "UnderReview"),
                AcceptedProposals = proposals.Count(p => p.Status == "Accepted"),
                RejectedProposals = proposals.Count(p => p.Status == "Rejected"),
                LatestSubmission = proposals.OrderByDescending(p => p.CreatedDate).FirstOrDefault()?.CreatedDate,
                DeadlineStatus = deadlines.Any() ? (proposals.Any(p => deadlines.Any(d => p.CreatedDate <= d.DueDate)) ? "On Time" : "No Submission") : "No Deadline Set",
                EthicsCertificates = await _db.EthicsCertificates.CountAsync(e => proposals.Select(p => p.ProposalID).Contains(e.ProposalID))
            });
        }

        if (format == "csv") return ExportCsv(progressData, "StudentProgress");
        if (format == "pdf") return ExportPdf(progressData, "Student Progress Report",
            new[] { "Student #", "Name", "Supervisor", "Proposals", "Accepted", "Latest", "Deadline" },
            r => new[] { r.StudentNumber, r.StudentName, r.PrimarySupervisor, r.TotalProposals.ToString(), r.AcceptedProposals.ToString(), r.LatestSubmission?.ToString("dd/MM/yyyy") ?? "-", r.DeadlineStatus });
        return Ok(progressData);
    }

    [HttpGet("department-performance")]
    public async Task<IActionResult> DepartmentPerformance([FromQuery] string? format)
    {
        var departments = await _db.Users.Where(u => u.Department != null && u.Role == "Student")
            .Select(u => u.Department).Distinct().ToListAsync();
        var performanceData = new List<DepartmentPerformanceDto>();

        foreach (var dept in departments)
        {
            if (string.IsNullOrEmpty(dept)) continue;
            var studentIds = await _db.Users.Where(u => u.Department == dept && u.Role == "Student").Select(u => u.UserID).ToListAsync();
            var proposals = await _db.Proposals.Where(p => studentIds.Contains(p.Student.UserID)).ToListAsync();
            var evaluations = await _db.EvaluationRubrics.Where(e => proposals.Select(p => p.ProposalID).Contains(e.ProposalID)).ToListAsync();
            var studentsWithSupervisor = await _db.StudentSupervisors.CountAsync(ss => studentIds.Contains(ss.Student.UserID));

            performanceData.Add(new DepartmentPerformanceDto
            {
                Department = dept,
                TotalStudents = studentIds.Count,
                TotalProposals = proposals.Count,
                AcceptedProposals = proposals.Count(p => p.Status == "Accepted"),
                RejectedProposals = proposals.Count(p => p.Status == "Rejected"),
                UnderReviewProposals = proposals.Count(p => p.Status == "UnderReview"),
                AcceptanceRate = proposals.Count > 0 ? Math.Round((double)proposals.Count(p => p.Status == "Accepted") / proposals.Count * 100, 1) : 0,
                AverageScore = evaluations.Count > 0 ? Math.Round((double)evaluations.Average(e => e.TotalScore), 1) : 0,
                TotalEvaluations = evaluations.Count,
                StudentsWithSupervisor = studentsWithSupervisor
            });
        }

        if (format == "csv") return ExportCsv(performanceData, "DepartmentPerformance");
        if (format == "pdf") return ExportPdf(performanceData, "Department Performance Report",
            new[] { "Department", "Students", "Proposals", "Accept Rate", "Avg Score", "With Supervisor" },
            r => new[] { r.Department, r.TotalStudents.ToString(), r.TotalProposals.ToString(), r.AcceptanceRate + "%", r.AverageScore + "%", $"{r.StudentsWithSupervisor}/{r.TotalStudents}" });
        return Ok(performanceData);
    }

    [HttpGet("deadline-compliance")]
    public async Task<IActionResult> DeadlineCompliance([FromQuery] string? format)
    {
        var deadlines = await _db.Deadlines.Where(d => d.IsActive).OrderBy(d => d.DueDate).ToListAsync();
        var complianceData = new List<DeadlineComplianceDto>();

        foreach (var deadline in deadlines)
        {
            var allStudents = await _db.Students.Include(s => s.User).ToListAsync();
            var submittedOnTime = 0; var submittedLate = 0; var notSubmitted = 0;
            var studentDetails = new List<DeadlineStudentDto>();

            foreach (var student in allStudents)
            {
                var proposal = student.Proposals.OrderByDescending(p => p.CreatedDate).FirstOrDefault();
                if (proposal != null)
                {
                    if (proposal.CreatedDate <= deadline.DueDate) { submittedOnTime++; studentDetails.Add(new DeadlineStudentDto { StudentNumber = student.StudentNumber, StudentName = student.User.FullName, Status = "OnTime", SubmissionDate = proposal.CreatedDate }); }
                    else { submittedLate++; studentDetails.Add(new DeadlineStudentDto { StudentNumber = student.StudentNumber, StudentName = student.User.FullName, Status = "Late", SubmissionDate = proposal.CreatedDate }); }
                }
                else { notSubmitted++; studentDetails.Add(new DeadlineStudentDto { StudentNumber = student.StudentNumber, StudentName = student.User.FullName, Status = "NotSubmitted" }); }
            }

            var total = allStudents.Count;
            complianceData.Add(new DeadlineComplianceDto
            {
                DeadlineName = deadline.Name,
                DeadlineType = deadline.DeadlineType,
                DueDate = deadline.DueDate,
                TotalExpected = total,
                SubmittedOnTime = submittedOnTime,
                SubmittedLate = submittedLate,
                NotSubmitted = notSubmitted,
                ComplianceRate = total > 0 ? Math.Round((double)submittedOnTime / total * 100, 1) : 0,
                Students = studentDetails
            });
        }

        if (format == "csv") return ExportCsv(complianceData, "DeadlineCompliance");
        if (format == "pdf") return ExportPdf(complianceData, "Deadline Compliance Report",
            new[] { "Deadline", "Type", "Due Date", "On Time", "Late", "Not Submitted", "Compliance" },
            r => new[] { r.DeadlineName, r.DeadlineType, r.DueDate.ToString("dd/MM/yyyy"), r.SubmittedOnTime.ToString(), r.SubmittedLate.ToString(), r.NotSubmitted.ToString(), r.ComplianceRate + "%" });
        return Ok(complianceData);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var totalStudents = await _db.Students.CountAsync();
        var totalProposals = await _db.Proposals.CountAsync();
        var totalAccepted = await _db.Proposals.CountAsync(p => p.Status == "Accepted");
        var totalRejected = await _db.Proposals.CountAsync(p => p.Status == "Rejected");
        var totalUnderReview = await _db.Proposals.CountAsync(p => p.Status == "UnderReview");
        var totalEvaluations = await _db.EvaluationRubrics.CountAsync();
        var avgScore = await _db.EvaluationRubrics.AnyAsync() ? await _db.EvaluationRubrics.AverageAsync(e => e.TotalScore) : 0;

        var byDepartment = await _db.Users.Where(u => u.Department != null && u.Role == "Student")
            .GroupBy(u => u.Department).Select(g => new DepartmentSummaryDto
            {
                Department = g.Key ?? "Unknown",
                StudentCount = g.Count(),
                ProposalCount = _db.Proposals.Count(p => g.Select(u => u.UserID).Contains(p.Student.UserID)),
                AcceptedCount = _db.Proposals.Count(p => p.Status == "Accepted" && g.Select(u => u.UserID).Contains(p.Student.UserID))
            }).ToListAsync();

        return Ok(new { totalStudents, totalProposals, totalAccepted, totalRejected, totalUnderReview, totalEvaluations, averageScore = Math.Round(avgScore, 1), byDepartment });
    }

    private IActionResult ExportCsv<T>(List<T> records, string filename)
    {
        using var writer = new StringWriter();
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));
        csv.WriteRecords(records);
        var bytes = System.Text.Encoding.UTF8.GetBytes(writer.ToString());
        return File(bytes, "text/csv", $"{filename}_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    private IActionResult ExportPdf<T>(List<T> records, string reportTitle, string[] headers, Func<T, string[]> rowMapper)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset='UTF-8'><style>");
        sb.AppendLine("body { font-family: Arial, sans-serif; margin: 30px; color: #333; }");
        sb.AppendLine(".header { border-bottom: 2px solid #1a3a5c; padding-bottom: 10px; margin-bottom: 15px; }");
        sb.AppendLine("h1 { color: #1a3a5c; font-size: 16px; margin: 0; }");
        sb.AppendLine(".subtitle { color: #666; font-size: 10px; margin: 5px 0 0 0; }");
        sb.AppendLine("table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 15px; }");
        sb.AppendLine("th { background-color: #1a3a5c; color: white; padding: 6px 4px; text-align: left; }");
        sb.AppendLine("td { padding: 4px; border-bottom: 1px solid #ddd; }");
        sb.AppendLine("tr:nth-child(even) { background-color: #f5f5f5; }");
        sb.AppendLine(".footer { margin-top: 20px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<div class='header'>");
        sb.AppendLine($"<h1>{reportTitle}</h1>");
        sb.AppendLine($"<p class='subtitle'>Generated: {DateTime.UtcNow:dd MMMM yyyy HH:mm} | Records: {records.Count}</p>");
        sb.AppendLine("</div><table><thead><tr>");

        foreach (var header in headers)
            sb.AppendLine($"<th>{header}</th>");

        sb.AppendLine("</tr></thead><tbody>");

        foreach (var record in records)
        {
            sb.AppendLine("<tr>");
            foreach (var cell in rowMapper(record))
                sb.AppendLine($"<td>{System.Net.WebUtility.HtmlEncode(cell)}</td>");
            sb.AppendLine("</tr>");
        }

        sb.AppendLine("</tbody></table>");
        sb.AppendLine("<div class='footer'>PRS - Postgraduate Record System | SOIT | Mandela University<br/>This report was auto-generated by the system.</div>");
        sb.AppendLine("</body></html>");

        using var ms = new MemoryStream();
        using (var pdfWriter = new PdfWriter(ms))
        using (var pdfDoc = new PdfDocument(pdfWriter))
        {
            pdfDoc.SetDefaultPageSize(PageSize.A4.Rotate());

            var converterProperties = new ConverterProperties();
            HtmlConverter.ConvertToPdf(sb.ToString(), pdfDoc, converterProperties);
        }

        return File(ms.ToArray(), "application/pdf", $"{reportTitle.Replace(" ", "_")}_{DateTime.UtcNow:yyyyMMdd}.pdf");
    }
}