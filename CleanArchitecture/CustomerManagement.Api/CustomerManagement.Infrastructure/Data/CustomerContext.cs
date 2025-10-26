using Microsoft.EntityFrameworkCore;
using CustomerManagement.Domain.Models;

namespace CustomerManagement.Infrastructure.Data
{
    public class CustomerContext : DbContext
    {
        public CustomerContext(DbContextOptions<CustomerContext> options)
            : base(options)
        {
        }

        public DbSet<Customer> Customers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure the primary key
            modelBuilder.Entity<Customer>().HasKey(c => c.ID);

            // Configure column properties (line-by-line as per your style)
            modelBuilder.Entity<Customer>().Property(c => c.CustomerName).IsRequired().HasMaxLength(200);
            modelBuilder.Entity<Customer>().Property(c => c.Email).HasMaxLength(150); // Optional field
            modelBuilder.Entity<Customer>().Property(c => c.PhoneNumber).IsRequired().HasMaxLength(20);
            modelBuilder.Entity<Customer>().Property(c => c.Address).IsRequired().HasMaxLength(300);
            modelBuilder.Entity<Customer>().Property(c => c.UpdatedBy).IsRequired().HasMaxLength(100);
            modelBuilder.Entity<Customer>().Property(c => c.UpdatedOn).IsRequired();

            base.OnModelCreating(modelBuilder);
        }
    }
}
