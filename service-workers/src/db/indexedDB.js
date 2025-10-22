import { openDB } from "idb";

const DB_NAME = "ecomDB";
const STORE_NAME = "products";
const STORE_DELETIONS = "deletions";

export async function initDB() {
  return openDB(DB_NAME, 4, {
    upgrade(db, oldVersion) {
      // Recreate products store (keeps behavior consistent with previous code)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: "_id" });

      // Create deletions store to track offline deletes across reloads
      if (db.objectStoreNames.contains(STORE_DELETIONS)) {
        db.deleteObjectStore(STORE_DELETIONS);
      }
      db.createObjectStore(STORE_DELETIONS, { keyPath: "id" });
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
