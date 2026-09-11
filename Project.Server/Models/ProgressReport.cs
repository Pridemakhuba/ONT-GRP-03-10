using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PRS.Backend.Models;

public class ProgressReport
{
    [Key]
    public int ProgressReportID { get; set; }
    public int StudentID { get; set; }
    public int SupervisorID { get; set; }
    public int AcademicYear { get; set; }
    public string? ProgressStatus { get; set; }
    public DateTime? AnticipatedCompletionDate { get; set; }
    public string? StandingStatus { get; set; }
    public string? Comments { get; set; }
    public DateTime SubmittedDate { get; set; } = DateTime.UtcNow;

    [ForeignKey("StudentID")]
    public Student? Student { get; set; }

    [ForeignKey("SupervisorID")]
    public Supervisor? Supervisor { get; set; }
}