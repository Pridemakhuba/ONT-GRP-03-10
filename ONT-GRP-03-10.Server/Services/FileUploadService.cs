using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PRS.Backend.Services;

public class FileUploadService : IFileUploadService
{
    private readonly IConfiguration _config;
    private readonly ILogger<FileUploadService> _logger;
    private readonly IWebHostEnvironment _env;

    private long MaxBytes => (long)((double)(_config.GetValue<int>("FileUpload:MaxFileSizeMB", 20)) * 1024 * 1024);
    private string[] AllowedExt => _config.GetSection("FileUpload:AllowedExtensions").Get<string[]>() ?? new[] { ".pdf", ".docx" };

    public FileUploadService(IConfiguration config, ILogger<FileUploadService> logger, IWebHostEnvironment env)
    {
        _config = config;
        _logger = logger;
        _env = env;
    }

    public async Task<string> UploadProposalAsync(IFormFile file, int proposalId)
        => await SaveFileAsync(file, $"proposals/{proposalId}");

    public async Task<string> UploadEthicsCertificateAsync(IFormFile file, int proposalId)
        => await SaveFileAsync(file, $"ethics/{proposalId}");

    public async Task<string> UploadEvaluationDocumentAsync(IFormFile file, int rubricId)
        => await SaveFileAsync(file, $"evaluations/{rubricId}");

    public bool DeleteFile(string filePath)
    {
        try
        {
            var fullPath = Path.Combine(_env.ContentRootPath, filePath);
            if (File.Exists(fullPath)) { File.Delete(fullPath); return true; }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file: {Path}", filePath);
            return false;
        }
    }

    private async Task<string> SaveFileAsync(IFormFile file, string subFolder)
    {
        if (file.Length > MaxBytes)
            throw new InvalidOperationException($"File exceeds maximum size of {MaxBytes / 1024 / 1024}MB");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExt.Contains(ext))
            throw new InvalidOperationException($"File type '{ext}' is not allowed. Allowed: {string.Join(", ", AllowedExt)}");

        var basePath = _config["FileUpload:BasePath"] ?? "Uploads";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var safeFileName = $"{timestamp}_{Path.GetFileNameWithoutExtension(file.FileName).Replace(" ", "_")}{ext}";
        var relativePath = Path.Combine(basePath, subFolder, safeFileName);
        var fullPath = Path.Combine(_env.ContentRootPath, relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        _logger.LogInformation("File saved: {Path}", relativePath);
        return relativePath;
    }
}