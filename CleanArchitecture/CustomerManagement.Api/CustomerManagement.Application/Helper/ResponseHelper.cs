using Microsoft.AspNetCore.Mvc;
using CustomerManagement.Application.ResponseModel;

namespace CustomerManagement.Application.Helper
{
    public class ResponseHelper : ControllerBase // Inherit from ControllerBase to use StatusCode method
    {
        public IActionResult CreateResponse(bool success, string message, object? data = null, int statusCode = 200)
        {
            var response = new CustomerResponse
            {
                Success = success,
                Message = message,
                Data = data
            };

            return StatusCode(statusCode, response);
        }
    }
}
