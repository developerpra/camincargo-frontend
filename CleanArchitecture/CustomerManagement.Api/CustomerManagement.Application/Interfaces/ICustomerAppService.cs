using CustomerManagement.Application.RequestModels;
using CustomerManagement.Application.ResponseModel;
using CustomerManagement.Application.ViewModels;


namespace CustomerManagement.Application.Interfaces
{
    public interface ICustomerAppService
    {
        List<CustomerViewModel> GetCustomers();
        CustomerResponse ManageCustomer(CustomerAddUpdateRequest request);
        CustomerResponse DeleteCustomer(int id);
    }
}