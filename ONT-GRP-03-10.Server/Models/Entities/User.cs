/*
 * ============================================================
 * FILE: Models/User.cs
 * STEP: 1B — User Entity
 * ============================================================
 * Represents a system login account.
 * Every person who can log into PGRS has a User record.
 *
 * RELATIONSHIPS:
 *   User (1) ──── (0..1) Student         via AssociatedStudentID
 *   User (1) ──── (many) Notification    via RecipientUserID
 *   User (1) ──── (many) AuditLog        via UserID
 *   User (1) ──── (many) SupervisorAssignment (as supervisor)
 *   User (1) ──── (many) ProposalReview  (as evaluator)
 *   User (1) ──── (many) ProgressReport  (as supervisor)
 *
 * ACTIVE DIRECTORY NOTE:
 *   University staff and students use AuthSource = ActiveDirectory.
 *   Their PasswordHash is still populated as a fallback for dev/demo.
 *   External evaluators use AuthSource = Local with a local password.
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PGRS.Api.Models;

public class User
{
    // ── Primary Key ──────────────────────────────────────────────────────────
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int UserID { get; set; }

    // ── Login Credentials ────────────────────────────────────────────────────

    /// <summary>University username e.g. "s225569248" or "l.futcher"</summary>
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// BCrypt hashed password. Used as fallback when LDAP is unavailable.
    /// Never store plain-text passwords.
    /// </summary>
    public string? PasswordHash { get; set; }

    /// <summary>University email address</summary>
    [Required]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    // ── Role & Auth Source ───────────────────────────────────────────────────

    /// <summary>Determines what the user can see and do in the system</summary>
    public UserRole Role { get; set; }

    /// <summary>Whether this user authenticates via AD or local password</summary>
    public AuthSource AuthSource { get; set; } = AuthSource.Local;

    // ── Links to Domain Records ──────────────────────────────────────────────

    /// <summary>
    /// Set when Role = Student. Links this user account to the Student record.
    /// Null for staff/admin users.
    /// </summary>
    public int? AssociatedStudentID { get; set; }

    // ── Security & Session Management ────────────────────────────────────────

    public DateTime? LastLoginDate { get; set; }
    public string? LastLoginIP { get; set; }

    /// <summary>
    /// Incremented on each failed login attempt.
    /// Reset to 0 on successful login.
    /// Account locks after reaching 5 (see AccountLockedUntil).
    /// </summary>
    public int FailedLoginAttempts { get; set; } = 0;

    /// <summary>
    /// If set and in the future, the account is locked.
    /// Set to UtcNow + 30 minutes after 5 failed attempts.
    /// </summary>
    public DateTime? AccountLockedUntil { get; set; }

    public DateTime? PasswordLastChanged { get; set; }

    /// <summary>
    /// Forces password change on next login.
    /// Set to true when admin creates an account with a temporary password.
    /// </summary>
    public bool RequiresPasswordChange { get; set; } = true;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties (EF Core relationships) ────────────────────────

    /// <summary>The student record linked to this user (if Role = Student)</summary>
    [ForeignKey("AssociatedStudentID")]
    public Student? Student { get; set; }

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}