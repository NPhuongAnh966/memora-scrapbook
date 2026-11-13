/* ==========================================================================
   PTB Online – Book Cover Designer & Album Creation / Settings Modal
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  let editingAlbumId = null;
  let existingPasswordHash = '';
  let draftCover = null;
  let onSaveCallback = null;

  function syncPasswordRow() {
    const row = document.getElementById('coverPasswordRow');
    const hint = document.getElementById('coverPasswordHint');
    const label = document.getElementById('coverPasswordLabel');
    const input = document.getElementById('coverPasswordInput');
    if (!row || !draftCover) return;

    const isPrivate = draftCover.privacy === 'private';
    row.classList.toggle('hidden', !isPrivate);
    if (!isPrivate) return;

    const hasExisting = Boolean(editingAlbumId && existingPasswordHash);
    label.textContent = hasExisting ? 'Đổi mật khẩu (nếu muốn)' : 'Mật khẩu mở sổ riêng tư';
    input.placeholder = hasExisting ? 'Nhập mật khẩu mới hoặc để trống' : 'Nhập mật khẩu bảo vệ cuốn sổ';
    hint.classList.toggle('hidden', !hasExisting);
  }

  function openCoverDesigner(existingAlbum, userProfile, onSave) {
    onSaveCallback = onSave;
    editingAlbumId = existingAlbum ? existingAlbum.id : null;
    existingPasswordHash = existingAlbum ? (existingAlbum.passwordHash || '') : '';

    const art = PTB.Assets.createSampleArtPhoto;
    const profileName = (userProfile && userProfile.name && userProfile.name.trim()) || 'Tôi';
    draftCover = existingAlbum
      ? {
          title: existingAlbum.title,
          owner: existingAlbum.owner || profileName,
          startDate: existingAlbum.startDate || '',
          description: existingAlbum.description || '',
          coverTheme: existingAlbum.coverTheme || 'leather',
          coverPhoto: existingAlbum.coverPhoto || art('flowers'),
          coverOrnament: existingAlbum.coverOrnament || 'dried-lavender',
          privacy: existingAlbum.privacy || 'private',
        }
      : {
          title: 'New Memory Book',
          owner: profileName,
          startDate: new Date().toISOString().slice(0, 10),
          description: 'Cuốn sổ lưu giữ những khoảnh khắc dịu dàng và đáng nhớ.',
          coverTheme: 'pink',
          coverPhoto: art('flowers'),
          coverOrnament: 'dried-lavender',
          privacy: 'private',
        };

    document.getElementById('coverModalTitle').textContent = existingAlbum
      ? 'Chỉnh sửa bìa & thông tin cuốn sổ'
      : 'Tạo cuốn sổ kỷ niệm mới';

    document.getElementById('coverTitleInput').value = draftCover.title;
    document.getElementById('coverOwnerInput').value = draftCover.owner;
    document.getElementById('coverStartInput').value = draftCover.startDate;
    document.getElementById('coverDescInput').value = draftCover.description;
    document.getElementById('coverOrnamentSelect').value = draftCover.coverOrnament;
    document.getElementById('coverPrivacySelect').value = draftCover.privacy;

    const pwInput = document.getElementById('coverPasswordInput');
    if (pwInput) {
      pwInput.value = '';
      pwInput.type = 'password';
    }

    syncPasswordRow();
    syncThemeChips();
    renderCoverPreview();
    document.getElementById('coverDesignerModal').classList.remove('hidden');
  }

  function syncThemeChips() {
    document.querySelectorAll('[data-cover-theme]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.coverTheme === draftCover.coverTheme);
    });
  }

  function renderCoverPreview() {
    const previewContainer = document.getElementById('coverLivePreview');
    const ornament = PTB.Assets.getStickerById(draftCover.coverOrnament) || PTB.Assets.STICKERS[0];
    const esc = PTB.PageRenderer.escapeHtml;
    const privacyLabel = draftCover.privacy === 'public' ? 'Công khai' : 'Riêng tư';

    previewContainer.innerHTML = `
      <div class="book-cover-card cover-theme-${esc(draftCover.coverTheme)}" style="max-width:236px;">
        <div class="cover-top-badge">
          <span>MEMORA</span>
          <span class="cover-privacy-chip">${privacyLabel}</span>
        </div>
        <div class="cover-photo-window">
          <img src="${draftCover.coverPhoto}" alt="Cover preview"/>
        </div>
        <div class="cover-title-plate">
          <h4 class="cover-title-text">${esc(draftCover.title || 'Untitled Album')}</h4>
          <p class="cover-owner-text">by ${esc(draftCover.owner || 'Tôi')}</p>
        </div>
        <div class="cover-ornament">${ornament.svg}</div>
      </div>
    `;
  }

  function closeDesigner() {
    document.getElementById('coverDesignerModal').classList.add('hidden');
  }

  function initCoverDesignerEvents() {
    const bindInput = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (!draftCover) return;
        draftCover[key] = el.value;
        renderCoverPreview();
      });
    };

    bindInput('coverTitleInput', 'title');
    bindInput('coverOwnerInput', 'owner');
    bindInput('coverStartInput', 'startDate');
    bindInput('coverDescInput', 'description');

    document.getElementById('coverOrnamentSelect').addEventListener('change', (e) => {
      if (!draftCover) return;
      draftCover.coverOrnament = e.target.value;
      renderCoverPreview();
    });

    document.getElementById('coverPrivacySelect').addEventListener('change', (e) => {
      if (!draftCover) return;
      draftCover.privacy = e.target.value;
      syncPasswordRow();
      renderCoverPreview();
    });

    const pwToggleBtn = document.getElementById('coverPasswordToggleBtn');
    const pwInput = document.getElementById('coverPasswordInput');
    if (pwToggleBtn && pwInput) {
      pwToggleBtn.addEventListener('click', () => {
        pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
      });
    }

    document.querySelectorAll('[data-cover-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!draftCover) return;
        draftCover.coverTheme = btn.dataset.coverTheme;
        syncThemeChips();
        renderCoverPreview();
      });
    });

    const coverFileInput = document.getElementById('coverPhotoFileInput');
    document.getElementById('coverUploadPhotoBtn').addEventListener('click', () => {
      coverFileInput.click();
    });
    coverFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !draftCover) return;
      try {
        draftCover.coverPhoto = await PTB.Storage.compressImageFile(file, 900, 0.86);
        renderCoverPreview();
      } catch (err) {
        PTB.UI.showToast(err.message);
      }
      coverFileInput.value = '';
    });

    document.getElementById('coverDesignerCloseBtn').addEventListener('click', closeDesigner);
    document.getElementById('coverDesignerCancelBtn').addEventListener('click', closeDesigner);

    document.getElementById('coverDesignerSaveBtn').addEventListener('click', () => {
      if (!draftCover || !onSaveCallback) return;
      if (!draftCover.title.trim()) {
        PTB.UI.showToast('Vui lòng nhập tên cuốn sổ nhé!');
        return;
      }

      const payload = { ...draftCover, title: draftCover.title.trim() };
      if (payload.privacy === 'private') {
        const pwEl = document.getElementById('coverPasswordInput');
        const rawPw = pwEl ? pwEl.value.trim() : '';
        if (rawPw) {
          payload.passwordHash = PTB.Storage.hashPassword(rawPw);
        } else if (editingAlbumId && existingPasswordHash) {
          payload.passwordHash = existingPasswordHash;
        } else {
          PTB.UI.showToast('Vui lòng đặt mật khẩu cho cuốn sổ riêng tư!');
          if (pwEl) pwEl.focus();
          return;
        }
      } else {
        payload.passwordHash = '';
      }

      onSaveCallback(editingAlbumId, payload);
      closeDesigner();
    });
  }

  PTB.CoverDesigner = {
    openCoverDesigner,
    initCoverDesignerEvents,
  };
})(window);
