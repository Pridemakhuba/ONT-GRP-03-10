// ============================================================
// PRS.Backend/Controllers/EthicsCertificatesController.cs
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
[Route("api/ethics-certificates")]
[Authorize]
public class EthicsCertificatesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IFileUploadService _files;

    public EthicsCertificatesController(ApplicationDbContext db, IFileUploadService files)
    {
        _db = db;
        _files = files;
    }

    [HttpPost]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Upload([FromForm] UploadEthicsDto dto, [FromForm] int proposalId, IFormFile certificate)
    {
        if (certificate == null)
            return BadRequest(new { message = "Certificate file is required" });

        var proposal = await _db.Proposals.FindAsync(proposalId);
        if (proposal == null) return NotFound(new { message = "Proposal not found" });

        var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        var student = await _db.Students.FirstOrDefaultAsync(s => s.UserID == userId);
        if (student == null || proposal.StudentID != student.StudentID)
            return Forbid();

        string certPath;
        try { certPath = await _files.UploadEthicsCertificateAsync(certificate, proposalId); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }

        var ethics = new EthicsCertificate
        {
            ProposalID = proposalId,
            CertificatePath = certPath,
            CertificateNumber = dto.CertificateNumber,
            IssuedDate = dto.IssuedDate,
            ExpiryDate = dto.ExpiryDate
        };
        _db.EthicsCertificates.Add(ethics);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByProposal), new { proposalId }, ToDto(ethics));
    }

    [HttpGet("proposal/{proposalId}")]
    public async Task<IActionResult> GetByProposal(int proposalId)
    {
        var certs = await _db.EthicsCertificates
            .Where(e => e.ProposalID == proposalId)
            .OrderByDescending(e => e.UploadedDate)
            .ToListAsync();
        return Ok(certs.Select(ToDto));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Student,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var cert = await _db.EthicsCertificates.FindAsync(id);
        if (cert == null) return NotFound();

        _files.DeleteFile(cert.CertificatePath);
        _db.EthicsCertificates.Remove(cert);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static EthicsCertificateDto ToDto(EthicsCertificate e) => new()
    {
        EthicsID = e.EthicsID,
        ProposalID = e.ProposalID,
        CertificatePath = e.CertificatePath,
        CertificateNumber = e.CertificateNumber,
        IssuedDate = e.IssuedDate,
        ExpiryDate = e.ExpiryDate,
        UploadedDate = e.UploadedDate
    };
}