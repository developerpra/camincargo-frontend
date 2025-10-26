namespace ProductManagement.Application.RequestModels
{
    public class ProductAddUpdateRequest
    {
        public int? ID { get; set; }
        public string ProductName { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string UpdatedBy { get; set; }
    }
}
