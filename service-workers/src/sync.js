import { getProducts, clearAllProducts, saveProducts as saveAllToDB, getDeletions, removeDeletion } from './db/indexedDB';
import { getAuthHeaders } from './api/auth';
import { API_ROOT } from './api/base';
import { buildManagePayload, unwrapListResponse } from './api/productUtils';
const API_PRODUCT_LIST = `${API_ROOT}/Product/list`;
const API_PRODUCT_MANAGE = `${API_ROOT}/Product/manage`;
const apiDeleteUrl = (id) => `${API_ROOT}/Product/${id}`;

// mapping and helpers moved to productUtils

// Sync pending changes when coming back online
export async function syncPendingChanges() {
  if (!navigator.onLine) return;

  try {
    const localProducts = await getProducts();
    const pendingProducts = localProducts.filter(p => p._pendingSync);
    const knownServerIds = new Set(
      localProducts
        .map(p => p._id || p.id)
        .filter(id => id && !String(id).startsWith('temp_'))
        .map(id => String(id))
    );

    // First process deletions queue
    const deletionIds = await getDeletions();
    for (const delId of deletionIds) {
      try {
        await fetch(apiDeleteUrl(delId), { method: 'DELETE', headers: { ...getAuthHeaders() } });
        await removeDeletion(delId);
      } catch (error) {
        console.error('Failed to sync deletion:', delId, error);
      }
    }

    // Then process create/update queue
    for (const product of pendingProducts) {
      try {
        if (product._id && product._id.startsWith('temp_')) {
          // Create via manage endpoint
          const response = await fetch(API_PRODUCT_MANAGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(buildManagePayload(product)),
          });
          if (response.ok) {
            const json = await response.json();
            const list = unwrapListResponse(json);
            // Prefer the item that is new compared to known server ids and matches name
            const candidate = list.find(it => !knownServerIds.has(String(it._id)) && it.name === product.name) || null;
            const created = candidate || list.reduce((a, b) => (Number(a._id) > Number(b._id) ? a : b), list[0] || null);
            if (created) {
              await updateProductInDB(product._id, created);
              knownServerIds.add(String(created._id));
            }
          }
        } else {
          // Update via manage endpoint
          const response = await fetch(API_PRODUCT_MANAGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(buildManagePayload(product)),
          });
          if (response.ok) {
            const json = await response.json();
            const list = unwrapListResponse(json);
            const updated = list.find(p => String(p._id) === String(product._id));
            if (updated) {
              await updateProductInDB(product._id, updated);
            } else {
              // Fallback: refresh from server to ensure UI updates
              await refreshDataFromServer();
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync product:', product, error);
      }
    }

    // Refresh data from server and also clear _pendingSync flags
    await refreshDataFromServer();
    try {
      const { openDB } = await import('idb');
      const db = await openDB('ecomDB', 4);
      const tx = db.transaction('products', 'readwrite');
      const all = await tx.store.getAll();
      for (const rec of all) {
        if (rec._pendingSync) {
          delete rec._pendingSync;
          await tx.store.put(rec);
        }
      }
      await tx.done;
    } catch (e) {
      console.warn('Could not clear pending flags', e);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Refresh data from server
async function refreshDataFromServer() {
  try {
    const response = await fetch(API_PRODUCT_LIST, { headers: { ...getAuthHeaders() } });
    if (response.ok) {
      const serverJson = await response.json();
      const serverProducts = unwrapListResponse(serverJson);
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

// Helper function: replace temp/offline product with server product
async function updateProductInDB(oldId, newProduct) {
  const { openDB } = await import('idb');
  const db = await openDB('ecomDB', 4);
  const tx = db.transaction('products', 'readwrite');
  // remove temp/offline record
  await tx.store.delete(oldId);
  // insert server record (ensure no pending flag)
  const toStore = { ...newProduct };
  if (toStore._pendingSync) delete toStore._pendingSync;
  await tx.store.put(toStore);
  await tx.done;
}

// removed duplicate saveProducts in favor of DB helper

// Listen for online event
window.addEventListener('online', () => {
  console.log('Back online, syncing pending changes...');
  syncPendingChanges();
});

// Also try syncing when tab gains focus or becomes visible
window.addEventListener('focus', () => {
  if (navigator.onLine) {
    syncPendingChanges();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    syncPendingChanges();
  }
});

// One initial attempt on load if we're already online
if (typeof window !== 'undefined' && navigator.onLine) {
  setTimeout(() => {
    syncPendingChanges();
  }, 0);
}
