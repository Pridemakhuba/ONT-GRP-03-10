// ============================================================
// PRS.Backend/Services/IActiveDirectoryService.cs
// ============================================================
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

// ============================================================
// PRS.Backend/Services/ActiveDirectoryService.cs
// LDAP integration using Novell.Directory.Ldap (cross-platform)
// ============================================================
using Novell.Directory.Ldap;

namespace PRS.Backend.Services;

public class ActiveDirectoryService : IActiveDirectoryService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ActiveDirectoryService> _logger;

    // LDAP config keys from appsettings.json
    private string LdapPath => _config["LDAP:Path"] ?? "LDAP://localhost";
    private string SearchBase => _config["LDAP:SearchBase"] ?? "OU=Users,DC=university,DC=ac,DC=za";
    private string Domain => _config["LDAP:Domain"] ?? "university";
    private string LdapHost => ExtractHost(LdapPath);
    private int LdapPort => 389; // Standard LDAP port (636 for LDAPS)

    public ActiveDirectoryService(IConfiguration config, ILogger<ActiveDirectoryService> logger)
    {
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Validates credentials by attempting an LDAP bind.
    /// Returns true if AD accepts the username+password.
    /// </summary>
    public async Task<bool> ValidateCredentialsAsync(string username, string password)
    {
        return await Task.Run(() =>
        {
            try
            {
                // Strip domain prefix if provided (university\username → username)
                var cleanUsername = StripDomain(username);
                // AD bind DN format: domain\username
                var bindDn = $"{Domain}\\{cleanUsername}";

                using var conn = new LdapConnection();
                conn.Connect(LdapHost, LdapPort);
                conn.Bind(bindDn, password);
                return conn.Bound;
            }
            catch (LdapException ex)
            {
                _logger.LogWarning("LDAP auth failed for {Username}: {Message}", username, ex.Message);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LDAP connection error for {Username}", username);
                return false;
            }
        });
    }

    /// <summary>
    /// Retrieves user attributes from AD after authentication succeeds.
    /// Uses a service account bind if available, or falls back to anonymous search.
    /// </summary>
    public async Task<ADUserDto?> GetUserFromADAsync(string username)
    {
        return await Task.Run(() =>
        {
            try
            {
                var cleanUsername = StripDomain(username);
                var filter = $"(sAMAccountName={EscapeLdapFilter(cleanUsername)})";

                using var conn = new LdapConnection();
                conn.Connect(LdapHost, LdapPort);
                // Anonymous bind for search (configure service account in production)
                conn.Bind("", "");

                var attrs = new[] { "sAMAccountName", "givenName", "sn", "mail", "department", "title" };
                var results = conn.Search(SearchBase, LdapConnection.ScopeOnelevel, filter, attrs, false);

                if (results.HasMore())
                {
                    var entry = results.Next();
                    return MapToADUserDto(entry);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching AD user: {Username}", username);
            }

            return null;
        });
    }

    /// <summary>Searches AD for users matching a search term (name or username)</summary>
    public async Task<List<ADUserDto>> SearchUsersAsync(string searchTerm)
    {
        return await Task.Run(() =>
        {
            var users = new List<ADUserDto>();
            try
            {
                var escaped = EscapeLdapFilter(searchTerm);
                // Search across display name, first name, last name, and username
                var filter = $"(|(sAMAccountName=*{escaped}*)(givenName=*{escaped}*)(sn=*{escaped}*)(mail=*{escaped}*))";

                using var conn = new LdapConnection();
                conn.Connect(LdapHost, LdapPort);
                conn.Bind("", "");

                var attrs = new[] { "sAMAccountName", "givenName", "sn", "mail", "department", "title" };
                var results = conn.Search(SearchBase, LdapConnection.ScopeOnelevel, filter, attrs, false);

                while (results.HasMore())
                {
                    try
                    {
                        var entry = results.Next();
                        var dto = MapToADUserDto(entry);
                        if (dto != null) users.Add(dto);
                    }
                    catch (LdapReferralException) { /* skip referrals */ }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching AD: {Term}", searchTerm);
            }

            return users;
        });
    }

    // ---- Private helpers ----

    private static ADUserDto? MapToADUserDto(LdapEntry entry)
    {
        try
        {
            return new ADUserDto
            {
                ADUsername = GetAttr(entry, "sAMAccountName"),
                FirstName = GetAttr(entry, "givenName"),
                LastName = GetAttr(entry, "sn"),
                Email = GetAttr(entry, "mail"),
                Department = GetAttr(entry, "department"),
                Title = GetAttr(entry, "title")
            };
        }
        catch { return null; }
    }

    private static string GetAttr(LdapEntry entry, string attr)
    {
        try { return entry.GetAttribute(attr)?.StringValue ?? string.Empty; }
        catch { return string.Empty; }
    }

    /// <summary>Strips domain prefix: "university\john" → "john"</summary>
    private static string StripDomain(string username) =>
        username.Contains('\\') ? username.Split('\\', 2)[1] : username;

    /// <summary>Extracts hostname from LDAP URL: "LDAP://server.domain.com" → "server.domain.com"</summary>
    private static string ExtractHost(string ldapPath) =>
        ldapPath.Replace("LDAP://", "", StringComparison.OrdinalIgnoreCase)
                .Replace("LDAPS://", "", StringComparison.OrdinalIgnoreCase)
                .TrimEnd('/');

    /// <summary>Escapes special characters in LDAP filter values</summary>
    private static string EscapeLdapFilter(string value) =>
        value.Replace("\\", "\\5c").Replace("*", "\\2a")
             .Replace("(", "\\28").Replace(")", "\\29").Replace("\0", "\\00");
}