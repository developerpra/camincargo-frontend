import { openDB } from "idb";

const DB_NAME = "ecomDB";
const STORE_NAME = "products";
const STORE_DELETIONS = "deletions";
const STORE_CATEGORIES = "categories";
const STORE_CATEGORY_DELETIONS = "category_deletions";

export async function initDB() {
  return openDB(DB_NAME, 6, {
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
      // Category deletions queue store
      if (!db.objectStoreNames.contains(STORE_CATEGORY_DELETIONS)) {
        db.createObjectStore(STORE_CATEGORY_DELETIONS, { keyPath: "id" });
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
  // Replace existing categories entirely to remove any temporary/default ones
  await tx.store.clear();
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
  // Do not create temporary categories anymore; rely on real backend categories
  await tx.done;
  return "";
}

export async function getCategoryById(id) {
  const db = await initDB();
  return db.get(STORE_CATEGORIES, String(id));
}

// --- Category deletions queue helpers ---
export async function addCategoryDeletion(id) {
  const db = await initDB();
  const tx = db.transaction(STORE_CATEGORY_DELETIONS, "readwrite");
  await tx.store.put({ id: String(id) });
  await tx.done;
}

export async function getCategoryDeletions() {
  const db = await initDB();
  const entries = await db.getAll(STORE_CATEGORY_DELETIONS);
  return entries.map(e => e.id);
}

export async function removeCategoryDeletion(id) {
  const db = await initDB();
  const tx = db.transaction(STORE_CATEGORY_DELETIONS, "readwrite");
  await tx.store.delete(String(id));
  await tx.done;
}

export async function clearCategoryDeletions() {
  const db = await initDB();
  const tx = db.transaction(STORE_CATEGORY_DELETIONS, "readwrite");
  await tx.store.clear();
  await tx.done;
}
