// ============================================================
// PRS.Backend/Models/User.cs
// Entity representing an authenticated university user
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.Models;

public class User
{
    public int UserID { get; set; }

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Department { get; set; }

    [Required, MaxLength(50)]
    public string Role { get; set; } = "Student"; // Student | Supervisor | Evaluator | Admin

    [Required, MaxLength(100)]
    public string ADUsername { get; set; } = string.Empty; // sAMAccountName from AD

    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginDate { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }

    // Navigation
    public Student? Student { get; set; }
    public Supervisor? Supervisor { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public string FullName => $"{FirstName} {LastName}";
    public string PasswordHash { get; set; } = string.Empty;
}