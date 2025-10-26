using Microsoft.AspNetCore.Mvc;
using CustomerManagement.Application.Interfaces;
using CustomerManagement.Application.RequestModels;
using Microsoft.Extensions.Logging;
using CustomerManagement.Application.ResponseModel;
using CustomerManagement.Application.Helper;
using CustomerManagement.Shared.Common;

namespace CustomerManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : ControllerBase
    {
        private readonly ICustomerAppService _customerAppService;
        private readonly ILogger<CustomerController> _logger;
        private readonly ResponseHelper _responseHelper;
        public CustomerController(ICustomerAppService customerAppService, ILogger<CustomerController> logger,
            ResponseHelper responseHelper)
        {
            _customerAppService = customerAppService;
            _logger = logger;
            _responseHelper = responseHelper;
        }

        [HttpGet("list")]
        public IActionResult GetCustomers()
        {
            try
            {
                var Customers = _customerAppService.GetCustomers();

                if (Customers == null || !Customers.Any())
                    return _responseHelper.CreateResponse(false, Constant.NOTFOUND, null, 404);

                return _responseHelper.CreateResponse(true, Constant.SUCCESS, Customers);
                
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, Constant.ERROR);
                return _responseHelper.CreateResponse(false, Constant.ERROR, null, 500);
            }
        }
        [HttpPost("manage")]
        public IActionResult ManageCustomer([FromBody] CustomerAddUpdateRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.CustomerName))
                    return _responseHelper.CreateResponse(false, Constant.INVALID, null, 400);

                var response = _customerAppService.ManageCustomer(request);
                var customers = _customerAppService.GetCustomers();

                if (!response.Success)
                    return _responseHelper.CreateResponse(false, Constant.MANAGE_FAILURE, customers, 400);

                return _responseHelper.CreateResponse(true, Constant.MANAGE_SUCCESS, customers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while managing customer.");
                return _responseHelper.CreateResponse(false, Constant.ERROR, null, 500);
            }
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteCustomer(int id)
        {
            try
            {
                var response = _customerAppService.DeleteCustomer(id);
                var customers = _customerAppService.GetCustomers();

                if (!response.Success)
                    return _responseHelper.CreateResponse(false, Constant.DELETE_FAILURE, customers, 400);

                return _responseHelper.CreateResponse(true, Constant.DELETE_SUCCESS, customers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deleting customer.");
                return _responseHelper.CreateResponse(false, Constant.ERROR, null, 500);
            }
        }


    }
}
