// ============================================================
// PRS.Backend/Data/ApplicationDbContext.cs
// Entity Framework Core database context
// ============================================================
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Models;

namespace PRS.Backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // ---- DbSets (maps to SQL tables) ----
    public DbSet<User> Users { get; set; }
    public DbSet<Student> Students { get; set; }
    public DbSet<Supervisor> Supervisors { get; set; }
    public DbSet<StudentSupervisor> StudentSupervisors { get; set; }
    public DbSet<Proposal> Proposals { get; set; }
    public DbSet<ProposalEvaluator> ProposalEvaluators { get; set; }
    public DbSet<EvaluationRubric> EvaluationRubrics { get; set; }
    public DbSet<EthicsCertificate> EthicsCertificates { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<ADImportLog> ADImportLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ---- User ----
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserID);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.ADUsername).IsUnique();
            entity.Property(u => u.Role).HasDefaultValue("Student");
            entity.Property(u => u.IsActive).HasDefaultValue(true);
            entity.Property(u => u.CreatedDate).HasDefaultValueSql("GETDATE()");
            // Restrict role values
            entity.ToTable(tb => tb.HasCheckConstraint(
                "CK_Users_Role", "Role IN ('Student','Supervisor','Evaluator','Admin')"));
        });

        // ---- Student ----
        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(s => s.StudentID);
            entity.HasIndex(s => s.StudentNumber).IsUnique();
            entity.HasIndex(s => s.UserID).IsUnique();
            entity.HasOne(s => s.User)
                  .WithOne(u => u.Student)
                  .HasForeignKey<Student>(s => s.UserID)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Supervisor ----
        modelBuilder.Entity<Supervisor>(entity =>
        {
            entity.HasKey(s => s.SupervisorID);
            entity.HasIndex(s => s.UserID).IsUnique();
            entity.HasOne(s => s.User)
                  .WithOne(u => u.Supervisor)
                  .HasForeignKey<Supervisor>(s => s.UserID)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- StudentSupervisor (junction) ----
        modelBuilder.Entity<StudentSupervisor>(entity =>
        {
            entity.HasKey(ss => ss.StudentSupervisorID);
            entity.HasIndex(ss => new { ss.StudentID, ss.SupervisorID }).IsUnique();
            entity.HasOne(ss => ss.Student)
                  .WithMany(s => s.StudentSupervisors)
                  .HasForeignKey(ss => ss.StudentID)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(ss => ss.Supervisor)
                  .WithMany(s => s.StudentSupervisors)
                  .HasForeignKey(ss => ss.SupervisorID)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Proposal ----
        modelBuilder.Entity<Proposal>(entity =>
        {
            entity.HasKey(p => p.ProposalID);
            entity.Property(p => p.Status).HasDefaultValue("Draft");
            entity.Property(p => p.SupervisorSigned).HasDefaultValue(false);
            entity.Property(p => p.CreatedDate).HasDefaultValueSql("GETDATE()");
            entity.ToTable(tb => tb.HasCheckConstraint(
                "CK_Proposals_Status",
                "Status IN ('Draft','Submitted','UnderReview','Accepted','Rejected','Revised')"));
            entity.HasOne(p => p.Student)
                  .WithMany(s => s.Proposals)
                  .HasForeignKey(p => p.StudentID)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- ProposalEvaluator ----
        modelBuilder.Entity<ProposalEvaluator>(entity =>
        {
            entity.HasKey(pe => pe.ProposalEvaluatorID);
            entity.HasIndex(pe => new { pe.ProposalID, pe.EvaluatorID }).IsUnique();
            entity.HasOne(pe => pe.Proposal)
                  .WithMany(p => p.AssignedEvaluators)
                  .HasForeignKey(pe => pe.ProposalID)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(pe => pe.Evaluator)
                  .WithMany(s => s.AssignedEvaluations)
                  .HasForeignKey(pe => pe.EvaluatorID)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- EvaluationRubric ----
        modelBuilder.Entity<EvaluationRubric>(entity =>
        {
            entity.HasKey(e => e.RubricID);
            entity.HasIndex(e => new { e.ProposalID, e.EvaluatorID }).IsUnique();
            entity.Property(e => e.TotalScore).HasColumnType("decimal(5,2)");
            entity.Property(e => e.SubmittedDate).HasDefaultValueSql("GETDATE()");
            entity.HasOne(e => e.Proposal)
                  .WithMany(p => p.Evaluations)
                  .HasForeignKey(e => e.ProposalID)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Evaluator)
                  .WithMany(s => s.Evaluations)
                  .HasForeignKey(e => e.EvaluatorID)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- EthicsCertificate ----
        modelBuilder.Entity<EthicsCertificate>(entity =>
        {
            entity.HasKey(e => e.EthicsID);
            entity.Property(e => e.UploadedDate).HasDefaultValueSql("GETDATE()");
            entity.HasOne(e => e.Proposal)
                  .WithMany(p => p.EthicsCertificates)
                  .HasForeignKey(e => e.ProposalID)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Notification ----
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.NotificationID);
            entity.Property(n => n.IsRead).HasDefaultValue(false);
            entity.Property(n => n.CreatedDate).HasDefaultValueSql("GETDATE()");
            entity.HasOne(n => n.User)
                  .WithMany(u => u.Notifications)
                  .HasForeignKey(n => n.UserID)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- AuditLog ----
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.AuditID);
            entity.Property(a => a.Timestamp).HasDefaultValueSql("GETDATE()");
            entity.HasOne(a => a.User)
                  .WithMany(u => u.AuditLogs)
                  .HasForeignKey(a => a.UserID)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- ADImportLog ----
        modelBuilder.Entity<ADImportLog>(entity =>
        {
            entity.HasKey(a => a.ImportID);
            entity.Property(a => a.ImportDate).HasDefaultValueSql("GETDATE()");
        });
    }
}