using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using PRS.Backend.Data;
using PRS.Backend.Helpers;
using PRS.Backend.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// ---- Database ----
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---- Application services ----
builder.Services.AddScoped<IActiveDirectoryService, ActiveDirectoryService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
builder.Services.AddScoped<RubricCalculatorService>();
builder.Services.AddScoped<JwtHelper>();
builder.Services.AddSingleton<MicrosoftTokenValidator>();

// ---- JWT Authentication ----
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured. Set it via user-secrets or appsettings.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "PRS.Backend";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "PRS.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization();

// ---- CORS (adjust origin to match your client's dev URL) ----
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCors", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? ["https://localhost:5173"])
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // Only force HTTPS outside development — in dev this was breaking
    // plain http:// links (e.g. to uploaded files) with failed redirects.
    app.UseHttpsRedirection();
}

app.UseCors("DefaultCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapDefaultEndpoints();

// ---- Static file serving ----

// Default wwwroot static files (if you use any, e.g. a favicon, default assets).
app.UseStaticFiles();

// Serve uploaded proposal/ethics files from the configured Uploads folder.
// FileUpload:BasePath in appsettings.json is relative to the content root
// (the folder containing this Program.cs / the published app), NOT wwwroot —
// UseFileServer() alone only looks in wwwroot, which is why files 404'd before.
var uploadsBasePath = builder.Configuration["FileUpload:BasePath"] ?? "Uploads";
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, uploadsBasePath);

// Make sure the folder exists so PhysicalFileProvider doesn't throw on startup
// if nothing has been uploaded yet.
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/Uploads"
});

app.Run();