using ProductManagement.Application.RequestModels;
using ProductManagement.Application.ResponseModel;
using ProductManagement.Application.ViewModels;

namespace ProductManagement.Application.Interfaces
{
    public interface IProductAppService
    {
        List<ProductViewModel> GetProducts();
        ProductResponse ManageProduct(ProductAddUpdateRequest request);
        ProductResponse DeleteProduct(int id);
    }
}