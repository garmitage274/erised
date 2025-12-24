// Improved slideshow: true crossfade with double-buffering, only uses media1/*.jpg
// - Eliminates the black flash by waiting for the next image to fully load before fading.
// - Uses two stacked <img> elements and swaps between them for a smooth crossfade.
// - Sources images from discovered <img src="media1/..."> tags on the page, falling back to MEDIA_IMAGES.
// - Add filenames to MEDIA_IMAGES if your site doesn't expose thumbnails in the DOM.

const button = document.getElementById("playButton");
const imageContainer = document.getElementById("image-container");

// Add known media1 jpg filenames here as a fallback.
// Example: ["media1/photo1.jpg", "media1/photo2.jpg"]
const MEDIA_IMAGES = [
  "media1/banana.jpg"
];

if (!button || !imageContainer) {
  console.warn("playButton or image-container not found in DOM");
}

let slideshowActive = false;
let slideshowTimeouts = [];
let slideshowContainer = null;

// Double-buffered elements
let bufA = null;
let bufB = null;
let visibleBuf = 0; // 0 -> bufA visible, 1 -> bufB visible

if (button) {
  button.addEventListener("click", () => {
    if (slideshowActive) return;
    startSlideshow();
  });
}

// Find media1/*.jpg references already present in the page (thumbnails, etc.)
function discoverMediaImages() {
  const imgs = Array.from(document.querySelectorAll("img[src]"))
    .map(i => i.getAttribute("src"))
    .filter(s => s && s.includes("media1/") && /\.jpe?g$/i.test(s));
  return imgs.length ? Array.from(new Set(imgs)) : MEDIA_IMAGES.slice();
}

function buildImageList(count) {
  const discovered = discoverMediaImages();
  if (!discovered || discovered.length === 0) return [];
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(discovered[i % discovered.length]);
  }
  return list;
}

function createSlideContainer() {
  slideshowContainer = document.createElement("div");
  slideshowContainer.id = "slideshow";
  Object.assign(slideshowContainer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    zIndex: "9999",
    display: "block",
    // keep transparent so there isn't an obvious backdrop; body background will show if any tiny gaps occur
    backgroundColor: "transparent"
  });

  // Create two stacked image buffers
  bufA = document.createElement("img");
  bufB = document.createElement("img");

  [bufA, bufB].forEach(img => {
    Object.assign(img.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",        // fill viewport and avoid letterboxes
      transition: "opacity 900ms ease",
      opacity: "0",
      willChange: "opacity",
      backgroundColor: "transparent"
    });
    img.alt = "slideshow-image";
    slideshowContainer.appendChild(img);
  });

  // Ensure bufA is on top of bufB in DOM order so z-index ordering is stable (we'll control via opacity)
  document.body.appendChild(slideshowContainer);
}

// Preload a single image and call back when loaded (or errored)
function preload(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve({ url, ok: true });
    img.onerror = () => resolve({ url, ok: false });
    img.src = url;
  });
}

function startSlideshow() {
  if (!button || !imageContainer || slideshowActive) return;

  slideshowActive = true;
  button.disabled = true;

  // Hide homepage container
  imageContainer.style.display = "none";

  createSlideContainer();

  const images = buildImageList(6);
  if (!images.length) {
    console.warn("No media1 JPGs found. Aborting slideshow.");
    cleanupAndReturn();
    return;
  }

  // Start sequence using double-buffered crossfade
  let index = 0;
  visibleBuf = 0; // start with bufA as not-visible until first image is loaded

  // helper to pick buffers
  const getVisibleEl = () => (visibleBuf === 0 ? bufA : bufB);
  const getHiddenEl = () => (visibleBuf === 0 ? bufB : bufA);

  const showNext = async () => {
    if (index >= images.length) {
      endSlideshow();
      return;
    }

    const src = images[index];

    // Preload the image first to avoid any blank rendering
    const { ok } = await preload(src);

    // If preload failed, still attempt to use it (it may load on assignment), but proceed.
    const nextEl = getHiddenEl();
    const prevEl = getVisibleEl();

    // Set the src on the hidden buffer only after preload; this avoids the buffer showing a blank frame
    nextEl.src = src;

    // If the element is already complete (from cache), ensure we still perform the fade
    const performFade = () => {
      // Force layout to ensure transition will occur
      // eslint-disable-next-line no-unused-expressions
      nextEl.offsetWidth;

      // Fade in next, fade out prev
      nextEl.style.opacity = "1";

      if (prevEl && prevEl !== nextEl && prevEl.src) {
        prevEl.style.opacity = "0";

        // Remove previous src after its fade completes to free memory (and avoid it being briefly displayed later)
        const onEnd = (ev) => {
          if (ev && ev.propertyName && ev.propertyName !== "opacity") return;
          prevEl.removeEventListener("transitionend", onEnd);
          try { prevEl.removeAttribute("src"); } catch (e) {}
        };
        prevEl.addEventListener("transitionend", onEnd);

        // Fallback removal in case transitionend doesn't fire
        const cleanupTimeout = setTimeout(() => {
          try { prevEl.removeAttribute("src"); } catch (e) {}
        }, 1200);
        slideshowTimeouts.push(cleanupTimeout);
      }

      // toggle visible buffer
      visibleBuf = visibleBuf === 0 ? 1 : 0;
    };

    // If nextEl is already complete (from cache) we can fade immediately in the next frame.
    if (nextEl.complete) {
      requestAnimationFrame(() => requestAnimationFrame(performFade));
    } else {
      // Otherwise wait for load on the element itself (should fire soon after we set src)
      const onLoad = () => {
        nextEl.removeEventListener("load", onLoad);
        requestAnimationFrame(() => requestAnimationFrame(performFade));
      };
      nextEl.addEventListener("load", onLoad);
    }

    index++;
    const timeout = setTimeout(showNext, 5000);
    slideshowTimeouts.push(timeout);
  };

  // Kick off with the first image: preload & show it immediately (no fade from blank)
  (async () => {
    const first = images[0];
    await preload(first);

    const el = getVisibleEl(); // currently bufA
    el.src = first;
    // ensure it's visible right away (no fade-from-black)
    el.style.opacity = "1";
    // mark as visible
    visibleBuf = 0;

    // schedule next slide after delay
    index = 1;
    const timeout = setTimeout(showNext, 5000);
    slideshowTimeouts.push(timeout);
  })();
}

function endSlideshow() {
  slideshowTimeouts.forEach(t => clearTimeout(t));
  slideshowTimeouts = [];

  if (slideshowContainer) {
    slideshowContainer.style.transition = "opacity 400ms ease";
    slideshowContainer.style.opacity = "0";
    setTimeout(() => {
      try { document.body.removeChild(slideshowContainer); } catch (e) {}
      slideshowContainer = null;
      bufA = bufB = null;
      slideshowActive = false;
      imageContainer.style.display = "flex";
      if (button) button.disabled = false;
    }, 420);
  } else {
    cleanupAndReturn();
  }
}

function cleanupAndReturn() {
  slideshowActive = false;
  imageContainer.style.display = "flex";
  if (button) button.disabled = false;
  if (slideshowContainer) {
    try { document.body.removeChild(slideshowContainer); } catch (e) {}
    slideshowContainer = null;
  }
  slideshowTimeouts.forEach(t => clearTimeout(t));
  slideshowTimeouts = [];
}
