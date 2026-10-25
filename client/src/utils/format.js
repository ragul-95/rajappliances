export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function discountPercent(product) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

// A grey "no image" picture built into the page (no external request needed).
export const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#f0f2f2"/>' +
      '<text x="200" y="208" font-family="Arial,sans-serif" font-size="22" fill="#888" text-anchor="middle">No image</text>' +
      '</svg>'
  );

// Use as onError on <img>: swaps in the placeholder once (never loops).
export function onImageError(e) {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = PLACEHOLDER_IMG;
}

// The first image is the "front" photo; used on cards, cart and orders.
export function mainImage(product) {
  const images = product.images || [];
  const front = images.find((i) => i.angle === 'front') || images[0];
  return front ? front.url : PLACEHOLDER_IMG;
}
