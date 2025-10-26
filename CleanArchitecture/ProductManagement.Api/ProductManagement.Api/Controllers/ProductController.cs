using Microsoft.AspNetCore.Mvc;
using ProductManagement.Application.Interfaces;
using ProductManagement.Application.RequestModels;
using Microsoft.Extensions.Logging;
using ProductManagement.Application.ResponseModel;
using ProductManagement.Application.Helper;
using ProductManagement.Shared.Common;

namespace ProductManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly IProductAppService _productAppService;
        private readonly ILogger<ProductController> _logger;
        private readonly ResponseHelper _responseHelper;
        public ProductController(IProductAppService productAppService, ILogger<ProductController> logger,
            ResponseHelper responseHelper)
        {
            _productAppService = productAppService;
            _logger = logger;
            _responseHelper = responseHelper;
        }

        [HttpGet("list")]
        public IActionResult GetProducts()
        {
            try
            {
                var products = _productAppService.GetProducts();

                if (products == null || !products.Any())
                    return _responseHelper.CreateResponse(false, Constant.NOTFOUND, null, 404);

                return _responseHelper.CreateResponse(true, Constant.SUCCESS, products);
                
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, Constant.ERROR);
                return _responseHelper.CreateResponse(false, Constant.ERROR, null, 500);
            }
        }
        [HttpPost("manage")]
        public IActionResult ManageProduct([FromBody] ProductAddUpdateRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.ProductName))
                    return _responseHelper.CreateResponse(false, Constant.INVALID, null, 400);

                var response = _productAppService.ManageProduct(request);
                var products = _productAppService.GetProducts();

                if (!response.Success)
                    return _responseHelper.CreateResponse(false, response.Message, products, 400);

                return _responseHelper.CreateResponse(true, response.Message, products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while managing product.");
                return _responseHelper.CreateResponse(false, Constant.ERROR, null, 500);
            }
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteProduct(int id)
        {
            try
            {
                var response = _productAppService.DeleteProduct(id);
                var products = _productAppService.GetProducts();

                return _responseHelper.CreateResponse(response.Success, response.Message, products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deleting product.");
                return _responseHelper.CreateResponse(false, Constant.ERROR, null, 500);
            }
        }


    }
}
