// Prefetches quiz question images so moving between questions doesn't trigger
// a per-question network load (which flashes / shifts the layout as each image
// arrives). `loaded` records URLs that have finished loading, so the media
// component can render a prefetched image immediately instead of waiting for
// its onLoad again.
const loaded = new Set();

export const isImagePreloaded = (src) => !!src && loaded.has(src);
export const markImagePreloaded = (src) => { if (src) loaded.add(src); };

// Kick off a background fetch for each URL. Already-loaded URLs are skipped;
// failures are ignored (the media component handles broken images).
export function preloadImages(srcs) {
  for (const src of srcs) {
    if (!src || loaded.has(src)) continue;
    const img = document.createElement("img");
    img.onload = () => loaded.add(src);
    img.src = src;
  }
}
