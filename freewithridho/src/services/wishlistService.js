// Wishlist / Favorite service — stored in localStorage
const STORAGE_KEY = 'freewithridho_wishlist';

export function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function isWishlisted(projectId) {
  return getWishlist().includes(projectId);
}

export function toggleWishlist(projectId) {
  const current = getWishlist();
  const idx = current.indexOf(projectId);
  if (idx === -1) {
    current.push(projectId);
  } else {
    current.splice(idx, 1);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return idx === -1; // returns true if now wishlisted
}
