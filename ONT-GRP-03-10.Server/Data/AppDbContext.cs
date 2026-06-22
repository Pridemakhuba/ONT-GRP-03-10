

using Microsoft.EntityFrameworkCore;
using PGRS.Api.Models;

namespace PGRS.Api.Data;

public class AppDbContext : DbContext
{
    // Constructor receives options from Program.cs DI configuration
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── DbSets — one per entity = one table in SQL Server ────────────────────
    // EF Core pluralises these automatically: Users → [Users] table, etc.

    public DbSet<User> Users => Set<User>();
    public DbSet<Faculty> Faculties => Set<Faculty>();
    public DbSet<Program> Programs => Set<Program>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<SupervisorAssignment> SupervisorAssignments => Set<SupervisorAssignment>();
    public DbSet<Proposal> Proposals => Set<Proposal>();
    public DbSet<ProposalReview> ProposalReviews => Set<ProposalReview>();
    public DbSet<EthicsApplication> EthicsApplications => Set<EthicsApplication>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<StudentMilestone> StudentMilestones => Set<StudentMilestone>();
    public DbSet<ProgressReport> ProgressReports => Set<ProgressReport>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ExternalExaminer> ExternalExaminers => Set<ExternalExaminer>();

    // ── Fluent API Configuration ──────────────────────────────────────────────
    // OnModelCreating is where we configure things that can't be done
    // with just data annotations (e.g., unique indexes, cascade rules)
    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── Unique Indexes ────────────────────────────────────────────────────
        // These prevent duplicate records at the database level.

        mb.Entity<User>()
            .HasIndex(u => u.Username).IsUnique()
            .HasDatabaseName("IX_Users_Username");

        mb.Entity<User>()
            .HasIndex(u => u.Email).IsUnique()
            .HasDatabaseName("IX_Users_Email");

        mb.Entity<Faculty>()
            .HasIndex(f => f.FacultyCode).IsUnique()
            .HasDatabaseName("IX_Faculties_FacultyCode");

        mb.Entity<Models.Program>()
            .HasIndex(p => p.ProgramCode).IsUnique()
            .HasDatabaseName("IX_Programs_ProgramCode");

        mb.Entity<Student>()
            .HasIndex(s => s.StudentNumber).IsUnique()
            .HasDatabaseName("IX_Students_StudentNumber");

        mb.Entity<Student>()
            .HasIndex(s => s.IDNumber).IsUnique()
            .HasDatabaseName("IX_Students_IDNumber");

        mb.Entity<Milestone>()
            .HasIndex(m => m.MilestoneCode).IsUnique()
            .HasDatabaseName("IX_Milestones_MilestoneCode");

        mb.Entity<ExternalExaminer>()
            .HasIndex(e => e.Email).IsUnique()
            .HasDatabaseName("IX_ExternalExaminers_Email");

        // ── Relationship: SupervisorAssignment → User (Supervisor) ────────────
        // DeleteBehavior.Restrict = we CANNOT delete a User who has supervisor
        // assignments. This prevents orphaned assignment records.
        mb.Entity<SupervisorAssignment>()
            .HasOne(sa => sa.Supervisor)
            .WithMany()
            .HasForeignKey(sa => sa.SupervisorUserID)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<SupervisorAssignment>()
            .HasOne(sa => sa.Student)
            .WithMany(s => s.SupervisorAssignments)
            .HasForeignKey(sa => sa.StudentID)
            .OnDelete(DeleteBehavior.Cascade);
        // Cascade = deleting a student deletes all their assignments

        // ── Relationship: ProposalReview → User (Evaluator) ──────────────────
        // Restrict = we cannot delete an evaluator User who has reviews.
        mb.Entity<ProposalReview>()
            .HasOne(r => r.Evaluator)
            .WithMany()
            .HasForeignKey(r => r.EvaluatorUserID)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<ProposalReview>()
            .HasOne(r => r.Proposal)
            .WithMany(p => p.Reviews)
            .HasForeignKey(r => r.ProposalID)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Relationship: ProgressReport → User (Supervisor) ─────────────────
        mb.Entity<ProgressReport>()
            .HasOne(r => r.Supervisor)
            .WithMany()
            .HasForeignKey(r => r.SupervisorUserID)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<ProgressReport>()
            .HasOne(r => r.Student)
            .WithMany(s => s.ProgressReports)
            .HasForeignKey(r => r.StudentID)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Relationship: EthicsApplication → User (Reviewer) ────────────────
        // SetNull = if the reviewer user is deleted, set ReviewerUserID to null
        mb.Entity<EthicsApplication>()
            .HasOne(e => e.Reviewer)
            .WithMany()
            .HasForeignKey(e => e.ReviewerUserID)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Relationship: Notification → User (Recipient) ────────────────────
        mb.Entity<Notification>()
            .HasOne(n => n.Recipient)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.RecipientUserID)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Relationship: AuditLog → User ────────────────────────────────────
        // SetNull = if a user is deactivated/removed, preserve the audit log
        mb.Entity<AuditLog>()
            .HasOne(a => a.User)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(a => a.UserID)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Relationship: User → Student ──────────────────────────────────────
        // NoAction = don't cascade in either direction (we manage this manually)
        mb.Entity<User>()
            .HasOne(u => u.Student)
            .WithMany()
            .HasForeignKey(u => u.AssociatedStudentID)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Query Filters (Soft Delete) ───────────────────────────────────────
        // These global filters automatically exclude soft-deleted records
        // from ALL queries unless explicitly overridden with IgnoreQueryFilters()
        mb.Entity<Faculty>().HasQueryFilter(f => f.IsActive);
        mb.Entity<Models.Program>().HasQueryFilter(p => p.IsActive);
        mb.Entity<Milestone>().HasQueryFilter(m => m.IsActive);

        // NOTE: Students are NOT filtered by IsActive because we still need
        // to query withdrawn/graduated students in reports.
        // Filter by Status == StudentStatus.Active in service layer instead.

        // ── Table Names (explicit, matching university naming convention) ──────
        mb.Entity<Faculty>().ToTable("Faculties");
        mb.Entity<Models.Program>().ToTable("Programs");
        mb.Entity<Student>().ToTable("Students");
        mb.Entity<User>().ToTable("Users");
        mb.Entity<SupervisorAssignment>().ToTable("SupervisorAssignments");
        mb.Entity<Proposal>().ToTable("Proposals");
        mb.Entity<ProposalReview>().ToTable("ProposalReviews");
        mb.Entity<EthicsApplication>().ToTable("EthicsApplications");
        mb.Entity<Milestone>().ToTable("Milestones");
        mb.Entity<StudentMilestone>().ToTable("StudentMilestones");
        mb.Entity<ProgressReport>().ToTable("ProgressReports");
        mb.Entity<Notification>().ToTable("Notifications");
        mb.Entity<Document>().ToTable("Documents");
        mb.Entity<AuditLog>().ToTable("AuditLogs");
        mb.Entity<ExternalExaminer>().ToTable("ExternalExaminers");
    }
}