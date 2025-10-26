using Microsoft.EntityFrameworkCore;
using CustomerManagement.Application.Helper;
using CustomerManagement.Application.Interfaces;
using CustomerManagement.Application.Services;
using CustomerManagement.Domain.Interfaces;
using CustomerManagement.Domain.Models;
using CustomerManagement.Infrastructure.Data;
using CustomerManagement.Infrastructure.Repositories; // Assuming Repository<T> is here

var builder = WebApplication.CreateBuilder(args);
//// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("dev",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// ✅ Register application and repository services here
builder.Services.AddScoped<ICustomerAppService, CustomerAppService>();
builder.Services.AddScoped<IRepository<Customer>, Repository<CustomerContext, Customer>>();
builder.Services.AddScoped<ResponseHelper>();

// ✅ Register EF Core DbContext
builder.Services.AddDbContext<CustomerContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("CustomerAppConn")));

var app = builder.Build();
//app.UseCors("dev");
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
