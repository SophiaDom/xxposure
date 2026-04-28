const introScreen = document.getElementById("intro-screen");
const cameraApp = document.getElementById("camera-app");
const video = document.getElementById("camera");
const overlay = document.getElementById("glass-overlay");

const prevButton = document.getElementById("prev-plate");
const nextButton = document.getElementById("next-plate");
const captureButton = document.getElementById("capture-photo");
const galleryButton = document.getElementById("gallery-button");
const galleryOverlay = document.getElementById("gallery-overlay");
const closeGallery = document.getElementById("close-gallery");
const galleryGrid = document.getElementById("gallery-grid");
const galleryPreview = document.getElementById("gallery-preview");
const galleryPreviewImg = document.getElementById("gallery-preview-img");

let clickTimer = null;
let previewIndex = null;

galleryButton.addEventListener("click", () => {
  buildGallery();
  galleryOverlay.classList.add("open");
});

closeGallery.addEventListener("click", () => {
  galleryOverlay.classList.remove("open");
});

let pressTimer;
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];


/* ---------- IMAGE SET ---------- */

const plates = Array.from({ length: 37 }, (_, i) => `photos/${i + 1}.png`);

function buildGallery() {
  galleryGrid.innerHTML = "";

  plates.forEach((src, index) => {
    const img = document.createElement("img");

    img.src = src;
    img.className = "gallery-item";

    if (index === currentPlate) {
      img.classList.add("active");
    }

    img.addEventListener("click", () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;

        // double click/tap: choose image for camera overlay
        currentPlate = index;
        updatePlate();
        galleryOverlay.classList.remove("open");
        galleryPreview.classList.remove("open");
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;

          // single click/tap: open large preview
          previewIndex = index;
          galleryPreviewImg.src = src;
          galleryPreview.classList.add("open");
        }, 250);
      }
    });

    galleryGrid.appendChild(img);
  });
}

galleryButton.addEventListener("click", () => {
  buildGallery();
  galleryOverlay.classList.add("open");
});

closeGallery.addEventListener("click", () => {
  galleryOverlay.classList.remove("open");
});

galleryPreview.addEventListener("click", () => {
  galleryPreview.classList.remove("open");
});

let currentPlate = 0;

function updatePlate() {
  overlay.src = plates[currentPlate];
}

/* ---------- INTRO → CAMERA ---------- */

introScreen.addEventListener("click", async () => {
  introScreen.style.display = "none";
  cameraApp.style.display = "block";

  await startCamera();
});

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    video.srcObject = stream;
  } catch (error) {
    console.error("Camera error:", error);
    alert("Camera access is needed.");
  }
}

/* ---------- BUTTON NAVIGATION ---------- */

function nextPlate() {
  currentPlate++;
  if (currentPlate >= plates.length) currentPlate = 0;
  updatePlate();
}

function prevPlate() {
  currentPlate--;
  if (currentPlate < 0) currentPlate = plates.length - 1;
  updatePlate();
}

nextButton.addEventListener("click", nextPlate);
prevButton.addEventListener("click", prevPlate);

/* ---------- SWIPE ---------- */

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipe = touchEndX - touchStartX;
  const threshold = 50;

  if (swipe > threshold) prevPlate();
  if (swipe < -threshold) nextPlate();
}

/* ---------- INITIAL IMAGE ---------- */

overlay.src = plates[0];

captureButton.addEventListener("click", captureImage);

function captureImage() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // draw camera frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // draw transparent overlay on top
  const img = new Image();
  img.src = overlay.src;

  img.onload = () => {
    ctx.globalAlpha = 0.78;
    ctx.globalCompositeOperation = "multiply";

    // keeps overlay proportional like object-fit: contain
    const scale = Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    );

    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const x = (canvas.width - drawWidth) / 2;
    const y = (canvas.height - drawHeight) / 2;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    const finalImage = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = finalImage;
    link.download = "xposed-photo.png";
    link.click();
  };
}

captureButton.addEventListener("pointerdown", () => {
  pressTimer = setTimeout(() => {
    startRecording();
  }, 400);
});

captureButton.addEventListener("pointerup", () => {
  clearTimeout(pressTimer);

  if (isRecording) {
    stopRecording();
  } else {
    captureImage();
  }
});

captureButton.addEventListener("pointerleave", () => {
  clearTimeout(pressTimer);

  if (isRecording) {
    stopRecording();
  }
});

function startRecording() {
  isRecording = true;
  recordedChunks = [];

  captureButton.classList.add("recording");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  function drawFrame() {
    if (!isRecording) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = overlay.src;

    img.onload = () => {
      ctx.globalAlpha = 0.78;
      ctx.globalCompositeOperation = "multiply";

      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      requestAnimationFrame(drawFrame);
    };
  }

  drawFrame();

  const stream = canvas.captureStream(30);

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm"
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, {
      type: "video/webm"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "xposed-video.webm";
    link.click();
  };

  mediaRecorder.start();
}

function stopRecording() {
  isRecording = false;
  captureButton.classList.remove("recording");

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

const marqueeLeft = document.getElementById("marquee-left");
const marqueeRight = document.getElementById("marquee-right");

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function buildMarquee() {
  const shuffled1 = shuffle([...plates]);
  const shuffled2 = shuffle([...plates]);

  // duplicate so it loops seamlessly
  const row1 = [...shuffled1, ...shuffled1];
  const row2 = [...shuffled2, ...shuffled2];

  row1.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    marqueeLeft.appendChild(img);
  });

  row2.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    marqueeRight.appendChild(img);
  });
}

buildMarquee();