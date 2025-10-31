import { getProducts, clearAllProducts, saveProducts as saveAllToDB, getDeletions, removeDeletion, getCategoryDeletions, removeCategoryDeletion, initDB } from './db/indexedDB';
import { getAuthHeaders } from './api/auth';
import { API_ROOT } from './api/base';
import { buildManagePayload, unwrapListResponse } from './api/productUtils';
const API_PRODUCT_LIST = `${API_ROOT}/Product/list`;
const API_PRODUCT_MANAGE = `${API_ROOT}/Product/manage`;
const apiDeleteUrl = (id) => `${API_ROOT}/Product/${id}`;
const API_CATEGORY_LIST = `${API_ROOT}/Category/list`;
const API_CATEGORY_MANAGE = `${API_ROOT}/Category/manage`;
const apiCategoryDeleteUrl = (id) => `${API_ROOT}/Category/${id}`;

// mapping and helpers moved to productUtils

// --- Sync coordination: prevent duplicate concurrent runs and debounce triggers ---
let SYNC_IN_PROGRESS = false;
let SYNC_TIMER = null;
let SYNC_STARTED_AT = 0;
const SYNC_MAX_MS = 30000; // safety: reset lock after 30s
function scheduleSync(delay = 0) {
  if (SYNC_TIMER) clearTimeout(SYNC_TIMER);
  SYNC_TIMER = setTimeout(() => {
    SYNC_TIMER = null;
    syncPendingChanges();
  }, delay);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Sync pending changes when coming back online
export async function syncPendingChanges() {
  if (!navigator.onLine) return;
  // Stale lock guard: if lock held too long, release it
  if (SYNC_IN_PROGRESS) {
    if (Date.now() - SYNC_STARTED_AT > SYNC_MAX_MS) {
      SYNC_IN_PROGRESS = false;
      SYNC_STARTED_AT = 0;
    } else {
      return;
    }
  }
  SYNC_IN_PROGRESS = true;
  SYNC_STARTED_AT = Date.now();
  // notify UI that sync has started
  try {
    window.dispatchEvent(new CustomEvent('syncState', { detail: { syncing: true } }));
    const localProducts = await getProducts();
    const pendingProducts = localProducts.filter(p => p._pendingSync);
    const knownServerIds = new Set(
      localProducts
        .map(p => p._id || p.id)
        .filter(id => id && !String(id).startsWith('temp_'))
        .map(id => String(id))
    );

    // First process deletions queue (categories then products)
    const catDeletionIds = await getCategoryDeletions();
    for (const delId of catDeletionIds) {
      try {
        const res = await fetch(apiCategoryDeleteUrl(delId), { method: 'DELETE', headers: { ...getAuthHeaders() } });
        if (res.ok) await removeCategoryDeletion(delId);
      } catch (e) {
        console.error('Failed to sync category deletion:', delId, e);
      }
    }

    const deletionIds = await getDeletions();
    for (const delId of deletionIds) {
      try {
        await fetch(apiDeleteUrl(delId), { method: 'DELETE', headers: { ...getAuthHeaders() } });
        await removeDeletion(delId);
      } catch (error) {
        console.error('Failed to sync deletion:', delId, error);
      }
    }

    // Sync pending categories first, so products can reference real IDs if needed
    await syncPendingCategories();

    // Ensure all products referencing old temp category ids are updated to real ids (best-effort)
    await resolvePendingProductCategoryIds();

    // Gate: proceed only when all categories are fully synced and no product references a temp category id
    // Try a few times in the same sync session to avoid UI flicker and manual reloads
    {
      let attempts = 0;
      while (attempts < 5) {
        const catsReadyNow = await categoriesReadyForProductSync();
        if (catsReadyNow) break;
        console.log('Waiting for categories to sync before product sync...');
        await wait(800);
        await syncPendingCategories();
        await resolvePendingProductCategoryIds();
        attempts++;
      }
      const finalReady = await categoriesReadyForProductSync();
      if (!finalReady) {
        console.log('Categories not ready after retries; deferring product sync.');
        // end current sync cycle and retry shortly (syncing flag remains true until finally)
        SYNC_IN_PROGRESS = false;
        SYNC_STARTED_AT = 0;
        scheduleSync(1500);
        return;
      }
    }

    // Re-read products after category sync to get updated categoryIds
    const updatedLocalProducts = await getProducts();
    const updatedPendingProducts = updatedLocalProducts.filter(p => p._pendingSync);

    // Then process create/update queue for products with updated category refs
    let skippedAny = false;
    for (const product of updatedPendingProducts) {
      try {
        // Skip if product still has temp category ID (category not synced yet)
        if (product.categoryId && String(product.categoryId).startsWith('cat_')) {
          console.log('Skipping product sync - category not synced yet:', product.name);
          skippedAny = true;
          continue;
        }

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
            // Best-effort: try to match by fields across full list first
            const candidatesByFields = list.filter(it =>
              String((it.name||'').trim()) === String((product.name||'').trim()) &&
              Number(it.price||0) === Number(product.price||0) &&
              String((it.description||'').trim()) === String((product.description||'').trim()) &&
              String(it.categoryId || it.CategoryId || it.CategoryID || '') === String(product.categoryId || '')
            );
            let created = candidatesByFields.sort((a,b) => Number(b._id) - Number(a._id))[0] || null;
            // Heuristic: if still not found, prefer newest not in known ids
            if (!created) {
              const newItems = list.filter(it => !knownServerIds.has(String(it._id)));
              created = newItems.sort((a,b) => Number(b._id) - Number(a._id))[0] || null;
            }
            // Fallback: fetch server list and try the same field-based matching
            if (!created) {
              try {
                const listRes = await fetch(API_PRODUCT_LIST, { headers: { ...getAuthHeaders() } });
                if (listRes.ok) {
                  const listJson = await listRes.json();
                  const serverList = unwrapListResponse(listJson);
                  const serverFieldMatches = serverList.filter(it =>
                    String((it.name||'').trim()) === String((product.name||'').trim()) &&
                    Number(it.price||0) === Number(product.price||0) &&
                    String((it.description||'').trim()) === String((product.description||'').trim()) &&
                    String(it.categoryId || it.CategoryId || it.CategoryID || '') === String(product.categoryId || '')
                  );
                  created = serverFieldMatches.sort((a,b) => Number(b._id) - Number(a._id))[0] || null;
                  if (!created) {
                    const serverNew = serverList.filter(it => !knownServerIds.has(String(it._id)));
                    created = serverNew.sort((a,b) => Number(b._id) - Number(a._id))[0] || null;
                  }
                }
              } catch (_) {}
            }
            if (created && created._id) {
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
      const db = await initDB();
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

    // If we skipped products due to temp category IDs, try syncing again
    if (skippedAny) {
      console.log('Re-syncing after category ID updates...');
      scheduleSync(1000);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    // notify UI that sync has finished
    window.dispatchEvent(new CustomEvent('syncState', { detail: { syncing: false } }));
    SYNC_IN_PROGRESS = false;
    SYNC_STARTED_AT = 0;
  }
}
// Ensure products that still reference temp category ids are updated to real ids if available
async function resolvePendingProductCategoryIds() {
  try {
    const db = await initDB();
    const tx = db.transaction(['categories','products'], 'readwrite');
    const catStore = tx.objectStore('categories');
    const prodStore = tx.objectStore('products');
    const cats = await catStore.getAll();
    const byName = new Map(cats.map(c => [String(c.name||'').trim().toLowerCase(), c]));
    const prods = await prodStore.getAll();
    for (const p of prods) {
      if (p.categoryId && String(p.categoryId).startsWith('cat_')) {
        const nameKey = String(p.categoryName||'').trim().toLowerCase();
        const resolved = byName.get(nameKey);
        if (resolved && resolved.id && !String(resolved.id).startsWith('cat_')) {
          const updated = { ...p, categoryId: String(resolved.id) };
          await prodStore.put(updated);
        }
      }
    }
    await tx.done;
  } catch (_e) {
    // ignore; this is a best-effort pass
  }
}

// Check if categories are fully synced and no product references temp category ids
async function categoriesReadyForProductSync() {
  try {
    const db = await initDB();
    const tx = db.transaction(['categories','products'], 'readonly');
    const catStore = tx.objectStore('categories');
    const prodStore = tx.objectStore('products');
    const cats = await catStore.getAll();
    // any pending category or cat_* id means not ready
    const anyPendingCat = cats.some(c => c && (c._pendingSync || String(c.id||'').startsWith('cat_')));
    if (anyPendingCat) { await tx.done; return false; }
    const prods = await prodStore.getAll();
    const anyTempCatRef = prods.some(p => p && p.categoryId && String(p.categoryId).startsWith('cat_'));
    await tx.done;
    return !anyTempCatRef;
  } catch (_e) {
    // if in doubt, be conservative and report not ready
    return false;
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
      const idToLocal = new Map(localProducts.map(lp => [String(lp._id || lp.id), lp]));
      const offlineProducts = localProducts.filter(p => p._pendingSync);
      const stableLocal = localProducts.filter(p => !p._pendingSync);
      
      // Merge server products with offline products, keeping offline ones at top
      const serverMerged = serverProducts
        .filter(sp => !offlineProducts.some(op => op._id === sp._id || op.id === sp._id) && !deletionIdsAfterSync.includes(String(sp._id)))
        .map(sp => {
          const local = idToLocal.get(String(sp._id));
          if (local && (local.categoryId || local.categoryName)) {
            return { ...sp, categoryId: local.categoryId, categoryName: local.categoryName };
          }
          return sp;
        });

      // Preserve stable local records that aren't yet on the server (e.g., just created and server list not updated yet)
      const serverIdSet = new Set(serverMerged.map(sp => String(sp._id || sp.id)));
      const serverNameSet = new Set(serverMerged.map(sp => String(sp.name || '')));
      // Drop offline temp records if a server record with same name exists to avoid duplicates / stuck temps
      const filteredOffline = offlineProducts.filter(op => !String(op._id||'').startsWith('temp_') || !serverNameSet.has(String(op.name||'')));
      const carryOverLocal = stableLocal.filter(lp => !serverIdSet.has(String(lp._id || lp.id)) && !deletionIdsAfterSync.includes(String(lp._id || lp.id)));

      const mergedProducts = [...filteredOffline, ...serverMerged, ...carryOverLocal];
      
      await clearAllProducts();
      await saveAllToDB(mergedProducts);
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('dataSynced', { detail: mergedProducts }));
    }
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

// --- Category sync helpers ---
function mapCategoryFromServer(c) {
  const id = c?.ID ?? c?.Id ?? c?.id ?? c?.CategoryId ?? c?.categoryId;
  const name = c?.CategoryName ?? c?.categoryName ?? c?.Name ?? c?.name ?? '';
  return { id: id != null ? String(id) : undefined, name: String(name || '') };
}

async function syncPendingCategories() {
  try {
    const db = await initDB();
    const tx = db.transaction(['categories','products'], 'readwrite');
    const catStore = tx.objectStore('categories');
    const prodStore = tx.objectStore('products');
    const allCats = await catStore.getAll();
    const resList = await fetch(API_CATEGORY_LIST, { headers: { ...getAuthHeaders() } });
    const serverJson = resList.ok ? await resList.json() : null;
    const serverList = Array.isArray(serverJson?.data || serverJson?.Data) ? (serverJson.data || serverJson.Data) : [];
    const serverMapped = serverList.map(mapCategoryFromServer);
    const serverByName = new Map(serverMapped.map(c => [String(c.name || '').trim().toLowerCase(), c]));
    const pending = allCats.filter(c => c._pendingSync);
    for (const cat of pending) {
      try {
        // if server already has same name, reuse that id
        let resolved = serverByName.get(String(cat.name||'').trim().toLowerCase()) || null;
        if (!resolved) {
          const res = await fetch(API_CATEGORY_MANAGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ ID: null, CategoryName: cat.name }),
          });
          if (!res.ok) continue;
          const json = await res.json();
          const list = Array.isArray(json?.data || json?.Data) ? (json.data || json.Data) : [];
          const mapped = list.map(mapCategoryFromServer);
          const candidates = mapped.filter(c => c.name.toLowerCase() === String(cat.name||'').trim().toLowerCase());
          resolved = candidates.sort((a,b)=> Number(b.id)-Number(a.id))[0] || null;
          // update cache
          if (resolved) serverByName.set(String(resolved.name || '').trim().toLowerCase(), resolved);
        }
        if (resolved && resolved.id) {
          // Update categories: replace temp id with server id
          await catStore.delete(cat.id);
          const toPut = { ...cat, id: String(resolved.id) };
          delete toPut._pendingSync;
          await catStore.put(toPut);
          // Update products referencing this temp category id
          const allProds = await prodStore.getAll();
          for (const p of allProds) {
            if (String(p.categoryId||'') === String(cat.id)) {
              const updated = { ...p, categoryId: String(resolved.id), categoryName: cat.name };
              await prodStore.put(updated);
            }
          }
        }
      } catch (e) {
        // ignore and continue
      }
    }
    await tx.done;
  } catch (e) {
    // ignore sync category errors to not block product sync
  }
}

// Helper function: replace temp/offline product with server product
async function updateProductInDB(oldId, newProduct) {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  const existing = await tx.store.get(oldId);
  // remove temp/offline record
  await tx.store.delete(oldId);
  // insert server record (ensure no pending flag)
  const toStoreBase = { ...newProduct };
  // Preserve category info from existing if server lacks it
  if (existing) {
    if (!toStoreBase.categoryId && existing.categoryId) toStoreBase.categoryId = existing.categoryId;
    if (!toStoreBase.categoryName && existing.categoryName) toStoreBase.categoryName = existing.categoryName;
  }
  const toStore = toStoreBase;
  if (toStore._pendingSync) delete toStore._pendingSync;
  await tx.store.put(toStore);
  await tx.done;
}

// removed duplicate saveProducts in favor of DB helper

// Listen for online event
window.addEventListener('online', () => {
  console.log('Back online, syncing pending changes...');
  scheduleSync(0);
});

// On going offline, clear any pending timer and release lock so we don't get stuck
window.addEventListener('offline', () => {
  if (SYNC_TIMER) {
    clearTimeout(SYNC_TIMER);
    SYNC_TIMER = null;
  }
  SYNC_IN_PROGRESS = false;
  SYNC_STARTED_AT = 0;
});

// Also try syncing when tab gains focus or becomes visible
window.addEventListener('focus', () => {
  if (navigator.onLine) {
    scheduleSync(0);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    scheduleSync(0);
  }
});

// One initial attempt on load if we're already online
if (typeof window !== 'undefined' && navigator.onLine) {
  setTimeout(() => {
    scheduleSync(0);
  }, 0);
}
