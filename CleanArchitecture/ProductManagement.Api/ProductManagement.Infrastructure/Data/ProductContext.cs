using Microsoft.EntityFrameworkCore;
using ProductManagement.Domain.Models;

namespace ProductManagement.Infrastructure.Data
{
    public class ProductContext : DbContext
    {
        public ProductContext(DbContextOptions<ProductContext> options)
            : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure the primary key
            modelBuilder.Entity<Product>().HasKey(p => p.ID);

            // Configure column properties
            modelBuilder.Entity<Product>().Property(p => p.ProductName).IsRequired().HasMaxLength(200);
            modelBuilder.Entity<Product>().Property(p => p.Description).IsRequired().HasMaxLength(200);
            modelBuilder.Entity<Product>().Property(p => p.Price).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Product>().Property(p => p.UpdatedBy).IsRequired().HasMaxLength(100);
            modelBuilder.Entity<Product>().Property(p => p.UpdatedOn).IsRequired().HasMaxLength(100);

            base.OnModelCreating(modelBuilder);
        }
    }
}
