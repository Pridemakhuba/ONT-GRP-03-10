// PRS.Backend/Models/ADImportLog.cs
// ============================================================
using System.ComponentModel.DataAnnotations;

namespace PRS.Backend.Models;

public class ADImportLog
{
    public int ImportID { get; set; }

    [MaxLength(200)]
    public string? ADUsername { get; set; }

    [MaxLength(100)]
    public string? Action { get; set; } // Imported, Updated, Failed

    [MaxLength(500)]
    public string? Details { get; set; }

    public DateTime ImportDate { get; set; } = DateTime.UtcNow;
}
