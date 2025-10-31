import { API_ROOT } from "./base";
import { getCategories as getCatsDB, saveCategories as saveCatsDB, initDB, addCategoryDeletion, getCategoryDeletions } from "../db/indexedDB";

const API_CATEGORY_LIST = `${API_ROOT}/Category/list`;
const API_CATEGORY_MANAGE = `${API_ROOT}/Category/manage`;
const apiDeleteUrl = (id) => `${API_ROOT}/Category/${id}`;

function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function mapFromServer(c) {
  const id = c?.ID ?? c?.Id ?? c?.id ?? c?.CategoryId ?? c?.categoryId;
  const name = c?.CategoryName ?? c?.categoryName ?? c?.Name ?? c?.name ?? '';
  return {
    id: id != null ? String(id) : `cat_${Date.now()}`,
    name: String(name || ''),
    createdOn: c?.CreatedOn || c?.createdOn || undefined,
  };
}

function toNumericKey(cat) {
  const created = cat?.createdOn ? Date.parse(cat.createdOn) : 0;
  const raw = String(cat?.id || '');
  if (raw.startsWith('cat_')) {
    const t = Number(raw.slice(4));
    return Number.isFinite(t) ? t : created;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : created;
}

function sortCategoriesForDisplay(list) {
  const copy = [...(list || [])];
  // Newest first: by createdOn (if present) or by numeric/id timestamp desc
  copy.sort((a, b) => toNumericKey(b) - toNumericKey(a));
  return copy;
}

export async function fetchCategories() {
  try {
    if (isOnline()) {
      const res = await fetch(API_CATEGORY_LIST);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data || json?.Data) ? (json.data || json.Data) : [];
      const mapped = list.map(mapFromServer);
      const deletionIds = await getCategoryDeletions();
      // Merge in any locally pending categories so they remain visible
      const local = await getCatsDB();
      const pendingLocal = (local || []).filter(c => c._pendingSync);
      const nameSet = new Set(mapped.map(c => String(c.name || '').trim().toLowerCase()));
      const merged = [
        ...pendingLocal.filter(c => !nameSet.has(String(c.name || '').trim().toLowerCase())),
        ...mapped.filter(c => !deletionIds.includes(String(c.id))),
      ];
      const sorted = sortCategoriesForDisplay(merged);
      await saveCatsDB(sorted);
      return sorted;
    }
    await initDB();
    const local = await getCatsDB();
    return sortCategoriesForDisplay(local || []);
  } catch (_e) {
    await initDB();
    const local = await getCatsDB();
    return sortCategoriesForDisplay(local || []);
  }
}

function buildManagePayload(cat) {
  return {
    ID: String(cat.id || '').startsWith('cat_') ? null : (cat.id ? Number(cat.id) : null),
    CategoryName: cat.name,
  };
}

export async function createOrUpdateCategory(cat) {
  const payload = buildManagePayload(cat);
  if (isOnline()) {
    const res = await fetch(API_CATEGORY_MANAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Strict: use ID to find the updated or created object
    const json = await res.json();
    const list = Array.isArray(json?.data || json?.Data) ? (json.data || json.Data) : [];
    const mapped = list.map(mapFromServer);
    let updated = null;
    if (payload.ID) {
      updated = mapped.find(c => String(c.id) === String(payload.ID));
    } else {
      // fallback to newest with matching name if possible
      updated = mapped.filter(c => c.name.toLowerCase() === String(cat.name||'').toLowerCase())
            .sort((a,b) => Number(b.id) - Number(a.id))[0] ||
        mapped.reduce((a,b)=> (Number(a.id) > Number(b.id) ? a : b), mapped[0] || null);
    }
    await saveCatsDB(sortCategoriesForDisplay(mapped));
    return updated || { id: payload.ID ?? `cat_${Date.now()}`, name: cat.name };
  } else {
    // offline: upsert locally, but prevent duplicate name for another ID
    await initDB();
    const current = await getCatsDB();
    const existingSameName = current.find(c => c.name.toLowerCase() === cat.name.trim().toLowerCase() && String(c.id)!==String(cat.id||''));
    if (existingSameName) {
      throw new Error('A category with that name already exists.');
    }
    const id = cat.id || `cat_${Date.now()}`;
    const updated = { id: String(id), name: String(cat.name||''), _pendingSync: true };
    const next = [...(current||[]).filter(c=>String(c.id)!==String(id)), updated];
    await saveCatsDB(sortCategoriesForDisplay(next));
    return updated;
  }
}

export async function deleteCategoryById(id) {
  if (isOnline()) {
    const res = await fetch(apiDeleteUrl(id), { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.data || json?.Data) ? (json.data || json.Data) : [];
    const mapped = sortCategoriesForDisplay(list.map(mapFromServer));
    await saveCatsDB(mapped);
    return { success: true };
  } else {
    await initDB();
    const current = await getCatsDB();
    const next = (current||[]).filter(c => String(c.id) !== String(id));
    await saveCatsDB(sortCategoriesForDisplay(next));
    await addCategoryDeletion(id);
    return { success: true };
  }
}
