
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add ocelot.json configuration file
builder.Configuration.AddJsonFile("ocelot.json");

// Add Ocelot services
builder.Services.AddOcelot();

// Add CORS policy for React dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("dev", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
    );
});

var app = builder.Build();

app.MapGet("/", () => "API Gateway is running...");

// Use CORS middleware before Ocelot middleware
app.UseCors("dev");

// Use Ocelot middleware
await app.UseOcelot();

app.Run();
