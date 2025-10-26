namespace ProductManagement.Application.ResponseModel
{
    public class ProductResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public object Data { get; set; }
    }
}
