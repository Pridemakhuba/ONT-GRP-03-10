// PRS.Backend/Models/EthicsCertificate.cs
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.Models;

public class EthicsCertificate
{
    public int EthicsID { get; set; }
    public int ProposalID { get; set; }

    [Required, MaxLength(500)]
    public string CertificatePath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? CertificateNumber { get; set; }

    public DateTime IssuedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiryDate { get; set; }
    public DateTime UploadedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Proposal Proposal { get; set; } = null!;
}
