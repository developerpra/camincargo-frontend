using CustomerManagement.Application.RequestModels;
using CustomerManagement.Application.ResponseModel;
using CustomerManagement.Application.Interfaces;
using CustomerManagement.Domain.Models;
using CustomerManagement.Domain.Interfaces;
using CustomerManagement.Application.ViewModels;

namespace CustomerManagement.Application.Services
{
    public class CustomerAppService : ICustomerAppService
    {
        private readonly IRepository<Customer> _repositoryCustomer;

        public CustomerAppService(IRepository<Customer> repositoryCustomer)
        {
            _repositoryCustomer = repositoryCustomer;
        }

        public List<CustomerViewModel> GetCustomers()
        {
            return _repositoryCustomer.GetAll()
                .OrderByDescending(x => x.ID)
                .Select(x => new CustomerViewModel
                {
                    ID = x.ID,
                    CustomerName = x.CustomerName,
                    Email=x.Email,
                    PhoneNumber=x.PhoneNumber,
                    Address=x.Address,
                    UpdatedBy = x.UpdatedBy,
                    UpdatedOn = x.UpdatedOn.ToString("MM/dd/yyyy")
                }).ToList();
        }

        public CustomerResponse ManageCustomer(CustomerAddUpdateRequest request)
        {
            try
            {
                if (!request.ID.HasValue || request.ID == 0)
                {
                    var customer = new Customer
                    {
                        CustomerName = request.CustomerName,
                        Email = request.Email,
                        PhoneNumber = request.PhoneNumber,
                        Address = request.Address,
                        UpdatedBy = request.UpdatedBy,
                        UpdatedOn = DateTime.UtcNow
                    };

                    _repositoryCustomer.Add(customer);
                    _repositoryCustomer.SaveChanges();

                    return new CustomerResponse { Success = true, Message = "Customer added successfully." };
                }
                else
                {
                    var customer = _repositoryCustomer.GetAll().FirstOrDefault(x => x.ID == request.ID.Value);
                    if (customer == null)
                        return new CustomerResponse { Success = false, Message = "Customer not found." };

                    customer.CustomerName = request.CustomerName;
                    customer.Email = request.Email;
                    customer.PhoneNumber = request.PhoneNumber;
                    customer.Address = request.Address;
                    customer.UpdatedBy = request.UpdatedBy;
                    customer.UpdatedOn = DateTime.UtcNow;

                    _repositoryCustomer.Update(customer);
                    _repositoryCustomer.SaveChanges();

                    return new CustomerResponse { Success = true, Message = "Customer updated successfully." };
                }
            }
            catch (Exception ex)
            {
                return new CustomerResponse { Success = false, Message = $"Error: {ex.Message}" };
            }
        }

        public CustomerResponse DeleteCustomer(int id)
        {
            try
            {
                var customer = _repositoryCustomer.GetAll().FirstOrDefault(x => x.ID == id);
                if (customer == null)
                    return new CustomerResponse { Success = false, Message = "Customer not found." };

                _repositoryCustomer.Remove(customer);
                _repositoryCustomer.SaveChanges();

                return new CustomerResponse { Success = true, Message = "Customer deleted successfully." };
            }
            catch (Exception ex)
            {
                return new CustomerResponse { Success = false, Message = $"Error: {ex.Message}" };
            }
        }
    }
}
