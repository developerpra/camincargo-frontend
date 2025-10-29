import { useEffect, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProductById,
  deleteProductById,
} from "./api/products";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", categoryName: "" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Calculate pending sync count
  const pendingCount = products.filter((p) => p._pendingSync).length;

  useEffect(() => {
    loadProducts();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Listen for data sync events
    const handleDataSynced = (event) => {
      setProducts(event.detail);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("dataSynced", handleDataSynced);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("dataSynced", handleDataSynced);
    };
  }, []);

  async function loadProducts() {
    console.log("🚀 Loading products...");
    try {
      const data = await fetchProducts();
      console.log("📦 Products loaded:", data);
      setProducts(data);
    } catch (error) {
      console.error("💥 Error loading products:", error);
      setError("Failed to load products: " + error.message);
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
    if (isNaN(price) || price < 0)
      return setError("Please enter a valid price");

    try {
      if (editingId) {
        // Edit existing product
        const productData = {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          categoryName: form.categoryName.trim(),
        };

        const updatedProduct = await updateProductById(editingId, productData);
        setProducts(
          products.map((p) =>
            p._id === editingId || p.id === editingId ? updatedProduct : p
          )
        );
        setEditingId(null);
      } else {
        // Add new product
        const productData = {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          categoryName: form.categoryName.trim(),
        };

        const newProduct = await createProduct(productData);
        setProducts([newProduct, ...products]);
      }

      setForm({ name: "", description: "", price: "", categoryName: "" });
      setError("");
    } catch (error) {
      setError(error.message || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProductById(id);
      setProducts(products.filter((p) => p._id !== id && p.id !== id));
    } catch (error) {
      setError(error.message || "Failed to delete product");
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryName: product.categoryName || "",
    });
    setEditingId(product._id || product.id);
  };

  const handleCancel = () => {
    setForm({ name: "", description: "", price: "", categoryName: "" });
    setEditingId(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto p-5">
      <div className="sticky top-0 z-40 border-b border-slate-200 backdrop-blur">
        <div className="flex items-center justify-between py-3 px-2">
          <h1 className="text-xl font-semibold text-slate-800">
            Product Store
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              ></span>
              {isOnline ? "Online" : "Offline"}
            </div>
            {pendingCount > 0 && (
              <div className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-amber-400 text-black border-2 border-amber-600">
                Pending {pendingCount}
              </div>
            )}
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap gap-2 p-2 pb-3 mb-0"
        >
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={form.name}
            onChange={handleChange}
            className="flex-1 min-w-48 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className="flex-1 min-w-48 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            name="categoryName"
            placeholder="Category"
            value={form.categoryName}
            onChange={handleChange}
            className="flex-1 min-w-36 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={form.price}
            onChange={handleChange}
            className="w-36 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            min="0"
            step="0.01"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {editingId ? "Update Product" : "Add Product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded bg-slate-500 text-white hover:bg-slate-600"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm mt-4" style={{ maxHeight: '50vh', height: '50vh' }}>
        <table className="min-w-full table-auto border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase sticky z-30">
            <tr>
              <th className="px-4 py-3 text-left font-medium tracking-wide">
                ID
              </th>
              <th className="px-4 py-3 text-left font-medium tracking-wide">
                Product
              </th>
              <th className="px-4 py-3 text-left font-medium tracking-wide">
                Category
              </th>
              <th className="px-4 py-3 text-left font-medium tracking-wide">
                Updated By
              </th>
              <th className="px-4 py-3 text-left font-medium tracking-wide">
                Updated On
              </th>
              <th className="px-4 py-3 text-right font-medium tracking-wide">
                Price
              </th>
              <th className="px-4 py-3 text-right font-medium tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product._id || product.id}
                className="border-b last:border-b-0 odd:bg-white even:bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">
                  {product._id || product.id}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="font-semibold text-slate-800">
                    {product.name}
                  </div>
                  {product.description && (
                    <div className="text-xs text-slate-500">
                      {product.description}
                    </div>
                  )}
                  {product._pendingSync && (
                    <div className="mt-1 text-[11px] inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Pending Sync
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">
                  {product.categoryName || "NA"}
                </td>
                <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">
                  {product.updatedBy || ""}
                </td>
                <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">
                  {product.updatedOn || ""}
                </td>
                <td className="px-4 py-3 text-right align-middle font-semibold text-emerald-700 whitespace-nowrap">
                  ${Number(product.price || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right align-middle">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id || product.id)}
                      className="px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Category-based accordion (exclude NA) */}
      <div className="mt-6 space-y-2">
        {Object.entries(
          products.reduce((acc, p) => {
            const key = (p.categoryName || '').trim();
            if (!key || key.toLowerCase() === 'na') return acc; // exclude NA or empty
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
          }, {})
        ).map(([category, items]) => (
          <details key={category} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-800 flex items-center justify-between">
              <span>{category} <span className="ml-2 text-xs font-normal text-slate-500">({items.length})</span></span>
              <span className="text-slate-400">▼</span>
            </summary>
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="min-w-full table-auto border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium tracking-wide">ID</th>
                    <th className="px-4 py-3 text-left font-medium tracking-wide">Product</th>
                    <th className="px-4 py-3 text-left font-medium tracking-wide">Category</th>
                    <th className="px-4 py-3 text-left font-medium tracking-wide">Updated By</th>
                    <th className="px-4 py-3 text-left font-medium tracking-wide">Updated On</th>
                    <th className="px-4 py-3 text-right font-medium tracking-wide">Price</th>
                    <th className="px-4 py-3 text-right font-medium tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id || item.id} className="border-b last:border-b-0 odd:bg-white even:bg-slate-50/60">
                      <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">{item._id || item.id}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500">{item.description}</div>
                        )}
                        {item._pendingSync && (
                          <div className="mt-1 text-[11px] inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Pending Sync</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">{item.categoryName || ''}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">{item.updatedBy || ''}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-700">{item.updatedOn || ''}</td>
                      <td className="px-4 py-3 text-right align-middle font-semibold text-emerald-700 whitespace-nowrap">${Number(item.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => handleEdit(item)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">Edit</button>
                          <button onClick={() => handleDelete(item._id || item.id)} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export default App;
