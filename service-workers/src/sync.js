import { getProducts, clearAllProducts, saveProducts as saveAllToDB, getDeletions, removeDeletion, clearDeletions } from './db/indexedDB';

function getApiBaseUrl() {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (isDev) return '/api/products';
  const sameOriginBackend = typeof window !== 'undefined' && window.location && window.location.port === '4000';
  return sameOriginBackend ? '/products' : 'http://localhost:4000/products';
}
const API_BASE_URL = getApiBaseUrl();

// Sync pending changes when coming back online
export async function syncPendingChanges() {
  if (!navigator.onLine) return;

  try {
    const localProducts = await getProducts();
    const pendingProducts = localProducts.filter(p => p._pendingSync);

    // First process deletions queue
    const deletionIds = await getDeletions();
    for (const delId of deletionIds) {
      try {
        await fetch(`${API_BASE_URL}/${delId}`, { method: 'DELETE' });
        await removeDeletion(delId);
      } catch (error) {
        console.error('Failed to sync deletion:', delId, error);
      }
    }

    // Then process create/update queue
    for (const product of pendingProducts) {
      try {
        if (product._deleted) {
          // Handle deletion
          await fetch(`${API_BASE_URL}/${product._id}`, {
            method: 'DELETE',
          });
        } else if (product._id && product._id.startsWith('temp_')) {
          // Handle creation
          const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: product.name,
              description: product.description,
              price: product.price,
            }),
          });
          
          if (response.ok) {
            const newProduct = await response.json();
            // Update local storage with real ID
            await updateProductInDB(product._id, newProduct);
          }
        } else {
          // Handle update
          const response = await fetch(`${API_BASE_URL}/${product._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: product.name,
              description: product.description,
              price: product.price,
            }),
          });
          
          if (response.ok) {
            const updatedProduct = await response.json();
            // Update local storage with server response
            await updateProductInDB(product._id, updatedProduct);
          }
        }
      } catch (error) {
        console.error('Failed to sync product:', product, error);
      }
    }

    // Refresh data from server
    await refreshDataFromServer();
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Refresh data from server
async function refreshDataFromServer() {
  try {
    const response = await fetch(API_BASE_URL);
    if (response.ok) {
      const serverProducts = await response.json();
      const deletionIdsAfterSync = await getDeletions();
      
      // Get local products to preserve offline ones
      const localProducts = await getProducts();
      const offlineProducts = localProducts.filter(p => p._pendingSync);
      
      // Merge server products with offline products, keeping offline ones at top
      const mergedProducts = [...offlineProducts, ...serverProducts.filter(sp => 
        !offlineProducts.some(op => op._id === sp._id || op.id === sp._id) &&
        !deletionIdsAfterSync.includes(String(sp._id))
      )];
      
      await clearAllProducts();
      await saveAllToDB(mergedProducts);
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('dataSynced', { detail: mergedProducts }));
    }
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

// Helper function to update product in IndexedDB
async function updateProductInDB(oldId, newProduct) {
  const { updateProduct } = await import('./db/indexedDB');
  await updateProduct(newProduct);
}

// removed duplicate saveProducts in favor of DB helper

// Listen for online event
window.addEventListener('online', () => {
  console.log('Back online, syncing pending changes...');
  syncPendingChanges();
});
