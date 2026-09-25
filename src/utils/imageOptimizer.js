/**
 * Image bandwidth optimizer for 2G / low-bandwidth mobile connections.
 * Automatically injects Cloudinary / Unsplash dynamic resizing and quality parameters
 * to convert multi-megabyte images into ultra-compact WebP thumbnails (15-40 KB).
 */

export function getOptimizedImageUrl(url, width = 600) {
  if (!url || typeof url !== "string") return url || "";

  // Check if user is on 2G or has Data Saver enabled
  const is2G = typeof navigator !== "undefined" && (
    navigator.connection?.effectiveType === "2g" ||
    navigator.connection?.effectiveType === "slow-2g" ||
    navigator.connection?.saveData === true
  );

  // Use even smaller resolution and lower quality on 2G to save bandwidth
  const targetWidth = is2G ? Math.min(width, 400) : width;
  const quality = is2G ? "q_auto:eco" : "q_auto:good";

  try {
    // Cloudinary dynamic optimization
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
      // Don't re-inject if already transformed
      if (url.includes("/upload/f_auto") || url.includes("/upload/w_")) {
        return url;
      }
      return url.replace("/upload/", `/upload/f_auto,${quality},w_${targetWidth},c_limit/`);
    }

    // Unsplash dynamic optimization
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", String(targetWidth));
      u.searchParams.set("q", is2G ? "60" : "80");
      return u.toString();
    }
  } catch (e) {
    // Fallback to original url on any parse issue
    return url;
  }

  return url;
}
