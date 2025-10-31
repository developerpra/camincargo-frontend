import { getProducts, saveProducts, addProduct, deleteProduct as deleteProductFromDB, updateProduct, addDeletion, getDeletions, addOrGetCategoryByName } from "../db/indexedDB";
import { API_ROOT } from "./base";
import { unwrapListResponse, buildManagePayload, sortProductsForDisplay } from "./productUtils";
const API_PRODUCT_LIST = `${API_ROOT}/Product/list`;
const API_PRODUCT_MANAGE = `${API_ROOT}/Product/manage`;
const apiDeleteUrl = (id) => `${API_ROOT}/Product/${id}`;

// Removed demo category logic; use real backend categories only

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
      const response = await fetch(API_PRODUCT_LIST);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const serverJson = await response.json();
      const serverProducts = unwrapListResponse(serverJson);
      const deletionIds = await getDeletions();
      
      // Get local products to preserve offline ones
      const localProducts = await getProducts();
      const idToLocal = new Map(localProducts.map(lp => [String(lp._id || lp.id), lp]));
      const offlineProducts = localProducts.filter(p => p._pendingSync);
      
      // Merge server products with offline products, keeping offline ones at top
      const serverWithCategories = serverProducts
        .filter(sp => !offlineProducts.some(op => op._id === sp._id || op.id === sp._id) && !deletionIds.includes(String(sp._id)))
        .map(sp => {
          const local = idToLocal.get(String(sp._id));
          if (local && (local.categoryId || local.categoryName)) {
            return { ...sp, categoryId: local.categoryId, categoryName: local.categoryName };
          }
          return sp;
        });
      const mergedProducts = [...offlineProducts, ...serverWithCategories];
      const finalList = sortProductsForDisplay(mergedProducts);
      await saveProducts(finalList);
      return finalList;
    }
    const offline = await getProducts();
    return sortProductsForDisplay(offline);
  } catch (_e) {
    const offline = await getProducts();
    return sortProductsForDisplay(offline);
  }
}

// Create a new product
export async function createProduct(productData) {
  try {
    if (isOnline()) {
      const payloadData = { ...productData };
      const response = await fetch(API_PRODUCT_MANAGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildManagePayload(payloadData)),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // API returns full list; pick the item with max ID as newly created
      const json = await response.json();
      const list = unwrapListResponse(json);
      const created = list.reduce((a, b) => (Number(a._id) > Number(b._id) ? a : b), list[0] || null);
      if (created) {
        const withCategory = payloadData.categoryId || payloadData.categoryName ? { ...created, categoryId: payloadData.categoryId, categoryName: payloadData.categoryName } : created;
        await addProduct(withCategory);
        return withCategory;
      }
      // fallback: optimistic
      const fallback = { _id: `temp_${Date.now()}`, ...productData };
      await addProduct(fallback);
      return fallback;
    } else {
      // When offline, save to IndexedDB and mark for sync
      const newProduct = {
        ...productData,
        _id: productData._id || `temp_${Date.now()}`,
        _pendingSync: true
      };
      if (newProduct.categoryName && !newProduct.categoryId) {
        newProduct.categoryId = await addOrGetCategoryByName(newProduct.categoryName);
      }
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
      const payloadData = { _id: id, ...productData };
      const response = await fetch(API_PRODUCT_MANAGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildManagePayload(payloadData)),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      const list = unwrapListResponse(json);
      const updated = list.find(p => String(p._id) === String(id));
      const toStoreBase = updated || { _id: String(id), ...productData };
      const toStore = (payloadData.categoryId || payloadData.categoryName) ? { ...toStoreBase, categoryId: payloadData.categoryId, categoryName: payloadData.categoryName } : toStoreBase;
      if (toStore._pendingSync) delete toStore._pendingSync;
      await updateProduct(toStore);
      return toStore;
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
        // categoryId should be provided by UI selection
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
      const response = await fetch(apiDeleteUrl(id), {
        method: 'DELETE',
        headers: {},
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
