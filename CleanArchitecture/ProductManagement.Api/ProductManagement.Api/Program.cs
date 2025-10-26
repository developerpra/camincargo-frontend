using Microsoft.EntityFrameworkCore;
using ProductManagement.Application.Helper;
using ProductManagement.Application.Interfaces;
using ProductManagement.Application.Services;
using ProductManagement.Domain.Interfaces;
using ProductManagement.Domain.Models;
using ProductManagement.Infrastructure.Data;
using ProductManagement.Infrastructure.Repositories; // Assuming Repository<T> is here

var builder = WebApplication.CreateBuilder(args);
// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("dev",
        policy =>
        {
            policy.WithOrigins("*")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddControllers();

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ Register application and repository services here
builder.Services.AddScoped<IProductAppService, ProductAppService>();
builder.Services.AddScoped<IRepository<Product>, Repository<ProductContext, Product>>();
builder.Services.AddScoped<ResponseHelper>();

// ✅ Register EF Core DbContext
builder.Services.AddDbContext<ProductContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ProductAppConn")));

var app = builder.Build();
app.UseCors("dev");
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();
app.Run();
