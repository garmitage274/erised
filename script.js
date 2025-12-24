const button = document.getElementById("playButton");
const imageContainer = document.getElementById("image-container");

// List of local jpgs inside media1. Add filenames here as needed.
const MEDIA_IMAGES = [
    "media1/banana.jpg"
];

if (!button || !imageContainer) {
    console.warn("playButton or image-container not found in DOM");
}

let slideshowActive = false;
let slideshowTimeouts = [];
let slideshowContainer = null;

if (button) {
    button.addEventListener("click", () => {
        if (slideshowActive) return;
        startSlideshow();
    });
}

function buildImageList(count) {
    if (!Array.isArray(MEDIA_IMAGES) || MEDIA_IMAGES.length === 0) return [];
    const list = [];
    // Repeat images if we need more than available files
    for (let i = 0; i < count; i++) {
        const file = MEDIA_IMAGES[i % MEDIA_IMAGES.length];
        list.push(file);
    }
    return list;
}

function preloadImages(urls) {
    return Promise.all(urls.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ src, ok: true });
        img.onerror = () => resolve({ src, ok: false });
        img.src = src;
    })));
}

function createSlideContainer() {
    slideshowContainer = document.createElement("div");
    slideshowContainer.id = "slideshow";
    // Ensure container covers viewport and is on top
    Object.assign(slideshowContainer.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: "9999",
        display: "block",
        // keep transparent so previous content isn't visible between crossfades
        backgroundColor: "transparent"
    });
    document.body.appendChild(slideshowContainer);
}

function addImageToContainer(src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "slideshow";
    Object.assign(img.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "100%",
        maxHeight: "100%",
        width: "auto",
        height: "auto",
        objectFit: "contain",
        transition: "opacity 900ms ease",
        opacity: "0",
        willChange: "opacity"
    });
    img.className = "slide-image";
    slideshowContainer.appendChild(img);
    return img;
}

function startSlideshow() {
    if (!button || !imageContainer || slideshowActive) return;

    slideshowActive = true;
    button.disabled = true;

    // Hide the home container
    imageContainer.style.display = "none";

    createSlideContainer();

    // Build list of images (use 6 by default)
    const images = buildImageList(6);

    // Preload local images
    preloadImages(images).then(() => {
        let index = 0;
        let visibleImg = null;

        const showNext = () => {
            if (index >= images.length) {
                endSlideshow();
                return;
            }

            const src = images[index];

            // Create an img element and append but keep it invisible until it's painted
            const imgEl = addImageToContainer(src);

            // Ensure previous image stays visible until the new one is fully faded in
            requestAnimationFrame(() => {
                // force a layout so transition will run
                // eslint-disable-next-line no-unused-expressions
                imgEl.offsetWidth;
                // fade in the new image
                imgEl.style.opacity = "1";

                // fade out previous image if present
                if (visibleImg) {
                    visibleImg.style.opacity = "0";
                    // remove previous after transition
                    const removeAfter = () => {
                        try { slideshowContainer.removeChild(visibleImg); } catch (e) {}
                        visibleImg = null;
                    };
                    // use transitionend if available, fallback to timeout
                    const onEnd = (ev) => {
                        if (ev && ev.propertyName !== "opacity") return;
                        visibleImg.removeEventListener("transitionend", onEnd);
                        removeAfter();
                    };
                    visibleImg.addEventListener("transitionend", onEnd);
                    // fallback
                    const t = setTimeout(() => {
                        try { if (visibleImg && visibleImg.parentNode === slideshowContainer) slideshowContainer.removeChild(visibleImg); } catch (e) {}
                        visibleImg = null;
                    }, 1000);
                    slideshowTimeouts.push(t);
                }

                // make this the current visible image
                visibleImg = imgEl;
            });

            index++;
            const timeout = setTimeout(showNext, 5000);
            slideshowTimeouts.push(timeout);
        };

        showNext();
    });
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
            slideshowActive = false;
            imageContainer.style.display = "flex";
            if (button) button.disabled = false;
        }, 420);
    } else {
        slideshowActive = false;
        imageContainer.style.display = "flex";
        if (button) button.disabled = false;
    }
}
