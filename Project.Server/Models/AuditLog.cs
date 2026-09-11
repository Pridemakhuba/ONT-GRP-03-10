// PRS.Backend/Models/AuditLog.cs
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.Models;

public class AuditLog
{
    public int AuditID { get; set; }
    public int UserID { get; set; }

    [Required, MaxLength(100)]
    public string Action { get; set; } = string.Empty; // Login, ProposalSubmitted, ProposalApproved, etc.

    [MaxLength(500)]
    public string? Details { get; set; }

    public string? EntityType { get; set; } // Proposal, User, Evaluation, etc.
    public int? EntityID { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
