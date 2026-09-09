using CoreBackend; 
using CoreBackend.Interfaces;
using Microsoft.EntityFrameworkCore;
using NpiqBackend;

var builder = WebApplication.CreateBuilder(args);

// Add framework services
builder.Services.AddRazorPages();
builder.Services.AddControllers();

// register CoreBackend API
builder.Services.AddCoreBackend();
builder.Services.AddNpiqBackend();


var app = builder.Build();

// error pages, HSTS, etc.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// disable caching for live reload / debugging
app.Use(async (context, next) =>
{
    context.Response.Headers["Cache-Control"] = "no-cache, no-store";
    await next();
});

// static files → routing → auth → endpoints
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapNpiqEndpoints();
app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}"
);

app.MapRazorPages();

app.MapFallbackToPage("/Stethoscope");

app.Run();
