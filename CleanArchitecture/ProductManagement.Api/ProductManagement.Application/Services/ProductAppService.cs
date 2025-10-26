using ProductManagement.Application.RequestModels;
using ProductManagement.Application.ResponseModel;
using ProductManagement.Application.ViewModels;
using ProductManagement.Application.Interfaces;
using ProductManagement.Domain.Models;
using ProductManagement.Domain.Interfaces;

namespace ProductManagement.Application.Services
{
    public class ProductAppService : IProductAppService
    {
        private readonly IRepository<Product> _repositoryProduct;

        public ProductAppService(IRepository<Product> repositoryProduct)
        {
            _repositoryProduct = repositoryProduct;
        }

        public List<ProductViewModel> GetProducts()
        {
            return _repositoryProduct.GetAll()
                .OrderByDescending(x => x.ID)
                .Select(x => new ProductViewModel
                {
                    ID = x.ID,
                    ProductName = x.ProductName,
                    Description = x.Description,
                    Price = x.Price,
                    UpdatedBy = x.UpdatedBy,
                    UpdatedOn = x.UpdatedOn.ToString("MM/dd/yyyy")
                }).ToList();
        }

        public ProductResponse ManageProduct(ProductAddUpdateRequest request)
        {
            try
            {
                if (!request.ID.HasValue || request.ID == 0)
                {
                    var product = new Product
                    {
                        ProductName = request.ProductName,
                        Description = request.Description,
                        Price = request.Price,
                        UpdatedBy = request.UpdatedBy,
                        UpdatedOn = DateTime.UtcNow
                    };

                    _repositoryProduct.Add(product);
                    _repositoryProduct.SaveChanges();

                    return new ProductResponse { Success = true, Message = "Product added successfully." };
                }
                else
                {
                    var product = _repositoryProduct.GetAll().FirstOrDefault(x => x.ID == request.ID.Value);
                    if (product == null)
                        return new ProductResponse { Success = false, Message = "Product not found." };

                    product.ProductName = request.ProductName;
                    product.Description = request.Description;
                    product.Price = request.Price;
                    product.UpdatedBy = request.UpdatedBy;
                    product.UpdatedOn = DateTime.UtcNow;

                    _repositoryProduct.Update(product);
                    _repositoryProduct.SaveChanges();

                    return new ProductResponse { Success = true, Message = "Product updated successfully." };
                }
            }
            catch (Exception ex)
            {
                return new ProductResponse { Success = false, Message = $"Error: {ex.Message}" };
            }
        }

        public ProductResponse DeleteProduct(int id)
        {
            try
            {
                var product = _repositoryProduct.GetAll().FirstOrDefault(x => x.ID == id);
                if (product == null)
                    return new ProductResponse { Success = false, Message = "Product not found." };

                _repositoryProduct.Remove(product);
                _repositoryProduct.SaveChanges();

                return new ProductResponse { Success = true, Message = "Product deleted successfully." };
            }
            catch (Exception ex)
            {
                return new ProductResponse { Success = false, Message = $"Error: {ex.Message}" };
            }
        }
    }
}
