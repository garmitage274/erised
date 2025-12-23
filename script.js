const button = document.getElementById("playButton");
const imageContainer = document.getElementById("image-container");
const videoContainer = document.getElementById("video-container");
const video = document.getElementById("video");

button.addEventListener("click", () => {
    imageContainer.style.display = "none";
    videoContainer.style.display = "block";
    video.play();
});
