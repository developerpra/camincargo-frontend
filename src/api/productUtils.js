// Mapping, sorting, payload helpers for products

export function mapFromServer(p) {
  const id = p?.ID ?? p?.id ?? p?.Id ?? p?.ProductId ?? p?.productId;
  const name = p?.ProductName ?? p?.productName ?? p?.Name ?? p?.name ?? '';
  const description = p?.Description ?? p?.description ?? '';
  const price = p?.Price ?? p?.price ?? 0;
  const updatedBy = p?.UpdatedBy ?? p?.updatedBy ?? '';
  const updatedOn = p?.UpdatedOn ?? p?.updatedOn ?? '';
  const categoryId = p?.CategoryId ?? p?.CategoryID ?? p?.categoryId ?? p?.categoryID ?? p?.Category_Id ?? p?.category_Id;
  const categoryName = p?.CategoryName ?? p?.categoryName ?? p?.Category ?? p?.category ?? '';
  return {
    _id: id != null ? String(id) : undefined,
    name,
    description,
    price: Number(price),
    updatedBy,
    updatedOn,
    categoryId: categoryId != null ? String(categoryId) : undefined,
    categoryName: categoryName || undefined
  };
}

export function unwrapListResponse(json) {
  const list = (json && (json.data || json.Data)) || [];
  return Array.isArray(list) ? list.map(mapFromServer) : [];
}

export function buildManagePayload(prod) {
  return {
    ID: prod._id && String(prod._id).startsWith('temp_') ? null : (prod._id ? Number(prod._id) : null),
    ProductName: prod.name,
    Description: prod.description,
    Price: Number(prod.price || 0),
    UpdatedBy: 'admin',
    CategoryId: prod.categoryId ? Number(prod.categoryId) : null,
    CategoryName: prod.categoryName || null
  };
}

function toNumericId(p) {
  const raw = String(p?._id ?? p?.id ?? '');
  if (raw.startsWith('temp_')) return Number(raw.slice(5)) || 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function sortProductsForDisplay(list) {
  const pending = list.filter(p => p._pendingSync);
  const stable = list.filter(p => !p._pendingSync);
  pending.sort((a, b) => toNumericId(b) - toNumericId(a));
  stable.sort((a, b) => toNumericId(b) - toNumericId(a));
  return [...pending, ...stable];
}


