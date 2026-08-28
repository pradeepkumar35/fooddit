/**
 * Swiggy imagery is served through a Cloudinary-style transformation chain
 * (…/upload/fl_lossy,f_auto,q_auto,w_660/<id>). The stored w_660 is sharp for
 * a 150px ledger thumbnail but visibly soft when stretched across the ~1100px
 * dossier hero. Rewrite the width token for the placement we're rendering
 * into; self-hosted placeholder paths are passed through untouched.
 */
export function resizeImageUrl(url, width) {
  if (!url || url.startsWith('/')) return url
  if (/w_\d+/.test(url)) return url.replace(/w_\d+/, `w_${width}`)
  // URL without a width transform: inject one into the upload chain.
  return url.replace('/upload/', `/upload/w_${width},`)
}
