/* ==========================================================================
   PTB Online – 3D Scrapbook Page-Flip Engine (Desktop Spread & Mobile Swipe)
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  let sharedAudioCtx = null;

  function getSharedAudioCtx() {
    const AudioCtx = global.AudioContext || global.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }

  function playPaperRustle() {
    try {
      const ctx = getSharedAudioCtx();
      if (!ctx) return;
      const duration = 0.19;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * 0.08 * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 0.8;
      noise.connect(filter);
      filter.connect(ctx.destination);
      noise.onended = () => {
        try {
          noise.disconnect();
          filter.disconnect();
        } catch {}
      };
      noise.start();
    } catch {}
  }

  class BookFlipController {
    constructor(options) {
      this.stackEl = options.stackEl;
      this.leftSlot = options.leftSlot;
      this.rightSlot = options.rightSlot;
      this.prevBtn = options.prevBtn;
      this.nextBtn = options.nextBtn;
      this.indicatorEl = options.indicatorEl;
      this.onSpreadChange = options.onSpreadChange || (() => {});

      this.spreadIndex = 0; // 0 => [-1, 0], 1 => [1, 2], 2 => [3, 4]...
      this.mobilePageIndex = 0;
      this.isFlipping = false;
      this.soundEnabled = true;

      this.bindEvents();
    }

    isMobile() {
      return global.innerWidth < 768;
    }

    getTotalSpreads(album) {
      // Spread 0: [-1, 0], Spread 1: [1, 2], ...
      return Math.floor(album.pages.length / 2) + 1;
    }

    getSpreadPair(spreadIdx) {
      if (spreadIdx === 0) return [-1, 0];
      const leftIdx = spreadIdx * 2 - 1; // 1 => Trang 2, 3 => Trang 4
      const rightIdx = leftIdx + 1;      // 2 => Trang 3, 4 => Trang 5
      return [leftIdx, rightIdx];
    }

    getActivePageIndices(album) {
      if (this.isMobile()) {
        return [this.mobilePageIndex];
      }
      const [l, r] = this.getSpreadPair(this.spreadIndex);
      const indices = [];
      if (l >= 0 && l < album.pages.length) indices.push(l);
      if (r >= 0 && r < album.pages.length) indices.push(r);
      return indices;
    }

    jumpToPage(album, pageIndex) {
      const clamped = Math.max(0, Math.min(album.pages.length - 1, pageIndex));
      this.mobilePageIndex = clamped;
      this.spreadIndex = clamped === 0 ? 0 : Math.floor((clamped + 1) / 2);
    }

    renderStatic(album, editable, selection, callbacks) {
      this.leftSlot.innerHTML = '';
      this.rightSlot.innerHTML = '';

      if (this.isMobile()) {
        this.mobilePageIndex = Math.max(0, Math.min(album.pages.length - 1, this.mobilePageIndex));
        this.leftSlot.classList.add('mobile-hidden');
        this.rightSlot.classList.remove('mobile-hidden');
        const pageEl = PTB.PageRenderer.renderScrapbookPage({
          album,
          pageIndex: this.mobilePageIndex,
          side: 'right',
          editable,
          selection,
          callbacks,
        });
        this.rightSlot.appendChild(pageEl);
      } else {
        this.leftSlot.classList.remove('mobile-hidden');
        this.rightSlot.classList.remove('mobile-hidden');
        const maxSpread = this.getTotalSpreads(album) - 1;
        this.spreadIndex = Math.max(0, Math.min(maxSpread, this.spreadIndex));
        const [leftIdx, rightIdx] = this.getSpreadPair(this.spreadIndex);

        this.leftSlot.appendChild(
          PTB.PageRenderer.renderScrapbookPage({
            album,
            pageIndex: leftIdx,
            side: 'left',
            editable,
            selection,
            callbacks,
          })
        );
        this.rightSlot.appendChild(
          PTB.PageRenderer.renderScrapbookPage({
            album,
            pageIndex: rightIdx,
            side: 'right',
            editable,
            selection,
            callbacks,
          })
        );
      }

      this.updateControls(album);
    }

    updateControls(album) {
      if (this.isMobile()) {
        this.prevBtn.disabled = this.mobilePageIndex <= 0;
        this.nextBtn.disabled = this.mobilePageIndex >= album.pages.length - 1;
        if (this.indicatorEl) {
          this.indicatorEl.textContent = `Trang ${this.mobilePageIndex + 1} / ${album.pages.length}`;
        }
      } else {
        const totalSpreads = this.getTotalSpreads(album);
        this.prevBtn.disabled = this.spreadIndex <= 0;
        this.nextBtn.disabled = this.spreadIndex >= totalSpreads - 1;
        if (this.indicatorEl) {
          const [l, r] = this.getSpreadPair(this.spreadIndex);
          const lLabel = l < 0 ? 'Bìa trong' : `Trang ${l + 1}`;
          const rLabel = r >= album.pages.length ? 'Cuối sổ' : `Trang ${r + 1}`;
          this.indicatorEl.textContent = `${lLabel} – ${rLabel} (${album.pages.length} trang)`;
        }
      }
    }

    flip(direction, album, editable, selection, callbacks) {
      if (this.isFlipping) return;

      if (this.isMobile()) {
        const target = direction === 'next' ? this.mobilePageIndex + 1 : this.mobilePageIndex - 1;
        if (target < 0 || target >= album.pages.length) return;
        this.animateMobileFlip(direction, album, target, editable, selection, callbacks);
        return;
      }

      const totalSpreads = this.getTotalSpreads(album);
      const targetSpread = direction === 'next' ? this.spreadIndex + 1 : this.spreadIndex - 1;
      if (targetSpread < 0 || targetSpread >= totalSpreads) return;

      this.isFlipping = true;
      if (this.soundEnabled) playPaperRustle();

      const [oldL, oldR] = this.getSpreadPair(this.spreadIndex);
      const [newL, newR] = this.getSpreadPair(targetSpread);

      const sheet = document.createElement('div');
      sheet.className = `flip-sheet-3d dir-${direction}`;

      const frontFace = document.createElement('div');
      frontFace.className = 'flip-face flip-face-front';
      const backFace = document.createElement('div');
      backFace.className = 'flip-face flip-face-back';

      if (direction === 'next') {
        frontFace.appendChild(
          PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: oldR, side: 'right', editable: false })
        );
        backFace.appendChild(
          PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: newL, side: 'left', editable: false })
        );
        // Reveal new right page underneath while sheet lifts
        this.rightSlot.innerHTML = '';
        this.rightSlot.appendChild(
          PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: newR, side: 'right', editable, selection, callbacks })
        );
      } else {
        frontFace.appendChild(
          PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: oldL, side: 'left', editable: false })
        );
        backFace.appendChild(
          PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: newR, side: 'right', editable: false })
        );
        // Reveal previous left page underneath while sheet lifts
        this.leftSlot.innerHTML = '';
        this.leftSlot.appendChild(
          PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: newL, side: 'left', editable, selection, callbacks })
        );
      }

      sheet.appendChild(frontFace);
      sheet.appendChild(backFace);
      this.stackEl.appendChild(sheet);

      this.spreadIndex = targetSpread;
      this.mobilePageIndex = Math.max(0, newL);
      this.updateControls(album);

      setTimeout(() => {
        sheet.remove();
        this.renderStatic(album, editable, selection, callbacks);
        this.isFlipping = false;
        this.onSpreadChange(this.spreadIndex, this.getActivePageIndices(album));
      }, 620);
    }

    animateMobileFlip(direction, album, targetPage, editable, selection, callbacks) {
      this.isFlipping = true;
      if (this.soundEnabled) playPaperRustle();

      const oldIdx = this.mobilePageIndex;
      const sheet = document.createElement('div');
      sheet.className = `flip-sheet-3d dir-${direction}`;

      const front = document.createElement('div');
      front.className = 'flip-face flip-face-front';
      front.appendChild(
        PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: oldIdx, side: 'right', editable: false })
      );

      const back = document.createElement('div');
      back.className = 'flip-face flip-face-back';
      back.appendChild(
        PTB.PageRenderer.renderScrapbookPage({ album, pageIndex: targetPage, side: 'right', editable: false })
      );

      sheet.appendChild(front);
      sheet.appendChild(back);
      this.stackEl.appendChild(sheet);

      this.jumpToPage(album, targetPage);
      this.renderStatic(album, editable, selection, callbacks);

      setTimeout(() => {
        sheet.remove();
        this.isFlipping = false;
        this.onSpreadChange(this.spreadIndex, this.getActivePageIndices(album));
      }, 560);
    }

    bindEvents() {
      let touchStartX = 0;
      let touchStartY = 0;

      this.stackEl.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      this.stackEl.addEventListener('touchend', (e) => {
        if (!touchStartX || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        touchStartX = 0;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx < 0) this.nextBtn.click();
          else this.prevBtn.click();
        }
      }, { passive: true });
    }
  }

  PTB.BookFlipController = BookFlipController;
})(window);
