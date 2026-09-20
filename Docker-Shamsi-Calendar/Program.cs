using Docker_Shamsi_Calendar.Endpoints;
using Docker_Shamsi_Calendar.Services;


var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:8080");

builder.Services.AddSingleton<DatabaseService>();
builder.Services.AddHostedService<TimeIrScraperService>();

var app = builder.Build();

app.Services.GetRequiredService<DatabaseService>().InitDb();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapEventEndpoints();

await app.RunAsync();