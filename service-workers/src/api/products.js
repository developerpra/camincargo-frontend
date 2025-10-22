import { getProducts, saveProducts, addProduct, deleteProduct as deleteProductFromDB, updateProduct, addDeletion, getDeletions, removeDeletion } from "../db/indexedDB";

function getApiBaseUrl() {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (isDev) return '/api/products';
  const sameOriginBackend = typeof window !== 'undefined' && window.location && window.location.port === '4000';
  return sameOriginBackend ? '/products' : 'http://localhost:4000/products';
}
const API_BASE_URL = getApiBaseUrl();

// Helper function to check if we're online
function isOnline() {
  return navigator.onLine;
}

// Helper function to handle API errors
function handleApiError(error) {
  console.error('API Error:', error);
  throw new Error(error.message || 'Failed to fetch data');
}

// Fetch products from API with offline fallback
export async function fetchProducts() {
  try {
    if (isOnline()) {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const serverProducts = await response.json();
      const deletionIds = await getDeletions();
      
      // Get local products to preserve offline ones
      const localProducts = await getProducts();
      const offlineProducts = localProducts.filter(p => p._pendingSync);
      
      // Merge server products with offline products, keeping offline ones at top
      const mergedProducts = [...offlineProducts, ...serverProducts.filter(sp => 
        !offlineProducts.some(op => op._id === sp._id || op.id === sp._id) &&
        !deletionIds.includes(String(sp._id))
      )];
      
      await saveProducts(mergedProducts);
      return mergedProducts;
    }
    return await getProducts();
  } catch (_e) {
    return await getProducts();
  }
}

// Create a new product
export async function createProduct(productData) {
  try {
    if (isOnline()) {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newProduct = await response.json();
      
      // Save to IndexedDB
      await addProduct(newProduct);
      return newProduct;
    } else {
      // When offline, save to IndexedDB and mark for sync
      const newProduct = {
        ...productData,
        _id: productData._id || `temp_${Date.now()}`,
        _pendingSync: true
      };
      await addProduct(newProduct);
      return newProduct;
    }
  } catch (error) {
    handleApiError(error);
  }
}

// Update a product
export async function updateProductById(id, productData) {
  try {
    if (isOnline()) {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedProduct = await response.json();
      
      // Update in IndexedDB
      await updateProduct(updatedProduct);
      return updatedProduct;
    } else {
      // When offline, get the original product and merge with updates
      const localProducts = await getProducts();
      const originalProduct = localProducts.find(p => p._id === id || p.id === id);
      
      if (originalProduct) {
        const updatedProduct = {
          ...originalProduct,
          ...productData,
          _id: id,
          _pendingSync: true
        };
        await updateProduct(updatedProduct);
        return updatedProduct;
      }
      throw new Error('Product not found');
    }
  } catch (error) {
    handleApiError(error);
  }
}

// Delete a product
export async function deleteProductById(id) {
  try {
    if (isOnline()) {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Remove from IndexedDB
      await deleteProductFromDB(id);
      return { success: true };
    } else {
      // When offline, remove locally and queue deletion
      await deleteProductFromDB(id);
      await addDeletion(id);
      return { success: true };
    }
  } catch (error) {
    handleApiError(error);
  }
}
