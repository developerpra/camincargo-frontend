namespace CustomerManagement.Shared.Common
{
    public class Constant
    {
        // Common responses
        public static string INVALID = "Invalid input data.";
        public static string NOTFOUND = "No customers found.";
        public static string SUCCESS = "Customers fetched successfully.";
        public static string ERROR = "An error occurred while processing the request.";

        // Manage Customer
        public static string MANAGE_SUCCESS = "Customer saved successfully.";
        public static string MANAGE_FAILURE = "Failed to save customer.";

        // Delete Customer
        public static string DELETE_SUCCESS = "Customer deleted successfully.";
        public static string DELETE_FAILURE = "Failed to delete customer.";
    }
}
