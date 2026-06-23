using PRS.Backend.DTOs;

namespace PRS.Backend.Services;

public interface IActiveDirectoryService
{
    /// <summary>Validates university credentials against Active Directory via LDAP</summary>
    Task<bool> ValidateCredentialsAsync(string username, string password);

    /// <summary>Fetches a user's details from AD by their sAMAccountName</summary>
    Task<ADUserDto?> GetUserFromADAsync(string username);

    /// <summary>Searches AD for users matching a name or username</summary>
    Task<List<ADUserDto>> SearchUsersAsync(string searchTerm);
}