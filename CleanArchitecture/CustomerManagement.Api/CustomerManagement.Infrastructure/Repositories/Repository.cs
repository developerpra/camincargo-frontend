using Microsoft.EntityFrameworkCore;
using CustomerManagement.Domain.Interfaces;

namespace CustomerManagement.Infrastructure.Repositories
{
    public class Repository<TContext, TEntity> : IRepository<TEntity>
        where TContext : DbContext
        where TEntity : class
    {
        private readonly TContext _context;
        private readonly DbSet<TEntity> _dbSet;

        public Repository(TContext context)
        {
            _context = context;
            _dbSet = _context.Set<TEntity>();
        }

        public IQueryable<TEntity> GetAll() => _dbSet;

        public void Add(TEntity entity) => _dbSet.Add(entity);

        public void Update(TEntity entity) => _dbSet.Update(entity);

        public void Remove(TEntity entity) => _dbSet.Remove(entity);

        public void SaveChanges() => _context.SaveChanges();
    }
}
