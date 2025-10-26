namespace CustomerManagement.Application.ResponseModel
{
    public class CustomerResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public object Data { get; set; }
    }
}
