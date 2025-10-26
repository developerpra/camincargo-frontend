using Microsoft.AspNetCore.Mvc;
using ProductManagement.Application.ResponseModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProductManagement.Application.Helper
{
    public class ResponseHelper : ControllerBase // Inherit from ControllerBase to use StatusCode method
    {
        public IActionResult CreateResponse(bool success, string message, object? data = null, int statusCode = 200)
        {
            var response = new ProductResponse
            {
                Success = success,
                Message = message,
                Data = data
            };

            return StatusCode(statusCode, response); // StatusCode is now accessible
        }
    }
}
