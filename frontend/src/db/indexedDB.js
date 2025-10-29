import { openDB } from "idb";

const DB_NAME = "ecomDB";
const STORE_NAME = "products";
const STORE_DELETIONS = "deletions";
const STORE_CATEGORIES = "categories";

export async function initDB() {
  return openDB(DB_NAME, 5, {
    upgrade(db, oldVersion) {
      // Ensure products store exists (preserve data if already there)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "_id" });
      }

      // Ensure deletions store exists
      if (!db.objectStoreNames.contains(STORE_DELETIONS)) {
        db.createObjectStore(STORE_DELETIONS, { keyPath: "id" });
      }

      // Categories store for local-only categories
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: "id" });
      }
    }
  });
}

export async function saveProducts(products) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  products.forEach((product) => tx.store.put(product));
  await tx.done;
}

export async function addProduct(product) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.put(product);
  await tx.done;
}

export async function getProducts() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteProduct(id) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.delete(id);
  await tx.done;
}

export async function updateProduct(product) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.put(product);
  await tx.done;
}

export async function clearAllProducts() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.clear();
  await tx.done;
}

// --- Deletions queue helpers ---
export async function addDeletion(id) {
  const db = await initDB();
  const tx = db.transaction(STORE_DELETIONS, "readwrite");
  await tx.store.put({ id: String(id) });
  await tx.done;
}

export async function getDeletions() {
  const db = await initDB();
  const entries = await db.getAll(STORE_DELETIONS);
  return entries.map(e => e.id);
}

export async function removeDeletion(id) {
  const db = await initDB();
  const tx = db.transaction(STORE_DELETIONS, "readwrite");
  await tx.store.delete(String(id));
  await tx.done;
}

export async function clearDeletions() {
  const db = await initDB();
  const tx = db.transaction(STORE_DELETIONS, "readwrite");
  await tx.store.clear();
  await tx.done;
}

// --- Categories helpers ---
export async function getCategories() {
  const db = await initDB();
  return db.getAll(STORE_CATEGORIES);
}

export async function saveCategories(categories) {
  const db = await initDB();
  const tx = db.transaction(STORE_CATEGORIES, "readwrite");
  categories.forEach((cat) => tx.store.put(cat));
  await tx.done;
}

export async function addOrGetCategoryByName(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return "";
  const db = await initDB();
  const tx = db.transaction(STORE_CATEGORIES, "readwrite");
  const all = await tx.store.getAll();
  const existing = all.find(c => String(c.name).toLowerCase() === normalized.toLowerCase());
  if (existing) {
    await tx.done;
    return existing.id;
  }
  const id = `cat_${Date.now()}`;
  await tx.store.put({ id, name: normalized, createdOn: new Date().toISOString() });
  await tx.done;
  return id;
}

export async function getCategoryById(id) {
  const db = await initDB();
  return db.get(STORE_CATEGORIES, String(id));
}
