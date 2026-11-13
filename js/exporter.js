/* ==========================================================================
   PTB Online – Share Link Modal, PNG Canvas Exporter & PDF Print Export
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  function openShareModal(album, onTogglePrivacy) {
    const modal = document.getElementById('shareModal');
    const urlInput = document.getElementById('shareUrlInput');
    const privacyBadge = document.getElementById('sharePrivacyBadge');
    const privacyStatus = document.getElementById('sharePrivacyStatus');
    const toggleBtn = document.getElementById('shareTogglePrivacyBtn');
    const publishBtn = document.getElementById('publishCloudBtn');
    const syncStatus = document.getElementById('cloudSyncStatus');
    const syncStatusText = document.getElementById('cloudSyncStatusText');

    const refreshUI = () => {
      const isPublic = album.privacy === 'public';
      if (privacyBadge) {
        privacyBadge.textContent = isPublic ? 'Công khai' : 'Riêng tư';
        privacyBadge.className = `share-badge ${isPublic ? 'badge-public' : 'badge-private'}`;
      }
      if (privacyStatus) {
        privacyStatus.textContent = isPublic
          ? 'Công khai — Cuốn sổ sẵn sàng để đăng tải và chia sẻ trực tuyến qua đám mây.'
          : 'Riêng tư — Cuốn sổ đang khóa mật khẩu trên máy. Hãy chuyển sang Công khai để bạn bè có thể mở xem qua mạng.';
      }
      if (toggleBtn) {
        toggleBtn.textContent = isPublic ? 'Khóa lại (Chuyển sang Riêng tư)' : 'Mở khóa sang Công khai';
      }

      if (publishBtn) {
        publishBtn.disabled = !isPublic;
        if (!isPublic) {
          publishBtn.textContent = 'Chỉ áp dụng cho cuốn sổ Công khai';
          if (urlInput) {
            urlInput.value = '';
            urlInput.placeholder = 'Chuyển sang Công khai để tạo đường link...';
          }
          if (syncStatus) syncStatus.classList.add('hidden');
        } else {
          const hasCloud = Boolean(album.cloudShareId && PTB.Cloud && PTB.Cloud.isConfigured());
          publishBtn.textContent = hasCloud
            ? '☁️ Cập nhật lại dữ liệu lên đám mây'
            : '☁️ Đăng tải & Tạo đường link chia sẻ';
          if (hasCloud && urlInput) {
            urlInput.value = PTB.Cloud.buildShareUrl(album.cloudShareId);
            if (syncStatus && syncStatusText) {
              syncStatus.classList.remove('hidden');
              syncStatusText.textContent = `Đã đồng bộ lên đám mây (Mã: ${album.cloudShareId})`;
            }
          } else if (urlInput) {
            urlInput.value = '';
            urlInput.placeholder = 'Bấm "Đăng tải & Tạo đường link" để đưa lên đám mây...';
            if (syncStatus) syncStatus.classList.add('hidden');
          }
        }
      }
    };

    refreshUI();

    toggleBtn.onclick = () => {
      if (album.privacy === 'public') {
        if (!album.passwordHash) {
          modal.classList.add('hidden');
          PTB.Home.openPasswordModal(album, 'set', () => {
            album.privacy = 'private';
            refreshUI();
            if (onTogglePrivacy) onTogglePrivacy(album);
            modal.classList.remove('hidden');
            PTB.UI.showToast('Đã chuyển sang Riêng tư và cài mật khẩu!');
          });
          return;
        }
        album.privacy = 'private';
      } else {
        album.privacy = 'public';
      }
      refreshUI();
      if (onTogglePrivacy) onTogglePrivacy(album);
    };

    publishBtn.onclick = async () => {
      if (album.privacy === 'private') {
        PTB.UI.showToast('Hãy chuyển cuốn sổ sang Công khai trước khi chia sẻ!');
        return;
      }

      if (!PTB.Cloud || !PTB.Cloud.isConfigured()) {
        PTB.UI.showToast('Vui lòng kết nối dự án Supabase để tạo đường link trực tuyến.');
        openSupabaseConfigModal(() => refreshUI());
        return;
      }

      publishBtn.disabled = true;
      publishBtn.textContent = '⏳ Đang đồng bộ lên Supabase...';
      if (syncStatus && syncStatusText) {
        syncStatus.classList.remove('hidden');
        syncStatusText.textContent = 'Đang đẩy toàn bộ các trang và sticker lên máy chủ đám mây...';
      }

      try {
        const res = await PTB.Cloud.publishAlbum(album);
        urlInput.value = res.shareUrl;
        publishBtn.textContent = '☁️ Cập nhật lại dữ liệu lên đám mây';
        publishBtn.disabled = false;
        if (syncStatus && syncStatusText) {
          syncStatusText.textContent = `Đã đồng bộ thành công! Mã: ${res.shareId}`;
        }
        if (onTogglePrivacy) onTogglePrivacy(album);
        PTB.UI.showToast('Đã xuất bản cuốn sổ lên đám mây! Bạn có thể gửi đường link cho bạn bè.');
      } catch (err) {
        publishBtn.disabled = false;
        publishBtn.textContent = '☁️ Thử đăng tải lại';
        if (syncStatus && syncStatusText) {
          syncStatusText.textContent = `Lỗi: ${err.message || 'Không thể tải lên'}`;
        }
        PTB.UI.showToast(err.message || 'Không thể đăng tải lên đám mây.');
      }
    };

    document.getElementById('copyShareLinkBtn').onclick = async () => {
      if (!urlInput.value) {
        PTB.UI.showToast('Chưa có đường link đám mây. Hãy bấm "Đăng tải" trước nhé!');
        return;
      }
      try {
        await navigator.clipboard.writeText(urlInput.value);
        PTB.UI.showToast('Đã sao chép đường link chia sẻ qua mạng!');
      } catch {
        urlInput.select();
        document.execCommand('copy');
        PTB.UI.showToast('Đã sao chép đường link!');
      }
    };

    document.getElementById('openSupabaseConfigBtn').onclick = () => {
      openSupabaseConfigModal(() => refreshUI());
    };

    document.getElementById('exportJsonBackupBtn').onclick = () => {
      const blob = new Blob([JSON.stringify(album, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(album.title)}.ptb.json`;
      a.click();
      URL.revokeObjectURL(url);
      PTB.UI.showToast('Đã tải xuống tệp sao lưu cuốn sổ (.ptb.json)');
    };

    modal.classList.remove('hidden');
  }

  function openSupabaseConfigModal(onSaved) {
    const modal = document.getElementById('supabaseConfigModal');
    if (!modal) return;
    const urlInput = document.getElementById('sbUrlInput');
    const keyInput = document.getElementById('sbAnonKeyInput');
    const feedback = document.getElementById('sbTestFeedback');

    const cur = PTB.Cloud ? PTB.Cloud.getConfig() : { url: '', anonKey: '' };
    urlInput.value = cur.url || '';
    keyInput.value = cur.anonKey || '';
    if (feedback) {
      feedback.classList.add('hidden');
      feedback.textContent = '';
      feedback.className = 'sb-test-feedback hidden';
    }

    modal.classList.remove('hidden');

    document.getElementById('sbConfigSaveBtn').onclick = () => {
      try {
        PTB.Cloud.saveConfig(urlInput.value, keyInput.value);
        modal.classList.add('hidden');
        PTB.UI.showToast('Đã lưu cấu hình Supabase Cloud thành công!');
        if (onSaved) onSaved();
      } catch (err) {
        PTB.UI.showToast(err.message || 'Lỗi lưu cấu hình.');
      }
    };
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function resolveCanvasFont(fontVal, fallback = 'Lora, Georgia, serif') {
    const map = {
      'var(--font-hand)': 'Caveat, cursive',
      'var(--font-script)': 'Dancing Script, cursive',
      'var(--font-display)': '"Playfair Display", Georgia, serif',
      'var(--font-editorial)': '"Cormorant Garamond", Georgia, serif',
      'var(--font-body)': 'Lora, Georgia, serif',
      'var(--font-ui)': 'Nunito, sans-serif',
    };
    return map[fontVal] || fontVal || fallback;
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function getLayoutGeometry(layoutId, area) {
    const { x, y, w, h } = area;
    const g = 28;
    switch (layoutId) {
      case 'layout-2': {
        const cw = (w - g) / 2;
        const ch = h * 0.66;
        return {
          slots: [
            { x, y: y + 16, w: cw, h: ch, defaultTilt: -2.2 },
            { x: x + cw + g, y: y + 32, w: cw, h: ch, defaultTilt: 2.1 },
          ],
          noteBox: { x: x + 16, y: y + ch + 56, w: w - 32, h: h - ch - 60, alignDefault: 'center' },
        };
      }
      case 'layout-3': {
        const leftW = w * 0.57;
        const rightW = w - leftW - g;
        const rh = (h - g) / 2;
        return {
          slots: [
            { x, y: y + h * 0.04, w: leftW, h: h * 0.92, defaultTilt: 0 },
            { x: x + leftW + g, y, w: rightW, h: rh, defaultTilt: 2 },
            { x: x + leftW + g, y: y + rh + g, w: rightW, h: rh, defaultTilt: -2 },
          ],
          noteBox: null,
        };
      }
      case 'layout-4': {
        const cw = (w - g) / 2;
        const ch = (h - g) / 2;
        return {
          slots: [
            { x, y, w: cw, h: ch, defaultTilt: -2.5 },
            { x: x + cw + g, y: y + 10, w: cw, h: ch, defaultTilt: 1.8 },
            { x, y: y + ch + g - 8, w: cw, h: ch, defaultTilt: 1.5 },
            { x: x + cw + g, y: y + ch + g, w: cw, h: ch, defaultTilt: -1.8 },
          ],
          noteBox: null,
        };
      }
      case 'layout-5': {
        const lw = w * 0.51;
        const rw = w - lw - g;
        return {
          slots: [{ x, y: y + 20, w: lw, h: h - 40, defaultTilt: 0 }],
          noteBox: { x: x + lw + g, y: y + 60, w: rw, h: h - 120, alignDefault: 'left', verticalCenter: true },
        };
      }
      case 'layout-6': {
        const cw = (w - g * 2) / 3;
        const ch = h * 0.6;
        return {
          slots: [
            { x, y: y + 12, w: cw, h: ch, defaultTilt: -2 },
            { x: x + cw + g, y: y + 32, w: cw, h: ch, defaultTilt: 1.5 },
            { x: x + (cw + g) * 2, y: y + 12, w: cw, h: ch, defaultTilt: -1.2 },
          ],
          noteBox: { x: x + 16, y: y + ch + 64, w: w - 32, h: h - ch - 68, alignDefault: 'center' },
        };
      }
      case 'layout-7': {
        const sw = w * 0.44;
        const sh = h * 0.52;
        return {
          ruled: true,
          slots: [{ x: x + w - sw - 8, y: y + h - sh - 12, w: sw, h: sh, defaultTilt: 3 }],
          noteBox: { x: x + 12, y: y + 10, w: w * 0.55, h: h - 30, alignDefault: 'left' },
        };
      }
      case 'layout-8': {
        return {
          slots: [{ x, y, w, h, defaultTilt: 0 }],
          noteBox: {
            x: x + 28,
            y: y + h - 170,
            w: w - 56,
            h: 138,
            alignDefault: 'center',
            cardBg: 'rgba(255, 253, 247, 0.9)',
          },
        };
      }
      case 'layout-1':
      default: {
        const sw = w * 0.84;
        const sh = h * 0.72;
        return {
          slots: [{ x: x + (w - sw) / 2, y: y + 8, w: sw, h: sh, defaultTilt: 0 }],
          noteBox: { x: x + 24, y: y + sh + 38, w: w - 48, h: h - sh - 44, alignDefault: 'center' },
        };
      }
    }
  }

  async function drawFramedPhoto(ctx, slot, box) {
    const frame = slot.frame || 'polaroid';
    const rot = ((slot.frameRotate ?? box.defaultTilt ?? 0) * Math.PI) / 180;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const fw = box.w;
    const fh = box.h;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // Collage back card
    if (frame === 'collage') {
      ctx.save();
      ctx.rotate((3.8 * Math.PI) / 180);
      ctx.fillStyle = '#EFE4D2';
      ctx.strokeStyle = 'rgba(184, 155, 123, 0.45)';
      ctx.lineWidth = 2;
      ctx.fillRect(-fw / 2 + 10, -fh / 2 + 8, fw, fh);
      ctx.strokeRect(-fw / 2 + 10, -fh / 2 + 8, fw, fh);
      ctx.restore();
    }

    // Frame drop shadow & container
    ctx.shadowColor = 'rgba(89, 70, 56, 0.18)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    let padTop = 14, padSide = 14, padBottom = 18, radius = 4;
    if (frame === 'polaroid') {
      padTop = 18; padSide = 18; padBottom = 70; radius = 4;
      ctx.fillStyle = '#FFFFFF';
      roundedRectPath(ctx, -fw / 2, -fh / 2, fw, fh, radius);
      ctx.fill();
    } else if (frame === 'vintage') {
      padTop = 18; padSide = 18; padBottom = 18; radius = 2;
      ctx.fillStyle = '#F4E8D4';
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
    } else if (frame === 'minimal') {
      padTop = 10; padSide = 10; padBottom = 10; radius = 24;
      ctx.fillStyle = '#FFFDF7';
      roundedRectPath(ctx, -fw / 2, -fh / 2, fw, fh, radius);
      ctx.fill();
    } else if (frame === 'film') {
      padTop = 16; padSide = 40; padBottom = slot.caption ? 42 : 16; radius = 6;
      ctx.fillStyle = '#2C241E';
      roundedRectPath(ctx, -fw / 2, -fh / 2, fw, fh, radius);
      ctx.fill();
    } else if (frame === 'taped') {
      padTop = 0; padSide = 0; padBottom = 0; radius = 2;
      ctx.fillStyle = '#ECE2D0';
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
    } else {
      padTop = 14; padSide = 14; padBottom = 14; radius = 2;
      ctx.fillStyle = '#FFFDF7';
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
    }
    ctx.shadowColor = 'transparent';

    if (frame === 'vintage') {
      ctx.strokeStyle = '#B89B7B';
      ctx.lineWidth = 4;
      ctx.strokeRect(-fw / 2, -fh / 2, fw, fh);
      ctx.strokeStyle = 'rgba(89, 70, 56, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-fw / 2 + 10, -fh / 2 + 10, fw - 20, fh - 20);
    } else if (frame === 'minimal') {
      ctx.strokeStyle = 'rgba(184, 155, 123, 0.45)';
      ctx.lineWidth = 2;
      roundedRectPath(ctx, -fw / 2, -fh / 2, fw, fh, radius);
      ctx.stroke();
    } else if (frame === 'collage' || frame === 'polaroid') {
      ctx.strokeStyle = 'rgba(184, 155, 123, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-fw / 2, -fh / 2, fw, fh);
    }

    // Film sprocket holes
    if (frame === 'film') {
      ctx.fillStyle = 'rgba(245, 239, 227, 0.85)';
      for (let sy = -fh / 2 + 16; sy < fh / 2 - 16; sy += 26) {
        ctx.fillRect(-fw / 2 + 11, sy, 16, 13);
        ctx.fillRect(fw / 2 - 27, sy, 16, 13);
      }
    }

    // Photo viewport
    const vx = -fw / 2 + padSide;
    const vy = -fh / 2 + padTop;
    const vw = fw - padSide * 2;
    const vh = fh - padTop - padBottom;

    ctx.save();
    roundedRectPath(ctx, vx, vy, vw, vh, frame === 'minimal' ? 18 : 2);
    ctx.clip();

    if (slot.src) {
      const img = await loadImage(slot.src);
      if (img) {
        const imgRatio = img.width / img.height;
        const boxRatio = vw / vh;
        let dw = vw;
        let dh = vh;
        if (imgRatio > boxRatio) {
          dh = vh;
          dw = vh * imgRatio;
        } else {
          dw = vw;
          dh = vw / imgRatio;
        }
        const zoom = slot.zoom || 1;
        const panX = (slot.panX || 0) * 2.2;
        const panY = (slot.panY || 0) * 2.2;
        const imgRot = ((slot.imgRotate || 0) * Math.PI) / 180;

        ctx.translate(vx + vw / 2 + panX, vy + vh / 2 + panY);
        ctx.rotate(imgRot);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      }
    } else {
      ctx.fillStyle = '#F5EFE3';
      ctx.fillRect(vx, vy, vw, vh);
    }
    ctx.restore();

    // Vintage corner brackets
    if (frame === 'vintage') {
      ctx.strokeStyle = '#6E5440';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-fw / 2 + 6, -fh / 2 + 34);
      ctx.lineTo(-fw / 2 + 6, -fh / 2 + 6);
      ctx.lineTo(-fw / 2 + 34, -fh / 2 + 6);
      ctx.moveTo(fw / 2 - 34, fh / 2 - 6);
      ctx.lineTo(fw / 2 - 6, fh / 2 - 6);
      ctx.lineTo(fw / 2 - 6, fh / 2 - 34);
      ctx.stroke();
    }

    // Taped Washi Tape corners
    if (frame === 'taped') {
      const drawTape = (tx, ty, angleDeg, bg) => {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate((angleDeg * Math.PI) / 180);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = bg;
        ctx.fillRect(-44, -14, 88, 28);
        ctx.restore();
      };
      drawTape(-fw / 2 + 24, -fh / 2 + 6, -28, '#EBCFCB');
      drawTape(fw / 2 - 24, -fh / 2 + 6, 26, '#C8D2C0');
    }

    // Caption
    if (slot.caption) {
      if (frame === 'polaroid') {
        ctx.fillStyle = '#594638';
        ctx.font = 'bold 30px Caveat, cursive';
        ctx.textAlign = 'center';
        ctx.fillText(slot.caption, 0, fh / 2 - 22, vw);
      } else if (frame === 'film') {
        ctx.fillStyle = '#E7D5BE';
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(slot.caption, 0, fh / 2 - 14, vw);
      } else {
        ctx.fillStyle = '#594638';
        ctx.font = '26px Caveat, cursive';
        ctx.textAlign = 'center';
        ctx.fillText(slot.caption, 0, fh / 2 + 26, fw);
      }
    }

    ctx.restore();
  }

  function wrapTextLines(ctx, text, maxWidth) {
    const paragraphs = String(text || '').split('\n');
    const lines = [];
    for (const para of paragraphs) {
      const words = para.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  function drawAlignedWrappedText(ctx, text, box, fontCss, fontSizePx, color, align, lineHeight) {
    ctx.save();
    ctx.font = `${fontSizePx}px ${fontCss}`;
    ctx.fillStyle = color || '#594638';
    ctx.textAlign = align || 'left';
    const lines = wrapTextLines(ctx, text, box.w);
    let startY = box.y + fontSizePx;
    if (box.verticalCenter) {
      const totalH = lines.length * lineHeight;
      startY = box.y + Math.max(0, (box.h - totalH) / 2) + fontSizePx;
    }
    const drawX = align === 'center' ? box.x + box.w / 2 : align === 'right' ? box.x + box.w : box.x;
    lines.forEach((ln, idx) => {
      const ly = startY + idx * lineHeight;
      if (ly <= box.y + box.h + 12) {
        ctx.fillText(ln, drawX, ly);
      }
    });
    ctx.restore();
  }

  async function drawDecorOnCanvas(ctx, decor, pageW, pageH) {
    const scaleFactor = pageW / 500; // matches ~500px screen page width
    const px = ((decor.x ?? 50) / 100) * pageW;
    const py = ((decor.y ?? 50) / 100) * pageH;
    const rot = ((decor.rotate || 0) * Math.PI) / 180;
    const sc = decor.scale || 1;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(sc, sc);

    if (decor.type === 'sticker') {
      const st = PTB.Assets.getStickerById(decor.stickerId);
      if (st && st.svg) {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(st.svg)}`;
        const img = await loadImage(svgUrl);
        if (img) {
          const w = (st.width || 72) * scaleFactor;
          const ratio = img.width && img.height ? img.height / img.width : 1;
          const h = w * ratio;
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      }
    } else if (decor.type === 'note') {
      const nw = 380;
      ctx.font = '34px Caveat, cursive';
      const lines = wrapTextLines(ctx, decor.text || 'Ghi chú nhỏ...', nw - 48);
      const nh = Math.max(96, lines.length * 42 + 40);

      ctx.shadowColor = 'rgba(89, 70, 56, 0.16)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = decor.bg || '#FCF3D9';
      roundedRectPath(ctx, -nw / 2, -nh / 2, nw, nh, 6);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.fillStyle = '#D8ABA5';
      ctx.fillRect(-nw / 2, -nh / 2, 7, nh);

      ctx.fillStyle = '#594638';
      ctx.textAlign = 'left';
      lines.forEach((ln, idx) => {
        ctx.fillText(ln, -nw / 2 + 24, -nh / 2 + 44 + idx * 42);
      });
    }

    ctx.restore();
  }

  function drawPaperBackground(ctx, paperTone, W, H) {
    const toneColors = {
      ivory: '#FFFDF7',
      cream: '#FAF3E6',
      blush: '#FCF5F3',
      sage: '#F4F7F1',
      grid: '#FDFBF4',
      dotgrid: '#FCF9F2',
      kraft: '#DFC9AD',
      newspaper: '#ECE4D3',
    };
    ctx.fillStyle = toneColors[paperTone] || '#FFFDF7';
    ctx.fillRect(0, 0, W, H);

    if (paperTone === 'grid') {
      ctx.save();
      ctx.strokeStyle = 'rgba(184, 155, 123, 0.22)';
      ctx.lineWidth = 1.5;
      const step = 42;
      for (let gx = step; gx < W; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = step; gy < H; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }
      ctx.restore();
    } else if (paperTone === 'dotgrid') {
      ctx.save();
      ctx.fillStyle = 'rgba(155, 125, 94, 0.36)';
      const step = 38;
      for (let dx = step; dx < W; dx += step) {
        for (let dy = step; dy < H; dy += step) {
          ctx.beginPath();
          ctx.arc(dx, dy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (paperTone === 'kraft') {
      ctx.save();
      const grad = ctx.createRadialGradient(W * 0.2, H * 0.2, 40, W * 0.5, H * 0.5, W * 0.85);
      grad.addColorStop(0, 'rgba(255, 245, 228, 0.24)');
      grad.addColorStop(1, 'rgba(128, 96, 65, 0.14)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Deterministic recycled fiber flecks
      for (let i = 0; i < 420; i++) {
        const fx = ((i * 7919) % 1180) + 10;
        const fy = ((i * 6271) % 1580) + 10;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(95, 68, 42, 0.16)' : 'rgba(255, 248, 236, 0.18)';
        ctx.fillRect(fx, fy, (i % 4) + 2, (i % 3) + 1.5);
      }
      ctx.restore();
    } else if (paperTone === 'newspaper') {
      ctx.save();
      ctx.fillStyle = 'rgba(89, 70, 56, 0.08)';
      ctx.strokeStyle = 'rgba(89, 70, 56, 0.09)';
      const colW = (W - 140) / 2;
      const midX = W / 2;
      ctx.fillRect(56, 48, W - 112, 4);
      ctx.fillRect(56, 58, W - 112, 1.5);
      ctx.beginPath();
      ctx.moveTo(midX, 78);
      ctx.lineTo(midX, H - 56);
      ctx.stroke();

      for (const colX of [64, midX + 24]) {
        for (let y = 92; y < H - 80; y += 26) {
          if (y % 260 === 92) {
            ctx.fillRect(colX, y, colW - 32, 10);
          } else {
            const wVar = ((y * 17) % 60) + (colW - 92);
            ctx.fillRect(colX, y, wVar, 5);
          }
        }
      }
      ctx.restore();
    }
  }

  /**
   * Renders a clean, high-resolution PNG of a scrapbook page directly via Canvas 2D
   */
  async function exportPageAsPng(album, pageIndex) {
    const page = album.pages[pageIndex];
    if (!page) return;
    PTB.UI.showToast('Đang tạo ảnh PNG trang sổ...');

    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    const W = 1200;
    const H = 1600;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Paper background (solid tones & scrapbook patterns)
    drawPaperBackground(ctx, page.paperTone || 'ivory', W, H);

    // Soft border
    ctx.strokeStyle = 'rgba(184, 155, 123, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // Header Title & Date pill
    const titleFontCss = resolveCanvasFont(page.titleFont, 'Caveat, cursive');
    ctx.fillStyle = '#594638';
    ctx.font = `bold 58px ${titleFontCss}`;
    ctx.fillText(page.title || 'Trang kỷ niệm', 72, 118, W - 360);

    if (page.date) {
      ctx.font = 'bold 24px Nunito, sans-serif';
      const dw = ctx.measureText(page.date).width + 44;
      const dx = W - 72 - dw;
      const dy = 74;
      ctx.fillStyle = 'rgba(245, 239, 227, 0.92)';
      roundedRectPath(ctx, dx, dy, dw, 48, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(184, 155, 123, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#846E5C';
      ctx.textAlign = 'center';
      ctx.fillText(page.date, dx + dw / 2, dy + 32);
      ctx.textAlign = 'left';
    }

    // Content area matching layout-1..layout-8
    const contentArea = { x: 72, y: 168, w: W - 144, h: H - 270 };
    const geom = getLayoutGeometry(page.layout || 'layout-1', contentArea);

    if (geom.ruled) {
      ctx.strokeStyle = 'rgba(184, 155, 123, 0.28)';
      ctx.lineWidth = 2;
      for (let ry = contentArea.y + 44; ry < contentArea.y + contentArea.h; ry += 56) {
        ctx.beginPath();
        ctx.moveTo(contentArea.x, ry);
        ctx.lineTo(contentArea.x + contentArea.w, ry);
        ctx.stroke();
      }
    }

    const slots = page.photos || [];
    for (let i = 0; i < geom.slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      await drawFramedPhoto(ctx, slot, geom.slots[i]);
    }

    // Journal note with user's noteStyle
    if (page.note && geom.noteBox) {
      const ns = page.noteStyle || { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' };
      const noteFontCss = resolveCanvasFont(ns.font, 'Lora, Georgia, serif');
      const notePx = Math.round((ns.size || 13) * 2.25);
      const lineH = Math.round(notePx * 1.55);

      if (geom.noteBox.cardBg) {
        ctx.fillStyle = geom.noteBox.cardBg;
        roundedRectPath(ctx, geom.noteBox.x - 18, geom.noteBox.y - 12, geom.noteBox.w + 36, geom.noteBox.h, 16);
        ctx.fill();
      }

      drawAlignedWrappedText(
        ctx,
        page.note,
        geom.noteBox,
        noteFontCss,
        notePx,
        ns.color || '#594638',
        ns.align || geom.noteBox.alignDefault || 'left',
        lineH
      );
    }

    // Stickers & Free Notes (page.decors)
    for (const decor of page.decors || []) {
      await drawDecorOnCanvas(ctx, decor, W, H);
    }

    // Footer
    ctx.fillStyle = '#A5907E';
    ctx.font = 'italic 24px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${album.title} • Trang ${pageIndex + 1}`, 72, H - 52);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${slugify(album.title)}-trang-${pageIndex + 1}.png`;
    a.click();
    PTB.UI.showToast(`Đã tải xuống Trang ${pageIndex + 1} dạng PNG!`);
  }

  function exportBookToPdfPrint(album) {
    const printContainer = document.getElementById('printAllPagesContainer');
    if (!printContainer || !album || !PTB.PageRenderer) {
      PTB.UI.showToast('Đang mở hộp thoại In / Lưu PDF...');
      setTimeout(() => global.print(), 250);
      return;
    }

    printContainer.innerHTML = '';

    const wrapPage = (pageNode) => {
      const sheet = document.createElement('div');
      sheet.className = 'print-page-sheet';
      sheet.appendChild(pageNode);
      printContainer.appendChild(sheet);
    };

    wrapPage(
      PTB.PageRenderer.renderScrapbookPage({
        album,
        pageIndex: -1,
        side: 'left',
        editable: false,
        selection: {},
        callbacks: {},
      })
    );
    (album.pages || []).forEach((_page, idx) => {
      wrapPage(
        PTB.PageRenderer.renderScrapbookPage({
          album,
          pageIndex: idx,
          side: idx % 2 === 0 ? 'right' : 'left',
          editable: false,
          selection: {},
          callbacks: {},
        })
      );
    });

    const cleanup = () => {
      printContainer.innerHTML = '';
      global.removeEventListener('afterprint', cleanup);
    };
    global.addEventListener('afterprint', cleanup);

    PTB.UI.showToast(`Đang chuẩn bị in toàn bộ ${1 + (album.pages || []).length} trang...`);
    setTimeout(() => global.print(), 250);
  }

  async function importAlbumFromJsonFile(file, existingAlbums = []) {
    const rawText = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('Tệp sao lưu không đúng định dạng JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.pages) || !parsed.title) {
      throw new Error('Tệp JSON không phải bản sao lưu cuốn sổ MEMORA hợp lệ.');
    }

    const hasIdCollision = existingAlbums.some((a) => a.id === parsed.id);
    const imported = PTB.Storage.deepClone(parsed);
    if (!imported.id || hasIdCollision) {
      imported.id = PTB.Storage.uid('album');
    }
    imported.createdAt = imported.createdAt || Date.now();
    imported.updatedAt = Date.now();
    imported.privacy = imported.privacy === 'public' ? 'public' : 'private';
    imported.pages = imported.pages.map((p, idx) => ({
      id: p.id || PTB.Storage.uid(`page_${idx}`),
      title: p.title || `Trang ${idx + 1}`,
      date: p.date || '',
      tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string' && t.trim()) : [],
      paperTone: p.paperTone || 'ivory',
      layout: p.layout || 'layout-1',
      titleFont: p.titleFont || 'var(--font-hand)',
      note: p.note || '',
      noteStyle: p.noteStyle || { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
      photos: Array.isArray(p.photos) ? p.photos : [],
      decors: Array.isArray(p.decors) ? p.decors : [],
    }));

    return imported;
  }

  function slugify(text) {
    return String(text || 'memory-book')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function initExporterEvents() {
    const modal = document.getElementById('shareModal');
    if (modal) {
      document.getElementById('shareModalCloseBtn')?.addEventListener('click', () => modal.classList.add('hidden'));
      document.getElementById('shareModalDoneBtn')?.addEventListener('click', () => modal.classList.add('hidden'));
    }

    const sbModal = document.getElementById('supabaseConfigModal');
    if (sbModal) {
      document.getElementById('sbConfigCloseBtn')?.addEventListener('click', () => sbModal.classList.add('hidden'));
      document.getElementById('sbConfigCancelBtn')?.addEventListener('click', () => sbModal.classList.add('hidden'));

      document.getElementById('sbCopySqlBtn')?.addEventListener('click', async () => {
        const sql = PTB.Cloud ? PTB.Cloud.getSetupSql() : '';
        try {
          await navigator.clipboard.writeText(sql);
          PTB.UI.showToast('Đã sao chép mã SQL khởi tạo bảng shared_albums!');
        } catch {
          PTB.UI.showToast('Vui lòng chọn và sao chép thủ công đoạn mã SQL.');
        }
      });

      document.getElementById('sbClearBtn')?.addEventListener('click', () => {
        if (!global.confirm('Bạn có chắc muốn xóa thông tin kết nối Supabase hiện tại?')) return;
        if (PTB.Cloud) PTB.Cloud.clearConfig();
        const urlInp = document.getElementById('sbUrlInput');
        const keyInp = document.getElementById('sbAnonKeyInput');
        if (urlInp) urlInp.value = '';
        if (keyInp) keyInp.value = '';
        const fb = document.getElementById('sbTestFeedback');
        if (fb) {
          fb.className = 'sb-test-feedback hidden';
          fb.textContent = '';
        }
        PTB.UI.showToast('Đã xóa thông tin Supabase.');
      });

      document.getElementById('sbTestBtn')?.addEventListener('click', async () => {
        const url = document.getElementById('sbUrlInput')?.value.trim();
        const key = document.getElementById('sbAnonKeyInput')?.value.trim();
        const fb = document.getElementById('sbTestFeedback');
        if (!fb) return;

        fb.classList.remove('hidden');
        fb.className = 'sb-test-feedback is-loading';
        fb.textContent = '⏳ Đang kiểm tra kết nối đến Supabase...';

        try {
          const res = await PTB.Cloud.testConnection(url, key);
          if (res.success) {
            fb.className = 'sb-test-feedback is-success';
            fb.textContent = `✓ ${res.message}`;
          } else if (res.needTable) {
            fb.className = 'sb-test-feedback is-warning';
            fb.innerHTML = `⚠️ ${res.message} <br/><small>Hãy nhấn "Sao chép mã SQL tạo bảng" và chạy trong SQL Editor trên Supabase.</small>`;
          }
        } catch (err) {
          fb.className = 'sb-test-feedback is-error';
          fb.textContent = `✕ ${err.message || 'Lỗi kết nối'}`;
        }
      });
    }
  }

  PTB.Exporter = {
    openShareModal,
    exportPageAsPng,
    exportBookToPdfPrint,
    importAlbumFromJsonFile,
    initExporterEvents,
  };
})(window);
