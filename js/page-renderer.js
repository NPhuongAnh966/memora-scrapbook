/* ==========================================================================
   PTB Online – Scrapbook Page Renderer & Direct Manipulation Interactions
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  function renderInsideCover(album, isEditable) {
    const page = document.createElement('div');
    page.className = 'scrapbook-page page-side-left inside-cover-page';

    const profile = PTB.Storage && PTB.Storage.getUserProfile ? PTB.Storage.getUserProfile() : null;
    const ownerName = (album.owner && album.owner.trim()) || (profile && profile.name && profile.name.trim()) || 'Tôi';
    const start = album.startDate || '—';

    page.innerHTML = `
      <div class="ex-libris-plate">
        <div class="ex-libris-label">EX LIBRIS • MY MEMORY BOOK</div>
        <h2 class="ex-libris-title">${escapeHtml(album.title)}</h2>
        <p class="ex-libris-owner">Thuộc về ${escapeHtml(ownerName)}</p>
        <p style="font-size:0.84rem;color:var(--ink-muted);margin:0 0 12px;font-style:italic;">
          “${escapeHtml(album.description || 'Mỗi bức ảnh là một kỷ niệm, mỗi trang giấy là một câu chuyện.')}”
        </p>
        <div class="ex-libris-dates">${escapeHtml(start)}</div>
      </div>
      <div style="margin-top:16px;opacity:0.75;width:54px;">
        ${(PTB.Assets.getStickerById(album.coverOrnament || 'dried-lavender') || PTB.Assets.STICKERS[0]).svg}
      </div>
      <div class="page-footer-number">Trang bìa trong</div>
    `;
    return page;
  }

  function renderBlankBackPage(side) {
    const page = document.createElement('div');
    page.className = `scrapbook-page page-side-${side} inside-cover-page`;
    page.innerHTML = `
      <div style="text-align:center;color:var(--ink-muted);max-width:75%;">
        <p style="font-family:var(--font-hand);font-size:1.5rem;margin:0 0 8px;">Còn tiếp những kỷ niệm đẹp...</p>
        <p style="font-size:0.85rem;margin:0;">Nhấn “+ Thêm trang” ở thanh công cụ để viết tiếp câu chuyện của bạn.</p>
      </div>
    `;
    return page;
  }

  /**
   * Renders a real numbered scrapbook page (1-based index in album.pages)
   */
  function renderScrapbookPage(options) {
    const {
      album,
      pageIndex, // 0-based inside album.pages
      side,      // 'left' or 'right'
      editable = false,
      selection = {},
      callbacks = {},
    } = options;

    if (pageIndex < 0) return renderInsideCover(album, editable);
    if (pageIndex >= album.pages.length) return renderBlankBackPage(side);

    const pageData = album.pages[pageIndex];
    const layoutDef = PTB.Assets.getLayoutById(pageData.layout);

    const el = document.createElement('div');
    const toneClass = pageData.paperTone && pageData.paperTone !== 'ivory' ? `paper-${pageData.paperTone}` : '';
    el.className = `scrapbook-page page-side-${side} ${toneClass}`;
    el.dataset.pageId = pageData.id;
    el.dataset.pageIndex = pageIndex;

    // Header: Title + Date
    const headerRow = document.createElement('div');
    headerRow.className = 'page-header-row';

    const titleEl = document.createElement('div');
    titleEl.className = 'page-title-input';
    titleEl.style.fontFamily = pageData.titleFont || 'var(--font-hand)';
    titleEl.textContent = pageData.title || 'Trang kỷ niệm';
    if (editable) {
      titleEl.contentEditable = 'true';
      titleEl.spellcheck = false;
      titleEl.addEventListener('blur', () => {
        const val = titleEl.textContent.trim();
        if (val !== pageData.title && callbacks.onUpdatePageField) {
          callbacks.onUpdatePageField(pageIndex, 'title', val || 'Trang kỷ niệm');
        }
      });
    }

    const dateEl = document.createElement('div');
    dateEl.className = 'page-date-badge';
    dateEl.textContent = pageData.date || 'Hôm nay';
    if (editable) {
      dateEl.contentEditable = 'true';
      dateEl.spellcheck = false;
      dateEl.addEventListener('blur', () => {
        const val = dateEl.textContent.trim();
        if (val !== pageData.date && callbacks.onUpdatePageField) {
          callbacks.onUpdatePageField(pageIndex, 'date', val);
        }
      });
    }

    headerRow.appendChild(titleEl);
    headerRow.appendChild(dateEl);
    el.appendChild(headerRow);

    // Content Grid according to Layout 1..8
    const contentGrid = document.createElement('div');
    contentGrid.className = `page-content-grid ${layoutDef.id}`;

    // Render photo slots
    const neededSlots = layoutDef.slots;
    for (let sIdx = 0; sIdx < neededSlots; sIdx++) {
      const slotData = pageData.photos[sIdx] || {
        id: `empty_${sIdx}`,
        src: '',
        caption: '',
        frame: layoutDef.defaultFrame,
        zoom: 1,
        panX: 0,
        panY: 0,
        imgRotate: 0,
        frameRotate: 0,
      };

      const slotEl = document.createElement('div');
      const isSelected =
        editable &&
        selection.type === 'photo' &&
        selection.pageIndex === pageIndex &&
        selection.slotIndex === sIdx;

      slotEl.className = `photo-slot slot-${sIdx} frame-${slotData.frame || 'polaroid'} ${isSelected ? 'is-selected' : ''}`;
      if (slotData.frameRotate) {
        slotEl.style.transform = `rotate(${slotData.frameRotate}deg)`;
      }

      const frameBox = document.createElement('div');
      frameBox.className = 'photo-frame-box';

      const viewport = document.createElement('div');
      viewport.className = 'photo-viewport';

      if (slotData.src) {
        const img = document.createElement('img');
        img.src = slotData.src;
        img.alt = slotData.caption || 'Memory photo';
        img.style.transform = `translate(${slotData.panX || 0}px, ${slotData.panY || 0}px) scale(${slotData.zoom || 1}) rotate(${slotData.imgRotate || 0}deg)`;
        viewport.appendChild(img);
      } else {
        viewport.innerHTML = `
          <div class="photo-empty-placeholder">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <span>${editable ? 'Nhấn hoặc kéo ảnh vào đây' : 'Chưa có ảnh'}</span>
          </div>
        `;
      }

      frameBox.appendChild(viewport);

      // Caption inside Polaroid / Film or below other frames
      const captionEl = document.createElement('div');
      captionEl.className = 'photo-caption';
      captionEl.textContent = slotData.caption || (editable ? 'Thêm chú thích...' : '');
      if (!slotData.caption && editable) {
        captionEl.style.opacity = '0.55';
      }
      if (editable) {
        captionEl.contentEditable = 'true';
        captionEl.spellcheck = false;
        captionEl.addEventListener('focus', () => {
          if (captionEl.textContent === 'Thêm chú thích...') {
            captionEl.textContent = '';
            captionEl.style.opacity = '1';
          }
        });
        captionEl.addEventListener('blur', () => {
          const val = captionEl.textContent.trim();
          if (callbacks.onUpdatePhotoCaption) {
            callbacks.onUpdatePhotoCaption(pageIndex, sIdx, val);
          }
        });
        captionEl.addEventListener('click', (e) => e.stopPropagation());
      }

      if (slotData.frame === 'polaroid' || slotData.frame === 'film') {
        frameBox.appendChild(captionEl);
        slotEl.appendChild(frameBox);
      } else {
        slotEl.appendChild(frameBox);
        if (slotData.caption || editable) {
          slotEl.appendChild(captionEl);
        }
      }

      if (editable) {
        // Click slot to select or immediately upload if empty
        slotEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (callbacks.onSelectPhotoSlot) {
            callbacks.onSelectPhotoSlot(pageIndex, sIdx, !slotData.src);
          }
        });

        // Drag-and-drop image file directly onto frame
        slotEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          slotEl.classList.add('drag-over');
        });
        slotEl.addEventListener('dragleave', () => {
          slotEl.classList.remove('drag-over');
        });
        slotEl.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          slotEl.classList.remove('drag-over');
          const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (file && callbacks.onDropPhotoFile) {
            callbacks.onDropPhotoFile(pageIndex, sIdx, file);
          }
        });
      }

      contentGrid.appendChild(slotEl);
    }

    // Journal Note Area for layouts that include writing space
    if (layoutDef.hasNote) {
      const noteEl = document.createElement('div');
      noteEl.className = 'page-note-area';
      const ns = pageData.noteStyle || {};
      noteEl.style.fontFamily = ns.font || 'var(--font-body)';
      noteEl.style.fontSize = `${ns.size || 13}px`;
      noteEl.style.color = ns.color || '#594638';
      noteEl.style.textAlign = ns.align || 'left';
      noteEl.textContent = pageData.note || (editable ? 'Viết vài dòng tâm sự cho trang này...' : '');
      if (!pageData.note && editable) noteEl.style.opacity = '0.55';

      if (editable) {
        noteEl.contentEditable = 'true';
        noteEl.spellcheck = false;
        noteEl.addEventListener('focus', () => {
          if (noteEl.textContent === 'Viết vài dòng tâm sự cho trang này...') {
            noteEl.textContent = '';
            noteEl.style.opacity = '1';
          }
          if (callbacks.onSelectText) callbacks.onSelectText(pageIndex, 'note');
        });
        noteEl.addEventListener('blur', () => {
          const val = noteEl.textContent.trim();
          if (val !== pageData.note && callbacks.onUpdatePageField) {
            callbacks.onUpdatePageField(pageIndex, 'note', val);
          }
        });
        noteEl.addEventListener('click', (e) => e.stopPropagation());
      }
      contentGrid.appendChild(noteEl);
    }

    el.appendChild(contentGrid);

    // Stickers & Free Notes Layer
    const decorLayer = document.createElement('div');
    decorLayer.className = 'page-decor-layer';

    (pageData.decors || []).forEach((decor, dIdx) => {
      const itemEl = document.createElement('div');
      const isSelected =
        editable &&
        selection.type === 'decor' &&
        selection.pageIndex === pageIndex &&
        selection.decorIndex === dIdx;

      itemEl.className = `decor-item ${isSelected ? 'is-selected' : ''}`;
      itemEl.dataset.pageIndex = String(pageIndex);
      itemEl.dataset.decorIndex = String(dIdx);
      itemEl.style.left = `${decor.x}%`;
      itemEl.style.top = `${decor.y}%`;
      itemEl.style.transform = `translate(-50%, -50%) rotate(${decor.rotate || 0}deg) scale(${decor.scale || 1})`;

      if (decor.type === 'sticker') {
        const st = PTB.Assets.getStickerById(decor.stickerId);
        if (st) {
          itemEl.style.width = `${st.width}px`;
          itemEl.innerHTML = st.svg;
        }
      } else if (decor.type === 'free-photo') {
        itemEl.classList.add('is-free-photo', `frame-${decor.frame || 'polaroid'}`);
        itemEl.style.width = '220px';

        const frameBox = document.createElement('div');
        frameBox.className = 'photo-frame-box';

        const viewport = document.createElement('div');
        viewport.className = 'photo-viewport';

        if (decor.src) {
          const img = document.createElement('img');
          img.src = decor.src;
          img.alt = decor.caption || 'Free photo';
          img.style.transform = `translate(${decor.panX || 0}px, ${decor.panY || 0}px) scale(${decor.zoom || 1}) rotate(${decor.imgRotate || 0}deg)`;
          viewport.appendChild(img);
        } else {
          viewport.innerHTML = `
            <div class="photo-empty-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span>Chưa có ảnh</span>
            </div>
          `;
        }

        frameBox.appendChild(viewport);

        const captionEl = document.createElement('div');
        captionEl.className = 'photo-caption';
        captionEl.textContent = decor.caption || (editable ? 'Thêm chú thích...' : '');
        if (!decor.caption && editable) {
          captionEl.style.opacity = '0.55';
        }
        if (editable) {
          captionEl.contentEditable = 'true';
          captionEl.spellcheck = false;
          captionEl.addEventListener('focus', () => {
            if (captionEl.textContent === 'Thêm chú thích...') {
              captionEl.textContent = '';
              captionEl.style.opacity = '1';
            }
          });
          captionEl.addEventListener('blur', () => {
            const val = captionEl.textContent.trim();
            if (callbacks.onUpdateDecor) {
              callbacks.onUpdateDecor(pageIndex, dIdx, { caption: val });
            }
          });
          captionEl.addEventListener('click', (e) => e.stopPropagation());
          captionEl.addEventListener('pointerdown', (e) => e.stopPropagation());
        }

        if (decor.frame === 'polaroid' || decor.frame === 'film') {
          frameBox.appendChild(captionEl);
          itemEl.appendChild(frameBox);
        } else {
          itemEl.appendChild(frameBox);
          if (decor.caption || editable) {
            itemEl.appendChild(captionEl);
          }
        }
      } else if (decor.type === 'free-text') {
        itemEl.classList.add('is-free-text');
        const box = document.createElement('div');
        box.className = 'free-text-box';
        box.style.fontFamily = decor.font || 'var(--font-hand)';
        box.style.fontSize = `${decor.fontSize || 22}px`;
        box.style.color = decor.color || '#594638';
        box.style.textAlign = decor.align || 'center';
        box.style.background = decor.bg || 'transparent';
        box.textContent = decor.text || 'Gõ chữ ở đây...';

        if (editable) {
          box.contentEditable = 'true';
          box.spellcheck = false;
          box.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            box.focus();
          });
          box.addEventListener('blur', () => {
            if (callbacks.onUpdateDecor) {
              callbacks.onUpdateDecor(pageIndex, dIdx, { text: box.textContent.trim() });
            }
          });
          box.addEventListener('click', (e) => {
            if (document.activeElement === box) e.stopPropagation();
          });
          box.addEventListener('pointerdown', (e) => {
            if (document.activeElement === box) e.stopPropagation();
          });
        }
        itemEl.appendChild(box);
      } else if (decor.type === 'note') {
        const box = document.createElement('div');
        box.className = 'free-note-box';
        box.style.background = decor.bg || '#FCF3D9';
        if (decor.font) box.style.fontFamily = decor.font;
        if (decor.fontSize) box.style.fontSize = `${decor.fontSize}px`;
        if (decor.color) box.style.color = decor.color;
        if (decor.align) box.style.textAlign = decor.align;
        box.textContent = decor.text || 'Ghi chú nhỏ...';
        if (editable) {
          box.contentEditable = 'true';
          box.spellcheck = false;
          box.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            box.focus();
          });
          box.addEventListener('blur', () => {
            if (callbacks.onUpdateDecor) {
              callbacks.onUpdateDecor(pageIndex, dIdx, { text: box.textContent.trim() });
            }
          });
          box.addEventListener('click', (e) => {
            if (document.activeElement === box) e.stopPropagation();
          });
          box.addEventListener('pointerdown', (e) => {
            if (document.activeElement === box) e.stopPropagation();
          });
        }
        itemEl.appendChild(box);
      }

      if (editable) {
        // Delete / Rotate / Resize Handles
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'decor-handle-delete';
        delBtn.title = 'Xóa trang trí';
        delBtn.textContent = '×';
        delBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (callbacks.onDeleteDecor) callbacks.onDeleteDecor(pageIndex, dIdx);
        });

        const rotBtn = document.createElement('div');
        rotBtn.className = 'decor-handle-rotate';
        rotBtn.title = 'Kéo để xoay';
        rotBtn.textContent = '↻';

        const resBtn = document.createElement('div');
        resBtn.className = 'decor-handle-resize';
        resBtn.title = 'Kéo để phóng to/thu nhỏ';
        resBtn.textContent = '↘';

        itemEl.appendChild(delBtn);
        itemEl.appendChild(rotBtn);
        itemEl.appendChild(resBtn);

        attachDecorPointerHandlers(itemEl, decorLayer, decor, pageIndex, dIdx, callbacks);
      }

      decorLayer.appendChild(itemEl);
    });

    el.appendChild(decorLayer);

    // Optional Page Tags Strip
    if (Array.isArray(pageData.tags) && pageData.tags.length) {
      const tagsStrip = document.createElement('div');
      tagsStrip.className = 'page-tags-strip';
      pageData.tags.forEach((tag) => {
        const pill = document.createElement('span');
        pill.className = 'page-tag-pill';
        pill.textContent = tag;
        tagsStrip.appendChild(pill);
      });
      el.appendChild(tagsStrip);
    }

    // Page Number at bottom corner
    const numEl = document.createElement('div');
    numEl.className = 'page-footer-number';
    numEl.textContent = `Trang ${pageIndex + 1}`;
    el.appendChild(numEl);

    if (editable) {
      el.addEventListener('click', () => {
        if (callbacks.onFocusPage) callbacks.onFocusPage(pageIndex);
      });
    }

    return el;
  }

  function attachDecorPointerHandlers(itemEl, containerEl, decor, pageIndex, decorIndex, callbacks) {
    // Prevent click bubbling to page background (which would deselect the decor)
    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Move by dragging item body
    itemEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.classList.contains('decor-handle-delete') ||
          e.target.classList.contains('decor-handle-rotate') ||
          e.target.classList.contains('decor-handle-resize')) {
        return;
      }
      // Allow editing text directly on focused contenteditable note or caption
      if (e.target.isContentEditable) {
        if (itemEl.classList.contains('is-selected') || document.activeElement === e.target) {
          return;
        }
      }

      e.stopPropagation();
      e.preventDefault();
      if (callbacks.onSelectDecor) callbacks.onSelectDecor(pageIndex, decorIndex);

      const rect = containerEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const origX = decor.x;
      const origY = decor.y;
      const baseRot = decor.rotate || 0;
      const baseScale = decor.scale || 1;
      const pointerId = e.pointerId;
      let latestClientX = startX;
      let latestClientY = startY;
      let liveX = origX;
      let liveY = origY;
      let moved = false;
      let rafId = 0;

      try {
        itemEl.setPointerCapture(pointerId);
      } catch {}

      function applyDragFrame() {
        rafId = 0;
        const dxPct = ((latestClientX - startX) / rect.width) * 100;
        const dyPct = ((latestClientY - startY) / rect.height) * 100;
        if (Math.abs(dxPct) > 0.3 || Math.abs(dyPct) > 0.3) moved = true;
        liveX = Math.max(4, Math.min(96, origX + dxPct));
        liveY = Math.max(4, Math.min(96, origY + dyPct));
        const clampedDxPx = ((liveX - origX) / 100) * rect.width;
        const clampedDyPx = ((liveY - origY) / 100) * rect.height;
        itemEl.style.transform = `translate3d(${clampedDxPx}px, ${clampedDyPx}px, 0) translate(-50%, -50%) rotate(${baseRot}deg) scale(${baseScale})`;
      }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        latestClientX = ev.clientX;
        latestClientY = ev.clientY;
        if (!rafId) {
          rafId = global.requestAnimationFrame(applyDragFrame);
        }
      }

      function onUp(ev) {
        if (ev.pointerId !== pointerId) return;
        if (rafId) {
          global.cancelAnimationFrame(rafId);
          applyDragFrame();
        }
        try {
          if (itemEl.hasPointerCapture(pointerId)) {
            itemEl.releasePointerCapture(pointerId);
          }
        } catch {}
        global.removeEventListener('pointermove', onMove);
        global.removeEventListener('pointerup', onUp);
        global.removeEventListener('pointercancel', onUp);

        itemEl.style.left = `${liveX}%`;
        itemEl.style.top = `${liveY}%`;
        itemEl.style.transform = `translate(-50%, -50%) rotate(${baseRot}deg) scale(${baseScale})`;
        decor._liveX = liveX;
        decor._liveY = liveY;

        if (moved && callbacks.onUpdateDecor) {
          callbacks.onUpdateDecor(pageIndex, decorIndex, {
            x: Math.round(liveX * 10) / 10,
            y: Math.round(liveY * 10) / 10,
          });
        }
      }

      global.addEventListener('pointermove', onMove);
      global.addEventListener('pointerup', onUp);
      global.addEventListener('pointercancel', onUp);
    });

    // Rotate handle
    const rotHandle = itemEl.querySelector('.decor-handle-rotate');
    rotHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const box = itemEl.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const pointerId = e.pointerId;
      let liveRot = decor.rotate || 0;

      try {
        rotHandle.setPointerCapture(pointerId);
      } catch {}

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
        liveRot = Math.round(angle);
        itemEl.style.transform = `translate(-50%, -50%) rotate(${liveRot}deg) scale(${decor.scale || 1})`;
      }

      function onUp(ev) {
        if (ev.pointerId !== pointerId) return;
        try {
          if (rotHandle.hasPointerCapture(pointerId)) {
            rotHandle.releasePointerCapture(pointerId);
          }
        } catch {}
        global.removeEventListener('pointermove', onMove);
        global.removeEventListener('pointerup', onUp);
        global.removeEventListener('pointercancel', onUp);
        if (callbacks.onUpdateDecor) {
          callbacks.onUpdateDecor(pageIndex, decorIndex, { rotate: liveRot });
        }
      }

      global.addEventListener('pointermove', onMove);
      global.addEventListener('pointerup', onUp);
      global.addEventListener('pointercancel', onUp);
    });

    // Resize handle
    const resHandle = itemEl.querySelector('.decor-handle-resize');
    resHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origScale = decor.scale || 1;
      const pointerId = e.pointerId;
      let liveScale = origScale;

      try {
        resHandle.setPointerCapture(pointerId);
      } catch {}

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const delta = (ev.clientX - startX) / 90;
        liveScale = Math.max(0.45, Math.min(2.3, Math.round((origScale + delta) * 100) / 100));
        itemEl.style.transform = `translate(-50%, -50%) rotate(${decor.rotate || 0}deg) scale(${liveScale})`;
      }

      function onUp(ev) {
        if (ev.pointerId !== pointerId) return;
        try {
          if (resHandle.hasPointerCapture(pointerId)) {
            resHandle.releasePointerCapture(pointerId);
          }
        } catch {}
        global.removeEventListener('pointermove', onMove);
        global.removeEventListener('pointerup', onUp);
        global.removeEventListener('pointercancel', onUp);
        if (callbacks.onUpdateDecor) {
          callbacks.onUpdateDecor(pageIndex, decorIndex, { scale: liveScale });
        }
      }

      global.addEventListener('pointermove', onMove);
      global.addEventListener('pointerup', onUp);
      global.addEventListener('pointercancel', onUp);
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  PTB.PageRenderer = {
    renderScrapbookPage,
    escapeHtml,
  };
})(window);
