import { useEffect, useState } from "react";
import { fetchProducts, createProduct, updateProductById, deleteProductById } from "./api/products";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Calculate pending sync count
  const pendingCount = products.filter(p => p._pendingSync).length;

  useEffect(() => {
    loadProducts();
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Listen for data sync events
    const handleDataSynced = (event) => {
      setProducts(event.detail);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dataSynced', handleDataSynced);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dataSynced', handleDataSynced);
    };
  }, []);

  async function loadProducts() {
    console.log('🚀 Loading products...');
    try {
      const data = await fetchProducts();
      console.log('📦 Products loaded:', data);
      setProducts(data);
    } catch (error) {
      console.error('💥 Error loading products:', error);
      setError('Failed to load products: ' + error.message);
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const price = parseFloat(form.price);
    if (!form.name.trim()) return setError("Product name is required");
    if (isNaN(price) || price < 0) return setError("Please enter a valid price");

    try {
      if (editingId) {
        // Edit existing product
        const productData = {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
        };
        
        const updatedProduct = await updateProductById(editingId, productData);
        setProducts(products.map(p => (p._id === editingId || p.id === editingId) ? updatedProduct : p));
        setEditingId(null);
      } else {
        // Add new product
        const productData = {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
        };

        const newProduct = await createProduct(productData);
        setProducts([newProduct, ...products]);
      }

      setForm({ name: "", description: "", price: "" });
      setError("");
    } catch (error) {
      setError(error.message || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProductById(id);
      setProducts(products.filter((p) => (p._id !== id && p.id !== id)));
    } catch (error) {
      setError(error.message || "Failed to delete product");
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price
    });
    setEditingId(product._id || product.id);
  };

  const handleCancel = () => {
    setForm({ name: "", description: "", price: "" });
    setEditingId(null);
    setError("");
  };


  return (
    <div className="max-w-4xl mx-auto p-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Product Store</h1>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${isOnline ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {pendingCount > 0 && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-amber-400 text-black border-2 border-amber-600">
              Pending {pendingCount}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input type="text" name="name" placeholder="Product Name" value={form.name} onChange={handleChange} className="flex-1 min-w-48 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
        <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} className="flex-1 min-w-48 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="number" name="price" placeholder="Price" value={form.price} onChange={handleChange} className="w-36 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" min="0" step="0.01" required />
        <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">
          {editingId ? 'Update Product' : 'Add Product'}
        </button>
        {editingId && (
          <button type="button" onClick={handleCancel} className="px-4 py-2 rounded bg-slate-500 text-white hover:bg-slate-600">
            Cancel
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full table-auto border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium tracking-wide">Product</th>
              <th className="px-4 py-3 text-right font-medium tracking-wide">Price</th>
              <th className="px-4 py-3 text-right font-medium tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id || product.id} className="border-b last:border-b-0 odd:bg-white even:bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 align-middle">
                  <div className="font-semibold text-slate-800">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-slate-500">{product.description}</div>
                  )}
                  {product._pendingSync && (
                    <div className="mt-1 text-[11px] inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Pending Sync</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right align-middle font-semibold text-emerald-700 whitespace-nowrap">${Number(product.price || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right align-middle">
                  <div className="inline-flex items-center gap-2">
                    <button onClick={() => handleEdit(product)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">Edit</button>
                    <button onClick={() => handleDelete(product._id || product.id)} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
