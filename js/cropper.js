/* ==========================================================================
   PTB Online – Interactive Canvas Photo Cropper Modal
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  let activeCallback = null;
  let sourceImg = null;
  let cropBox = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }; // normalized 0..1
  let aspectRatio = null; // null = free, or number w/h
  let dragging = false;
  let dragMode = 'move'; // 'move' or 'resize'
  let dragStart = { x: 0, y: 0, box: null };

  function openCropper(imageSrc, onConfirm) {
    if (!imageSrc) return;
    activeCallback = onConfirm;
    const modal = document.getElementById('cropModal');
    const canvas = document.getElementById('cropCanvas');
    modal.classList.remove('hidden');

    sourceImg = new Image();
    sourceImg.crossOrigin = 'anonymous';
    sourceImg.onload = () => {
      aspectRatio = null;
      cropBox = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
      updateAspectButtons(null);
      drawCropStage(canvas);
    };
    sourceImg.src = imageSrc;
  }

  function updateAspectButtons(ratio) {
    document.querySelectorAll('[data-crop-ratio]').forEach((btn) => {
      const val = btn.dataset.cropRatio === 'free' ? null : Number(btn.dataset.cropRatio);
      btn.classList.toggle('active', val === ratio);
    });
  }

  function setAspectRatio(ratio) {
    aspectRatio = ratio;
    updateAspectButtons(ratio);
    if (ratio && sourceImg) {
      const imgAspect = sourceImg.width / sourceImg.height;
      const targetNormRatio = ratio / imgAspect;
      let w = 0.78;
      let h = w / targetNormRatio;
      if (h > 0.84) {
        h = 0.84;
        w = h * targetNormRatio;
      }
      cropBox = {
        x: (1 - w) / 2,
        y: (1 - h) / 2,
        w,
        h,
      };
    }
    drawCropStage(document.getElementById('cropCanvas'));
  }

  function drawCropStage(canvas) {
    if (!sourceImg || !canvas) return;
    const maxW = 620;
    const maxH = 380;
    const scale = Math.min(maxW / sourceImg.width, maxH / sourceImg.height, 1);
    canvas.width = Math.round(sourceImg.width * scale);
    canvas.height = Math.round(sourceImg.height * scale);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);

    // Dimmed overlay outside crop box
    ctx.fillStyle = 'rgba(30, 22, 16, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rx = cropBox.x * canvas.width;
    const ry = cropBox.y * canvas.height;
    const rw = cropBox.w * canvas.width;
    const rh = cropBox.h * canvas.height;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Crop border & rule-of-thirds guides
    ctx.strokeStyle = '#FFFDF7';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.strokeStyle = 'rgba(255, 253, 247, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx + rw / 3, ry); ctx.lineTo(rx + rw / 3, ry + rh);
    ctx.moveTo(rx + (rw * 2) / 3, ry); ctx.lineTo(rx + (rw * 2) / 3, ry + rh);
    ctx.moveTo(rx, ry + rh / 3); ctx.lineTo(rx + rw, ry + rh / 3);
    ctx.moveTo(rx, ry + (rh * 2) / 3); ctx.lineTo(rx + rw, ry + (rh * 2) / 3);
    ctx.stroke();

    // Bottom-right resize handle
    ctx.fillStyle = '#EBCFCB';
    ctx.strokeStyle = '#594638';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx + rw, ry + rh, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function applyCrop() {
    if (!sourceImg || !activeCallback) return;
    const sx = Math.round(cropBox.x * sourceImg.width);
    const sy = Math.round(cropBox.y * sourceImg.height);
    const sw = Math.max(20, Math.round(cropBox.w * sourceImg.width));
    const sh = Math.max(20, Math.round(cropBox.h * sourceImg.height));

    const out = document.createElement('canvas');
    out.width = sw;
    out.height = sh;
    const ctx = out.getContext('2d');
    ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedDataUrl = out.toDataURL('image/jpeg', 0.9);
    activeCallback(croppedDataUrl);
    closeCropper();
  }

  function closeCropper() {
    document.getElementById('cropModal').classList.add('hidden');
    activeCallback = null;
  }

  function initCropperEvents() {
    const canvas = document.getElementById('cropCanvas');
    if (!canvas) return;

    canvas.addEventListener('pointerdown', (e) => {
      if (!sourceImg) return;
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;

      const hx = cropBox.x + cropBox.w;
      const hy = cropBox.y + cropBox.h;
      const distHandle = Math.hypot(nx - hx, ny - hy);

      if (distHandle < 0.06) {
        dragMode = 'resize';
      } else if (nx >= cropBox.x && nx <= hx && ny >= cropBox.y && ny <= hy) {
        dragMode = 'move';
      } else {
        return;
      }

      dragging = true;
      dragStart = { x: nx, y: ny, box: { ...cropBox } };
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const dx = nx - dragStart.x;
      const dy = ny - dragStart.y;

      if (dragMode === 'move') {
        cropBox.x = Math.max(0, Math.min(1 - cropBox.w, dragStart.box.x + dx));
        cropBox.y = Math.max(0, Math.min(1 - cropBox.h, dragStart.box.y + dy));
      } else {
        let newW = Math.max(0.15, Math.min(1 - dragStart.box.x, dragStart.box.w + dx));
        let newH = Math.max(0.15, Math.min(1 - dragStart.box.y, dragStart.box.h + dy));
        if (aspectRatio && sourceImg) {
          const imgAspect = sourceImg.width / sourceImg.height;
          const normRatio = aspectRatio / imgAspect;
          newH = newW / normRatio;
          if (dragStart.box.y + newH > 1) {
            newH = 1 - dragStart.box.y;
            newW = newH * normRatio;
          }
        }
        cropBox.w = newW;
        cropBox.h = newH;
      }
      drawCropStage(canvas);
    });

    canvas.addEventListener('pointerup', () => {
      dragging = false;
    });

    document.querySelectorAll('[data-crop-ratio]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.cropRatio === 'free' ? null : Number(btn.dataset.cropRatio);
        setAspectRatio(val);
      });
    });

    document.getElementById('cropCancelBtn').addEventListener('click', closeCropper);
    document.getElementById('cropCloseBtn').addEventListener('click', closeCropper);
    document.getElementById('cropApplyBtn').addEventListener('click', applyCrop);
  }

  PTB.Cropper = {
    openCropper,
    initCropperEvents,
  };
})(window);
