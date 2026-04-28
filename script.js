// ---------- ELEMENTS ----------
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

// ---------- HELPER (MOBILE SAFE TAP) ----------
function onTap(el, cb) {
  el.addEventListener("pointerup", (e) => {
    e.preventDefault();
    cb(e);
  });
}

// ---------- IMAGE SET ----------
const plates = Array.from({ length: 37 }, (_, i) => `photos/${i + 1}.png`);

let currentPlate = 0;
let clickTimer = null;

// ---------- UPDATE IMAGE ----------
function updatePlate() {
  overlay.src = plates[currentPlate];
}

// ---------- INTRO → CAMERA ----------
onTap(introScreen, async () => {
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
  } catch (err) {
    alert("Camera access is needed.");
  }
}

// ---------- NAV ----------
function nextPlate() {
  currentPlate = (currentPlate + 1) % plates.length;
  updatePlate();
}

function prevPlate() {
  currentPlate = (currentPlate - 1 + plates.length) % plates.length;
  updatePlate();
}

onTap(nextButton, nextPlate);
onTap(prevButton, prevPlate);

// ---------- SWIPE ----------
let startX = 0;

document.addEventListener("touchstart", (e) => {
  startX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].screenX;
  const diff = endX - startX;

  if (diff > 50) prevPlate();
  if (diff < -50) nextPlate();
});

// ---------- GALLERY ----------
function buildGallery() {
  galleryGrid.innerHTML = "";

  plates.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "gallery-item";

    if (index === currentPlate) {
      img.classList.add("active");
    }

    onTap(img, () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;

        // double tap → select image
        currentPlate = index;
        updatePlate();
        galleryOverlay.classList.remove("open");
        galleryPreview.classList.remove("open");
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;

          // single tap → preview
          galleryPreviewImg.src = src;
          galleryPreview.classList.add("open");
        }, 250);
      }
    });

    galleryGrid.appendChild(img);
  });
}

onTap(galleryButton, () => {
  buildGallery();
  galleryOverlay.classList.add("open");
});

onTap(closeGallery, () => {
  galleryOverlay.classList.remove("open");
});

onTap(galleryPreview, () => {
  galleryPreview.classList.remove("open");
});

// ---------- CAPTURE ----------
onTap(captureButton, captureImage);

function captureImage() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);

  const img = new Image();
  img.src = overlay.src;

  img.onload = () => {
    ctx.globalAlpha = 0.78;
    ctx.globalCompositeOperation = "multiply";

    const scale = Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    );

    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.drawImage(img, x, y, w, h);

    const url = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = url;
    a.download = "xposed.png";
    a.click();
  };
}

// ---------- VIDEO HOLD ----------
let pressTimer;
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];

captureButton.addEventListener("pointerdown", () => {
  pressTimer = setTimeout(startRecording, 400);
});

captureButton.addEventListener("pointerup", () => {
  clearTimeout(pressTimer);

  if (isRecording) stopRecording();
  else captureImage();
});

function startRecording() {
  isRecording = true;
  captureButton.classList.add("recording");
  recordedChunks = [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  function draw() {
    if (!isRecording) return;

    ctx.drawImage(video, 0, 0);

    const img = new Image();
    img.src = overlay.src;

    img.onload = () => {
      ctx.globalAlpha = 0.78;
      ctx.globalCompositeOperation = "multiply";

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      requestAnimationFrame(draw);
    };
  }

  draw();

  const stream = canvas.captureStream(30);
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "xposed.webm";
    a.click();
  };

  mediaRecorder.start();
}

function stopRecording() {
  isRecording = false;
  captureButton.classList.remove("recording");
  mediaRecorder?.stop();
}

// ---------- MARQUEE ----------
const marqueeLeft = document.getElementById("marquee-left");
const marqueeRight = document.getElementById("marquee-right");

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function buildMarquee() {
  const row1 = [...shuffle([...plates]), ...plates];
  const row2 = [...shuffle([...plates]), ...plates];

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

// ---------- INIT ----------
overlay.src = plates[0];