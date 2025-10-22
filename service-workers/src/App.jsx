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
    <div className="container">
      <div className="header">
        <h1 className="title">Product Store</h1>
        <div className="header-status">
          <div className={`status-tag ${isOnline ? 'online' : 'offline'}`}>
            <div className="status-dot"></div>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {pendingCount > 0 && (
            <div className="pending-sync-tag">
              Pending {pendingCount}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={form.name}
          onChange={handleChange}
          className="input"
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="input"
        />
        <input
          type="number"
          name="price"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          className="input"
          min="0"
          step="0.01"
          required
        />
        <button type="submit" className="add-button">
          {editingId ? "Update Product" : "Add Product"}
        </button>
        {editingId && (
          <button type="button" onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      <div className="grid">
        {products.map((product) => (
          <div key={product._id || product.id} className="card">
            <h2 className="card-title">{product.name}</h2>
            {product.description && <p className="card-desc">{product.description}</p>}
            <p className="card-price">${Number(product.price || 0).toFixed(2)}</p>
            {product._pendingSync && (
              <div className="sync-indicator">Pending Sync</div>
            )}
            <div className="card-actions">
              <button onClick={() => handleEdit(product)} className="edit-button">
                Edit
              </button>
              <button onClick={() => handleDelete(product._id || product.id)} className="delete-button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
