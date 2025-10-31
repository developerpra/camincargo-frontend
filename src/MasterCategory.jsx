import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCategories, createOrUpdateCategory, deleteCategoryById } from "./api/categories";

export default function MasterCategory() {
  const [categories, setCategories] = useState([]);
  const [catInput, setCatInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadCategories();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    function handleSyncState(e) {
      setIsSyncing(!!(e?.detail?.syncing));
    }
    window.addEventListener('syncState', handleSyncState);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncState', handleSyncState);
    };
  }, []);

  async function loadCategories() {
    setError("");
    try {
      let data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError("Failed to load categories");
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!catInput.trim()) return setError("Name required");
    // Prevent duplicate names client-side
    const desired = catInput.trim();
    if (categories.some(c => String(c.name || '').toLowerCase() === desired.toLowerCase())) {
      return setError("A category with that name already exists.");
    }
    setError("");
    try {
      await createOrUpdateCategory({ name: catInput.trim() });
      await loadCategories();
      setCatInput("");
    } catch (err) {
      const msg = (err && err.message) || "Failed to add category";
      if (/exists/i.test(msg)) setError("A category with that name already exists.");
      else setError("Failed to add category");
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditValue(cat.name);
  }

  async function handleSaveEdit(cat) {
    if (!editValue.trim()) return setError("Name required");
    // Prevent duplicate names on rename (excluding the same ID)
    const desired = editValue.trim();
    if (categories.some(c => String(c.id) !== String(cat.id) && String(c.name || '').toLowerCase() === desired.toLowerCase())) {
      return setError("Another category with this name already exists.");
    }
    setError("");
    try {
      await createOrUpdateCategory({ id: cat.id, name: editValue.trim() });
      setEditingId(null);
      setEditValue("");
      await loadCategories();
    } catch (err) {
      const msg = (err && err.message) || "Failed to update category";
      if (/exists/i.test(msg)) setError("Another category with this name already exists.");
      else setError("Failed to update category");
    }
  }

  async function handleDelete(cat) {
    setError("");
    try {
      await deleteCategoryById(cat.id);
      await loadCategories();
    } catch {
      setError("Failed to delete category");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          Master Category Management
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
              isOnline ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {isSyncing && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase bg-amber-100 text-amber-900 border border-amber-300">
              Syncing…
            </div>
          )}
          <Link to="/products" className="px-3 py-2 rounded bg-slate-700 text-white text-sm hover:bg-slate-800">
            Go to Products
          </Link>
        </div>
      </div>
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button
            type="button"
            className="ml-3 rounded px-2 py-0.5 text-red-700 hover:bg-red-100"
            onClick={() => setError("")}
            aria-label="Dismiss"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      <form onSubmit={handleAddCategory} className="flex gap-3 mb-4">
        <input
          type="text"
          className="flex-1 px-3 py-2 rounded border border-slate-200"
          placeholder="Add new category"
          value={catInput}
          onChange={(e) => setCatInput(e.target.value)}
        />
        <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">
          Add
        </button>
      </form>
      {error && <div className="error mb-2">{error}</div>}
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center border rounded p-2 justify-between">
            {editingId === cat.id ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-2 py-1 border border-slate-300 rounded mr-2"
                />
                <button
                  className="px-3 py-1 bg-green-500 text-white rounded mr-2"
                  onClick={() => handleSaveEdit(cat)}
                >
                  Save
                </button>
                <button
                  className="px-3 py-1 bg-slate-500 text-white rounded"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium flex items-center gap-2">
                  {cat.name}
                  {cat._pendingSync && (
                    <span className="text-[11px] inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Pending Sync</span>
                  )}
                </span>
                <button className="px-3 py-1 text-blue-700" onClick={() => startEdit(cat)}>
                  Edit
                </button>
                <button className="px-3 py-1 text-red-700" onClick={() => handleDelete(cat)}>
                  Delete
                </button>
              </>
            )}
            <span className="text-slate-400 text-xs ml-4">
              {cat.createdOn ? new Date(cat.createdOn).toLocaleDateString() : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

