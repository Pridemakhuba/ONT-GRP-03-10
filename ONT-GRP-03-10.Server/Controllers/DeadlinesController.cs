using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PRS.Backend.Data;
using PRS.Backend.Models;

namespace PRS.Backend.Controllers;

[ApiController]
[Route("api/deadlines")]
[Authorize]
public class DeadlinesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public DeadlinesController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var deadlines = await _db.Deadlines.OrderBy(d => d.DueDate).ToListAsync();
        return Ok(deadlines);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var deadlines = await _db.Deadlines
            .Where(d => d.IsActive && d.DueDate > DateTime.UtcNow)
            .OrderBy(d => d.DueDate)
            .ToListAsync();
        return Ok(deadlines);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Deadline deadline)
    {
        var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        deadline.CreatedBy = userId;
        deadline.CreatedDate = DateTime.UtcNow;
        _db.Deadlines.Add(deadline);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = deadline.DeadlineID }, deadline);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Deadline dto)
    {
        var deadline = await _db.Deadlines.FindAsync(id);
        if (deadline == null) return NotFound();
        
        deadline.Name = dto.Name;
        deadline.Description = dto.Description;
        deadline.DeadlineType = dto.DeadlineType;
        deadline.DueDate = dto.DueDate;
        deadline.IsActive = dto.IsActive;
        deadline.UpdatedDate = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
        return Ok(deadline);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deadline = await _db.Deadlines.FindAsync(id);
        if (deadline == null) return NotFound();
        _db.Deadlines.Remove(deadline);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Deadline deleted" });
    }
}