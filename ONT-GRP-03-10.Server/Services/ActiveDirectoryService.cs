using Novell.Directory.Ldap;
using PRS.Backend.DTOs;

namespace PRS.Backend.Services;

public class ActiveDirectoryService : IActiveDirectoryService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ActiveDirectoryService> _logger;

    private string LdapPath => _config["LDAP:Path"] ?? "LDAP://localhost";
    private string SearchBase => _config["LDAP:SearchBase"] ?? "OU=Users,DC=university,DC=ac,DC=za";
    private string Domain => _config["LDAP:Domain"] ?? "university";
    private string LdapHost => ExtractHost(LdapPath);
    private int LdapPort => 389;

    public ActiveDirectoryService(IConfiguration config, ILogger<ActiveDirectoryService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<bool> ValidateCredentialsAsync(string username, string password)
    {
        return await Task.Run(() =>
        {
            try
            {
                var cleanUsername = StripDomain(username);
                var bindDn = $"{cleanUsername}@{Domain}.ac.za";

                var conn = new LdapConnection();
                try
                {
                    conn.Connect(LdapHost, LdapPort);
                    conn.Bind(bindDn, password);
                    
                    var isBound = conn.Bound;
                    _logger.LogInformation("AD bind result for {Username}: {Bound}", cleanUsername, isBound);
                    return isBound;
                }
                finally
                {
                    try { conn.Disconnect(); } catch { }
                }
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

    public async Task<ADUserDto?> GetUserFromADAsync(string username, string password)
    {
        return await Task.Run(() =>
        {
            try
            {
                var cleanUsername = StripDomain(username);
                var filter = $"(sAMAccountName={EscapeLdapFilter(cleanUsername)})";
                var bindDn = $"{cleanUsername}@{Domain}.ac.za";

                var conn = new LdapConnection();
                try
                {
                    conn.Connect(LdapHost, LdapPort);
                    conn.Bind(bindDn, password);

                    var attrs = new[] { "sAMAccountName", "givenName", "sn", "mail", "department", "title", "userPrincipalName" };
                    var results = conn.Search(SearchBase, LdapConnection.SCOPE_SUB, filter, attrs, false);

                    if (results.hasMore())
                    {
                        var entry = results.next();
                        return MapToADUserDto(entry);
                    }
                    else
                    {
                        _logger.LogWarning("User {Username} not found in AD search", cleanUsername);
                    }
                    
                    return null;
                }
                finally
                {
                    try { conn.Disconnect(); } catch { }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching AD user: {Username}", username);
                return null;
            }
        });
    }

    public async Task<List<ADUserDto>> SearchUsersAsync(string searchTerm)
    {
        return await Task.Run(() =>
        {
            var users = new List<ADUserDto>();
            try
            {
                var escaped = EscapeLdapFilter(searchTerm);
                var filter = $"(|(sAMAccountName=*{escaped}*)(givenName=*{escaped}*)(sn=*{escaped}*)(mail=*{escaped}*))";

                var conn = new LdapConnection();
                try
                {
                    conn.Connect(LdapHost, LdapPort);
                    
                    // Try anonymous bind - if it fails, we catch and return empty
                    try 
                    { 
                        conn.Bind("", ""); 
                    }
                    catch (LdapException ex)
                    {
                        _logger.LogWarning("AD anonymous bind failed for search: {Message}. Searches require authenticated bind.", ex.Message);
                        return users; // Return empty - anonymous search not allowed
                    }

                    var attrs = new[] { "sAMAccountName", "givenName", "sn", "mail", "department", "title" };
                    var results = conn.Search(SearchBase, LdapConnection.SCOPE_SUB, filter, attrs, false);

                    while (results.hasMore())
                    {
                        try
                        {
                            var entry = results.next();
                            var dto = MapToADUserDto(entry);
                            if (dto != null) users.Add(dto);
                        }
                        catch (LdapReferralException) { /* skip referrals */ }
                        catch (LdapException) { break; } // Stop on search errors
                    }
                }
                finally
                {
                    try { conn.Disconnect(); } catch { }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching AD: {Term}", searchTerm);
            }
            return users;
        });
    }

    private static ADUserDto? MapToADUserDto(LdapEntry entry)
    {
        try
        {
            var adUsername = GetAttr(entry, "sAMAccountName");
            
            return new ADUserDto
            {
                ADUsername = adUsername,
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
        try
        {
            var attribute = entry.getAttribute(attr);
            return attribute?.StringValue ?? string.Empty;
        }
        catch { return string.Empty; }
    }

    private static string StripDomain(string username) =>
        username.Contains('\\') ? username.Split('\\', 2)[1] : username;

    private static string ExtractHost(string ldapPath) =>
        ldapPath.Replace("LDAP://", "", StringComparison.OrdinalIgnoreCase)
                .Replace("LDAPS://", "", StringComparison.OrdinalIgnoreCase)
                .TrimEnd('/');

    private static string EscapeLdapFilter(string value) =>
        value.Replace("\\", "\\5c")
             .Replace("*", "\\2a")
             .Replace("(", "\\28")
             .Replace(")", "\\29")
             .Replace("\0", "\\00");
}