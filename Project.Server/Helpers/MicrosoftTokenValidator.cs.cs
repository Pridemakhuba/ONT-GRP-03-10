using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace PRS.Backend.Helpers;

public class MicrosoftTokenValidator
{
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private readonly string _clientId;
    private readonly string _tenantId;

    public MicrosoftTokenValidator(IConfiguration config)
    {
        _tenantId = config["AzureAd:TenantId"]!;
        _clientId = config["AzureAd:ClientId"]!;
        var metadataAddress = $"https://login.microsoftonline.com/{_tenantId}/v2.0/.well-known/openid-configuration";
        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress, new OpenIdConnectConfigurationRetriever());
    }

    public async Task<ClaimsPrincipal> ValidateTokenAsync(string idToken)
    {
        var config = await _configManager.GetConfigurationAsync();
        var handler = new JwtSecurityTokenHandler();

        var validationParams = new TokenValidationParameters
        {
            ValidIssuer = config.Issuer,
            ValidAudience = _clientId,
            IssuerSigningKeys = config.SigningKeys,
            ValidateLifetime = true
        };

        return handler.ValidateToken(idToken, validationParams, out _);
    }
}