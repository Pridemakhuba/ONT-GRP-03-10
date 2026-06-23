using Microsoft.AspNetCore.Http;

namespace PRS.Backend.Services;

public interface IFileUploadService
{
    Task<string> UploadProposalAsync(IFormFile file, int proposalId);
    Task<string> UploadEthicsCertificateAsync(IFormFile file, int proposalId);
    Task<string> UploadEvaluationDocumentAsync(IFormFile file, int rubricId);
    bool DeleteFile(string filePath);
}