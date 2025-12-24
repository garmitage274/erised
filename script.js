const button = document.getElementById("playButton");
const imageContainer = document.getElementById("image-container");

let slideshowActive = false;
let slideshowTimeouts = [];
let slideshowContainer = null;

button.addEventListener("click", () => {
    if (slideshowActive) return;
    startSlideshow();
});

function startSlideshow() {
    slideshowActive = true;
    button.disabled = true;

    // Hide the home container
    imageContainer.style.display = "none";

    // Create slideshow container
    slideshowContainer = document.createElement("div");
    slideshowContainer.id = "slideshow";
    document.body.appendChild(slideshowContainer);

    // Prepare 6 random image URLs (use picsum to keep it simple)
    const images = [];
    const base = Date.now();
    for (let i = 0; i < 6; i++) {
        // Use a varying query param so we get different images
        images.push(`https://picsum.photos/1920/1080?random=${base + i}`);
    }

    // Preload images
    const preloads = images.map(src => {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(src); // resolve even on error to keep slideshow moving
            img.src = src;
        });
    });

    Promise.all(preloads).then(() => {
        // Show images one by one with ripple animation
        let index = 0;
        let previousSlide = null;

        const showNext = () => {
            if (index >= images.length) {
                endSlideshow();
                return;
            }

            const src = images[index];
            const img = document.createElement("img");
            img.className = "slide ripple";
            img.src = src;
            img.alt = `Slideshow image ${index + 1}`;

            // Append new slide on top
            slideshowContainer.appendChild(img);

            // After a short while remove previous (with out animation)
            if (previousSlide) {
                // add out animation and remove after animation
                previousSlide.classList.add("out");
                const t = setTimeout(() => {
                    try { slideshowContainer.removeChild(previousSlide); } catch (e) {}
                }, 900); // match slideOut duration
                slideshowTimeouts.push(t);
            }

            previousSlide = img;
            index++;

            // Schedule next slide after 5 seconds
            const timeout = setTimeout(showNext, 5000);
            slideshowTimeouts.push(timeout);
        };

        // Start the sequence
        showNext();
    });
}

function endSlideshow() {
    // Clear any pending timeouts
    slideshowTimeouts.forEach(t => clearTimeout(t));
    slideshowTimeouts = [];

    // Remove slideshow container (with a short fade to avoid abrupt jump)
    if (slideshowContainer) {
        // optional small fade before removal
        slideshowContainer.style.transition = "opacity 400ms ease";
        slideshowContainer.style.opacity = "0";
        setTimeout(() => {
            try { document.body.removeChild(slideshowContainer); } catch (e) {}
            slideshowContainer = null;
            slideshowActive = false;
            // Return to homepage
            imageContainer.style.display = "flex";
            button.disabled = false;
            imageContainer.style.opacity = "";
        }, 420);
    } else {
        // fallback
        slideshowActive = false;
        imageContainer.style.display = "flex";
        button.disabled = false;
    }
}
