/*
 * ============================================================
 * FILE: Models/Faculty.cs
 * STEP: 1C — Faculty Entity
 * ============================================================
 * Represents a university faculty (e.g., EBET).
 * Used to group programs and students.
 *
 * RELATIONSHIPS:
 *   Faculty (1) ──── (many) Program
 *   Faculty (1) ──── (many) Student
 * ============================================================
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PGRS.Api.Models;

public class Faculty
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int FacultyID { get; set; }

    /// <summary>Short code e.g. "EBET" — must be unique</summary>
    [Required]
    [MaxLength(20)]
    public string FacultyCode { get; set; } = string.Empty;

    /// <summary>Full faculty name e.g. "Engineering, the Built Environment and Technology"</summary>
    [Required]
    [MaxLength(300)]
    public string FacultyName { get; set; } = string.Empty;

    public string? DeanName { get; set; }

    /// <summary>Soft delete — inactive faculties cannot have new students</summary>
    public bool IsActive { get; set; } = true;

    // ── Navigation Properties ─────────────────────────────────────────────────
    public ICollection<Program> Programs { get; set; } = new List<Program>();
    public ICollection<Student> Students { get; set; } = new List<Student>();
}


/*
 * ============================================================
 * FILE: Models/Program.cs (continued in same file)
 * STEP: 1C — Program Entity
 * ============================================================
 * Represents a postgraduate program (e.g., "MSc IT", "PhD IT").
 *
 * RELATIONSHIPS:
 *   Program (many) ──── (1) Faculty
 *   Program (1)    ──── (many) Student
 *   Program (1)    ──── (many) Milestone (template milestones for this program)
 * ============================================================
 */

public class Program
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ProgramID { get; set; }

    /// <summary>University program code e.g. "75052" — must be unique</summary>
    [Required]
    [MaxLength(20)]
    public string ProgramCode { get; set; } = string.Empty;

    /// <summary>e.g. "Master of Information Technology"</summary>
    [Required]
    [MaxLength(200)]
    public string ProgramName { get; set; } = string.Empty;

    /// <summary>Masters or PhD — determines which milestone templates apply</summary>
    public ProgramType ProgramType { get; set; }

    /// <summary>Normal duration in years e.g. 2.0 for Masters, 4.0 for PhD</summary>
    [Column(TypeName = "decimal(3,1)")]
    public decimal DurationYears { get; set; }

    /// <summary>Foreign key to the Faculty this program belongs to</summary>
    [Required]
    public int FacultyID { get; set; }

    /// <summary>Soft delete — inactive programs cannot enrol new students</summary>
    public bool IsActive { get; set; } = true;

    public string? Description { get; set; }

    // ── Navigation Properties ─────────────────────────────────────────────────
    public Faculty Faculty { get; set; } = null!;
    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Milestone> Milestones { get; set; } = new List<Milestone>();
}