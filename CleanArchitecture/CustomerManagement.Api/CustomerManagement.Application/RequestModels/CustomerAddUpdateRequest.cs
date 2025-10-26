namespace CustomerManagement.Application.RequestModels
{
    public class CustomerAddUpdateRequest
    {
        public int? ID { get; set; }
        public string CustomerName { get; set; }
        public string? Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string UpdatedBy { get; set; }
    }
}
