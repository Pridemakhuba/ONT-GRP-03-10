// PRS.Backend/Models/Notification.cs
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.Models;

public class Notification
{
    public int NotificationID { get; set; }
    public int UserID { get; set; }

    [Required, MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Type { get; set; } = string.Empty; // ProposalSubmitted, RevisionRequired, EvaluationComplete, etc.

    public bool IsRead { get; set; } = false;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
