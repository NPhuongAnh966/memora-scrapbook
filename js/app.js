/* ==========================================================================
   PTB Online – Main Application Controller
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  const state = {
    albums: [],
    profile: null,
    filter: 'all',
    viewMode: 'books', // 'books' | 'timeline'
    searchQuery: '',
    activeTag: '',
    timelineSort: 'desc', // 'desc' | 'asc'
    activeAlbum: null,
    editMode: true,
    activeTab: 'pages',
    targetPageIndex: 0,
    selection: { type: null, pageIndex: 0, slotIndex: 0, decorIndex: 0 },
    history: new PTB.Storage.HistoryManager(35),
    flipCtrl: null,
    pendingUploadTarget: null,
    unlockedAlbumIds: new Set(),
  };

  function showToast(msg) {
    const wrap = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>✨</span><span>${PTB.PageRenderer.escapeHtml(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'all 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 2800);
  }

  PTB.UI = { showToast };

  function formatPageDateVN(d = new Date()) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day} Tháng ${month}, ${d.getFullYear()}`;
  }

  async function init() {
    state.profile = PTB.Storage.getUserProfile();
    PTB.Home.renderHeaderUser(state.profile);

    let albums = await PTB.Storage.getAllAlbums();
    if (!albums.length) {
      albums = PTB.Seed.createSeedAlbums();
      for (const album of albums) {
        await PTB.Storage.saveAlbum(album);
      }
    } else {
      const seedMap = new Map(PTB.Seed.createSeedAlbums().map((a) => [a.id, a]));
      for (const album of albums) {
        let changed = false;
        // Ensure pre-existing seeded private albums receive the default sample password if missing
        if (
          album.privacy === 'private' &&
          !album.passwordHash &&
          (album.id === 'album_little_moments' || album.id === 'album_special_days')
        ) {
          album.passwordHash = PTB.Storage.hashPassword('1234');
          changed = true;
        }

        // Ensure each page has tags array; backfill from seed if empty
        const seedAlbum = seedMap.get(album.id);
        (album.pages || []).forEach((p, pIdx) => {
          if (!Array.isArray(p.tags) || p.tags.length === 0) {
            const seedTags = seedAlbum?.pages?.[pIdx]?.tags;
            p.tags = seedTags && seedTags.length ? [...seedTags] : Array.isArray(p.tags) ? p.tags : [];
            changed = true;
          }
        });

        if (changed) {
          await PTB.Storage.saveAlbum(album);
        }
      }
    }
    state.albums = albums;

    setupFlipController();
    bindGlobalEvents();
    PTB.Cropper.initCropperEvents();
    PTB.CoverDesigner.initCoverDesignerEvents();
    PTB.Exporter.initExporterEvents();
    PTB.Home.initAuthModalEvents();
    PTB.Home.initPasswordModalEvents();
    PTB.Home.initAboutReveal();
    PTB.Home.initHeroCustomPhotos();
    initScrollNavObserver();

    renderHome();
    await handleHashRoute();
    global.addEventListener('hashchange', () => handleHashRoute());
  }

  function setupFlipController() {
    state.flipCtrl = new PTB.BookFlipController({
      stackEl: document.getElementById('bookPaperStack'),
      leftSlot: document.getElementById('leftPageSlot'),
      rightSlot: document.getElementById('rightPageSlot'),
      prevBtn: document.getElementById('flipPrevBtn'),
      nextBtn: document.getElementById('flipNextBtn'),
      indicatorEl: document.getElementById('pageSpreadIndicator'),
      onSpreadChange: (_spreadIdx, activePages) => {
        if (activePages.length && !activePages.includes(state.targetPageIndex)) {
          state.targetPageIndex = activePages[0];
        }
        renderEditorPanel();
      },
    });
  }

  function requireAlbumAccess(album, onGranted) {
    if (!album) return;
    if (album.privacy !== 'private' || state.unlockedAlbumIds.has(album.id)) {
      onGranted();
      return;
    }

    const mode = album.passwordHash ? 'unlock' : 'set';
    PTB.Home.openPasswordModal(album, mode, () => {
      state.unlockedAlbumIds.add(album.id);
      if (mode === 'set') {
        showToast(`Đã đặt mật khẩu bảo vệ cho “${album.title}”.`);
      }
      onGranted();
    });
  }

  function renderHome() {
    const searchResult = PTB.Home.filterAndCollectSearchResults(
      state.albums,
      state.unlockedAlbumIds,
      {
        filter: state.filter,
        query: state.searchQuery,
        activeTag: state.activeTag,
      }
    );

    const uniqueTags = PTB.Home.collectUniqueTags(state.albums, state.unlockedAlbumIds, state.filter);
    PTB.Home.renderTagPills(
      document.getElementById('homeTagsPillsList'),
      uniqueTags,
      state.activeTag,
      (selectedTag) => {
        state.activeTag = selectedTag;
        renderHome();
      }
    );

    const searchInp = document.getElementById('homeSearchInput');
    const searchClear = document.getElementById('homeSearchClearBtn');
    if (searchInp && searchInp.value !== state.searchQuery) {
      searchInp.value = state.searchQuery;
    }
    if (searchClear) {
      searchClear.classList.toggle('hidden', !state.searchQuery);
    }

    const feedbackWrap = document.getElementById('searchStatusFeedback');
    const feedbackText = document.getElementById('searchStatusText');
    if (feedbackWrap && feedbackText) {
      if (searchResult.hasSearch) {
        feedbackWrap.classList.remove('hidden');
        const parts = [];
        if (state.searchQuery) parts.push(`“${state.searchQuery}”`);
        if (state.activeTag) parts.push(state.activeTag);
        feedbackText.textContent = `Tìm thấy ${searchResult.timelinePhotos.length} ảnh · ${searchResult.matchingPages.length} trang (${parts.join(' & ')})`;
      } else {
        feedbackWrap.classList.add('hidden');
        feedbackText.textContent = '';
      }
    }

    const booksBtn = document.getElementById('viewModeBooksBtn');
    const timelineBtn = document.getElementById('viewModeTimelineBtn');
    const sortBtn = document.getElementById('timelineSortBtn');
    const isTimeline = state.viewMode === 'timeline';

    if (booksBtn) {
      booksBtn.classList.toggle('active', !isTimeline);
      booksBtn.setAttribute('aria-selected', !isTimeline ? 'true' : 'false');
    }
    if (timelineBtn) {
      timelineBtn.classList.toggle('active', isTimeline);
      timelineBtn.setAttribute('aria-selected', isTimeline ? 'true' : 'false');
    }
    if (sortBtn) {
      sortBtn.classList.toggle('hidden', !isTimeline);
      sortBtn.textContent = state.timelineSort === 'desc' ? 'Mới nhất trước ↓' : 'Cũ nhất trước ↑';
    }

    const booksSurface = document.getElementById('booksDeskSurface');
    const matchingSection = document.getElementById('matchingPagesSection');
    const timelineContainer = document.getElementById('timelineContainer');

    if (!isTimeline) {
      booksSurface.classList.remove('hidden');
      timelineContainer.classList.add('hidden');

      if (searchResult.hasSearch) {
        PTB.Home.renderMatchingPages(
          matchingSection,
          searchResult.matchingPages,
          (albumId, pageIdx) => openBook(albumId, pageIdx),
          (tag) => {
            state.activeTag = tag;
            renderHome();
          }
        );
      } else {
        matchingSection.classList.add('hidden');
        matchingSection.innerHTML = '';
      }

      PTB.Home.renderBooksGrid(searchResult.matchingAlbums, state.filter, {
        hasSearchFilter: searchResult.hasSearch,
        onResetFilter: () => {
          state.searchQuery = '';
          state.activeTag = '';
          renderHome();
        },
        onOpenBook: (albumId) => openBook(albumId, 0),
        onCreateNew: () => openCreateBookModal(),
        onEditCover: (album) => requireAlbumAccess(album, () => openEditCoverModal(album)),
        onShare: (album) =>
          requireAlbumAccess(album, () =>
            PTB.Exporter.openShareModal(album, async (updated) => {
              if (updated.privacy === 'private') {
                state.unlockedAlbumIds.add(updated.id);
              }
              await PTB.Storage.saveAlbum(updated);
              renderHome();
            })
          ),
        onDelete: (album) =>
          requireAlbumAccess(album, async () => {
            if (state.albums.length <= 1) {
              showToast('Hãy giữ lại ít nhất 1 cuốn sổ trên bàn làm việc nhé!');
              return;
            }
            if (!global.confirm(`Bạn có chắc muốn xóa cuốn sổ "${album.title}"?`)) return;
            await PTB.Storage.deleteAlbum(album.id);
            state.unlockedAlbumIds.delete(album.id);
            state.albums = state.albums.filter((a) => a.id !== album.id);
            renderHome();
            showToast(`Đã xóa cuốn sổ "${album.title}".`);
          }),
      });
    } else {
      booksSurface.classList.add('hidden');
      matchingSection.classList.add('hidden');
      matchingSection.innerHTML = '';
      timelineContainer.classList.remove('hidden');

      PTB.Home.renderTimelineView(
        timelineContainer,
        searchResult.timelinePhotos,
        state.timelineSort,
        (albumId, pageIdx) => openBook(albumId, pageIdx),
        (tag) => {
          state.activeTag = tag;
          renderHome();
        },
        () => {
          state.searchQuery = '';
          state.activeTag = '';
          renderHome();
        }
      );
    }

    PTB.Home.renderMemoriesStrip(
      state.albums,
      (albumId, pageIdx) => openBook(albumId, pageIdx),
      state.unlockedAlbumIds
    );
  }

  function openCreateBookModal() {
    PTB.CoverDesigner.openCoverDesigner(null, state.profile, async (_id, coverData) => {
      const art = PTB.Assets.createSampleArtPhoto;
      const newAlbum = {
        id: PTB.Storage.uid('album'),
        ...coverData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pages: [
          {
            id: PTB.Storage.uid('page'),
            title: 'Trang đầu tiên',
            date: formatPageDateVN(),
            tags: ['#kyniem'],
            paperTone: 'ivory',
            layout: 'layout-1',
            titleFont: 'var(--font-hand)',
            note: 'Hãy tải lên bức ảnh đầu tiên và viết lại câu chuyện cho ngày hôm nay.',
            noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
            photos: [PTB.Seed.makePhotoSlot('', 'Kỷ niệm đầu tiên', 'polaroid', -1.2)],
            decors: [PTB.Seed.makeSticker('dried-daisy', 76, 72, 0.9, 10)],
          },
          {
            id: PTB.Storage.uid('page'),
            title: 'Những khoảnh khắc nhỏ',
            date: 'Ghi chú',
            tags: ['#kyniem'],
            paperTone: 'cream',
            layout: 'layout-2',
            titleFont: 'var(--font-hand)',
            note: 'Hai khung ảnh Polaroid sẵn sàng để bạn kéo thả ảnh vào.',
            noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
            photos: [
              PTB.Seed.makePhotoSlot('', 'Khoảnh khắc 1', 'polaroid', -2),
              PTB.Seed.makePhotoSlot('', 'Khoảnh khắc 2', 'polaroid', 2),
            ],
            decors: [PTB.Seed.makeSticker('washi-sage', 50, 14, 0.9, -4)],
          },
        ],
      };
      await PTB.Storage.saveAlbum(newAlbum);
      state.albums.unshift(newAlbum);
      state.unlockedAlbumIds.add(newAlbum.id);
      renderHome();
      openBook(newAlbum.id, 0);
      showToast(`Đã tạo cuốn sổ "${newAlbum.title}"!`);
    });
  }

  function openEditCoverModal(album) {
    PTB.CoverDesigner.openCoverDesigner(album, state.profile, async (_id, coverData) => {
      Object.assign(album, coverData);
      if (album.privacy === 'private') {
        state.unlockedAlbumIds.add(album.id);
      }
      await PTB.Storage.saveAlbum(album);
      if (state.activeAlbum && state.activeAlbum.id === album.id) {
        Object.assign(state.activeAlbum, coverData);
        syncBookHeaderAndTheme();
        renderBookView();
      }
      renderHome();
      showToast('Đã cập nhật bìa cuốn sổ!');
    });
  }

  function openBook(albumId, startPageIndex = 0) {
    const found = state.albums.find((a) => a.id === albumId);
    if (!found) return;

    requireAlbumAccess(found, () => {
      state.activeAlbum = PTB.Storage.deepClone(found);
      state.history.reset(state.activeAlbum);
      state.editMode = true;
      state.targetPageIndex = startPageIndex;
      state.selection = { type: null, pageIndex: startPageIndex, slotIndex: 0, decorIndex: 0 };

      document.getElementById('homeView').classList.add('hidden');
      document.getElementById('bookView').classList.remove('hidden');

      state.flipCtrl.jumpToPage(state.activeAlbum, startPageIndex);
      syncBookHeaderAndTheme();
      setMode(true);
      global.scrollTo(0, 0);
    });
  }

  function closeBookToHome() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    const badge = document.getElementById('sharedCloudBadge');
    const cloneBtn = document.getElementById('saveSharedCloneBtn');
    if (badge) badge.classList.add('hidden');
    if (cloneBtn) cloneBtn.classList.add('hidden');

    state.activeAlbum = null;
    global.location.hash = '';
    document.getElementById('bookView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    renderHome();
  }

  function syncBookHeaderAndTheme() {
    if (!state.activeAlbum) return;
    document.getElementById('activeBookTitle').textContent = state.activeAlbum.title;
    const coverEl = document.getElementById('bookHardcover');
    coverEl.className = `book-hardcover theme-${state.activeAlbum.coverTheme || 'leather'}`;
    updateUndoRedoButtons();

    const isRemote = Boolean(state.activeAlbum.isRemoteShared);
    const badge = document.getElementById('sharedCloudBadge');
    const cloneBtn = document.getElementById('saveSharedCloneBtn');
    if (badge) badge.classList.toggle('hidden', !isRemote);
    if (cloneBtn) cloneBtn.classList.toggle('hidden', !isRemote);
  }

  function setMode(isEdit) {
    state.editMode = isEdit;
    const ws = document.getElementById('bookView');
    ws.classList.toggle('edit-mode', isEdit);
    ws.classList.toggle('is-preview', !isEdit);
    document.getElementById('modeEditBtn').classList.toggle('active', isEdit);
    document.getElementById('modePreviewBtn').classList.toggle('active', !isEdit);
    renderBookView();
    renderEditorPanel();
  }

  async function commitAlbumMutation(recordHistory = true) {
    if (!state.activeAlbum) return;
    if (recordHistory) {
      state.history.push(state.activeAlbum);
    }
    updateUndoRedoButtons();

    const idx = state.albums.findIndex((a) => a.id === state.activeAlbum.id);
    const snapshot = PTB.Storage.deepClone(state.activeAlbum);
    if (idx >= 0) state.albums[idx] = snapshot;
    else state.albums.unshift(snapshot);

    await PTB.Storage.saveAlbum(snapshot);
  }

  function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = !state.history.canUndo();
    document.getElementById('redoBtn').disabled = !state.history.canRedo();
  }

  function performUndo() {
    const prev = state.history.undo();
    if (!prev) return;
    state.activeAlbum = prev;
    commitAlbumMutation(false);
    renderBookView();
    renderEditorPanel();
    showToast('Đã hoàn tác');
  }

  function performRedo() {
    const next = state.history.redo();
    if (!next) return;
    state.activeAlbum = next;
    commitAlbumMutation(false);
    renderBookView();
    renderEditorPanel();
    showToast('Đã làm lại');
  }

  function getPageCallbacks() {
    return {
      onFocusPage: (pIdx) => {
        state.targetPageIndex = pIdx;
        state.selection = { type: null, pageIndex: pIdx, slotIndex: 0, decorIndex: 0 };
        renderBookView();
        renderEditorPanel();
      },
      onUpdatePageField: (pIdx, field, val) => {
        const page = state.activeAlbum.pages[pIdx];
        if (!page) return;
        page[field] = val;
        commitAlbumMutation(true);
        if (field === 'title') renderEditorPanel();
      },
      onUpdatePhotoCaption: (pIdx, sIdx, val) => {
        const slot = ensureSlotExists(pIdx, sIdx);
        if (slot.caption !== val) {
          slot.caption = val;
          commitAlbumMutation(true);
        }
      },
      onSelectPhotoSlot: (pIdx, sIdx, isEmpty) => {
        state.targetPageIndex = pIdx;
        state.selection = { type: 'photo', pageIndex: pIdx, slotIndex: sIdx };
        state.activeTab = 'photos';
        syncTabButtons();
        renderBookView();
        renderEditorPanel();
        if (isEmpty) {
          triggerPhotoUploadForSlot(pIdx, sIdx);
        }
      },
      onDropPhotoFile: async (pIdx, sIdx, file) => {
        await applyFileToSlot(pIdx, sIdx, file);
      },
      onSelectText: (pIdx) => {
        state.targetPageIndex = pIdx;
        state.activeTab = 'text';
        syncTabButtons();
        renderEditorPanel();
      },
      onSelectDecor: (pIdx, dIdx) => {
        const alreadySelected =
          state.selection.type === 'decor' &&
          state.selection.pageIndex === pIdx &&
          state.selection.decorIndex === dIdx;
        state.targetPageIndex = pIdx;
        state.selection = { type: 'decor', pageIndex: pIdx, decorIndex: dIdx };

        // Update selection highlight in-place so the dragged DOM node is never destroyed mid-drag
        document.querySelectorAll('#bookPaperStack .decor-item.is-selected').forEach((el) => {
          el.classList.remove('is-selected');
        });
        const targetEl = document.querySelector(
          `#bookPaperStack .decor-item[data-page-index="${pIdx}"][data-decor-index="${dIdx}"]`
        );
        if (targetEl) targetEl.classList.add('is-selected');

        let targetTab = 'stickers';
        const decor = state.activeAlbum.pages[pIdx]?.decors?.[dIdx];
        if (decor?.type === 'free-photo') {
          targetTab = 'photos';
        } else if (decor?.type === 'free-text' || decor?.type === 'note') {
          targetTab = 'text';
        }

        if (!alreadySelected || state.activeTab !== targetTab) {
          state.activeTab = targetTab;
          syncTabButtons();
          renderEditorPanel();
        } else {
          renderEditorPanel();
        }
      },
      onUpdateDecor: (pIdx, dIdx, patch) => {
        const dec = state.activeAlbum.pages[pIdx]?.decors?.[dIdx];
        if (!dec) return;
        Object.assign(dec, patch);
        commitAlbumMutation(true);
        renderEditorPanel();
      },
      onDeleteDecor: (pIdx, dIdx) => {
        const decors = state.activeAlbum.pages[pIdx]?.decors;
        if (!decors) return;
        decors.splice(dIdx, 1);
        state.selection = { type: null, pageIndex: pIdx };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      },
    };
  }

  function ensureSlotExists(pIdx, sIdx) {
    const page = state.activeAlbum.pages[pIdx];
    const layoutDef = PTB.Assets.getLayoutById(page.layout);
    while (page.photos.length <= sIdx) {
      page.photos.push(PTB.Seed.makePhotoSlot('', '', layoutDef.defaultFrame, 0));
    }
    return page.photos[sIdx];
  }

  function triggerPhotoUploadForSlot(pIdx, sIdx) {
    state.pendingUploadTarget = { pIdx, sIdx };
    const input = document.getElementById('slotPhotoUploadInput');
    input.value = '';
    input.click();
  }

  function triggerAddFreePhoto(pIdx = state.targetPageIndex) {
    state.pendingUploadTarget = { pIdx };
    const input = document.getElementById('freePhotoUploadInput');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  function triggerReplaceFreePhoto(pIdx, dIdx) {
    state.pendingReplaceFreePhotoTarget = { pIdx, dIdx };
    const input = document.getElementById('replaceFreePhotoInput');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  async function applyFileToSlot(pIdx, sIdx, file) {
    try {
      const dataUrl = await PTB.Storage.compressImageFile(file);
      const slot = ensureSlotExists(pIdx, sIdx);
      slot.src = dataUrl;
      slot.zoom = 1;
      slot.panX = 0;
      slot.panY = 0;
      slot.imgRotate = 0;
      state.selection = { type: 'photo', pageIndex: pIdx, slotIndex: sIdx };
      await commitAlbumMutation(true);
      renderBookView();
      renderEditorPanel();
      showToast('Đã tải ảnh vào khung!');
    } catch (err) {
      showToast(err.message || 'Không thể tải ảnh này.');
    }
  }

  async function applyFileToFreePhoto(pIdx, file) {
    try {
      const dataUrl = await PTB.Storage.compressImageFile(file);
      const page = state.activeAlbum.pages[pIdx];
      page.decors = page.decors || [];
      const x = 30 + Math.round(Math.random() * 25);
      const y = 25 + Math.round(Math.random() * 25);
      const rot = -4 + Math.round(Math.random() * 8);
      const freePhoto = PTB.Seed.makeFreePhoto(dataUrl, '', 'polaroid', x, y, rot);
      page.decors.push(freePhoto);
      state.targetPageIndex = pIdx;
      state.activeTab = 'photos';
      syncTabButtons();
      state.selection = { type: 'decor', pageIndex: pIdx, decorIndex: page.decors.length - 1 };
      await commitAlbumMutation(true);
      renderBookView();
      renderEditorPanel();
      showToast('Đã thêm ảnh tự do lên trang — kéo thả để di chuyển!');
    } catch (err) {
      showToast(err.message || 'Không thể tải ảnh này.');
    }
  }

  async function applyFileToReplaceFreePhoto(pIdx, dIdx, file) {
    try {
      const dataUrl = await PTB.Storage.compressImageFile(file);
      const page = state.activeAlbum.pages[pIdx];
      const decor = page.decors && page.decors[dIdx];
      if (!decor) return;
      decor.src = dataUrl;
      decor.zoom = 1;
      decor.panX = 0;
      decor.panY = 0;
      decor.imgRotate = 0;
      await commitAlbumMutation(true);
      renderBookView();
      renderEditorPanel();
      showToast('Đã thay ảnh thành công!');
    } catch (err) {
      showToast(err.message || 'Không thể tải ảnh này.');
    }
  }

  function renderBookView() {
    if (!state.activeAlbum) return;
    state.flipCtrl.renderStatic(
      state.activeAlbum,
      state.editMode,
      state.selection,
      getPageCallbacks()
    );
  }

  function syncTabButtons() {
    document.querySelectorAll('.editor-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
    });
  }

  /* ==========================================================================
     Left Sidebar Editor Panel Rendering
     ========================================================================== */
  function renderEditorPanel() {
    if (!state.activeAlbum) return;
    const panel = document.getElementById('editorPanelBody');
    const album = state.activeAlbum;
    const activePages = state.flipCtrl.getActivePageIndices(album);

    if (!activePages.includes(state.targetPageIndex) && activePages.length) {
      state.targetPageIndex = activePages[0];
    }

    const page = album.pages[state.targetPageIndex] || album.pages[0];
    const esc = PTB.PageRenderer.escapeHtml;

    // Target page switch when 2 pages are visible
    let targetSwitchHtml = '';
    if (activePages.length > 1) {
      targetSwitchHtml = `
        <div class="target-page-switch">
          ${activePages
            .map(
              (idx) =>
                `<button type="button" class="target-page-btn ${idx === state.targetPageIndex ? 'active' : ''}" data-target-page="${idx}">
                  Trang ${idx + 1} (${idx % 2 === 1 ? 'Trái' : 'Phải'})
                </button>`
            )
            .join('')}
        </div>
      `;
    }

    if (state.activeTab === 'pages') {
      panel.innerHTML = `
        ${targetSwitchHtml}
        <div class="tool-group">
          <div class="tool-section-title">
            <span>Bố cục trang ${state.targetPageIndex + 1}</span>
          </div>
          <div class="layouts-picker-grid">
            ${PTB.Assets.LAYOUTS.map(
              (l) => `
              <button type="button" class="layout-thumb-btn ${page.layout === l.id ? 'active' : ''}" data-layout-id="${l.id}" title="${l.name}">
                ${l.iconSvg}
                <span>${l.name}</span>
              </button>
            `
            ).join('')}
          </div>
        </div>

        <div class="tool-group">
          <div class="tool-section-title"><span>Màu &amp; họa tiết giấy</span></div>
          <div class="paper-swatch-grid">
            ${[
              { id: 'ivory', label: 'Trắng ngà' },
              { id: 'cream', label: 'Kem giấy' },
              { id: 'blush', label: 'Hồng phấn' },
              { id: 'sage', label: 'Xanh sage' },
              { id: 'grid', label: 'Kẻ ô vuông' },
              { id: 'dotgrid', label: 'Chấm bi' },
              { id: 'kraft', label: 'Giấy Kraft' },
              { id: 'newspaper', label: 'Báo cổ điển' },
            ]
              .map(
                (t) =>
                  `<button type="button" class="paper-swatch-btn ${
                    (page.paperTone || 'ivory') === t.id ? 'active' : ''
                  }" title="${t.label}" data-paper-tone="${t.id}">
                    <span class="paper-swatch-preview preview-${t.id}" aria-hidden="true"></span>
                    <span>${t.label}</span>
                  </button>`
              )
              .join('')}
          </div>
        </div>

        <div class="tool-group">
          <div class="tool-section-title">
            <span>Quản lý trang (${album.pages.length})</span>
            <button type="button" class="btn btn-primary btn-sm" id="addPageBtn">+ Thêm trang</button>
          </div>
          <div class="page-thumbs-list">
            ${album.pages
              .map(
                (p, idx) => `
              <div class="page-thumb-row ${idx === state.targetPageIndex ? 'active' : ''}" data-jump-page="${idx}">
                <div class="page-thumb-badge">${idx + 1}</div>
                <div class="page-thumb-info">
                  <strong>${esc(p.title || 'Trang ' + (idx + 1))}</strong>
                  <small>${PTB.Assets.getLayoutById(p.layout).name} • ${p.photos.filter((x) => x.src).length} ảnh</small>
                </div>
                <div class="page-thumb-actions">
                  <button type="button" class="mini-icon-btn" data-page-act="up" data-idx="${idx}" title="Lên trước">↑</button>
                  <button type="button" class="mini-icon-btn" data-page-act="down" data-idx="${idx}" title="Xuống sau">↓</button>
                  <button type="button" class="mini-icon-btn" data-page-act="dup" data-idx="${idx}" title="Nhân bản">⧉</button>
                  <button type="button" class="mini-icon-btn" data-page-act="del" data-idx="${idx}" title="Xóa trang">✕</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;

      bindPagesTabEvents(panel);
    } else if (state.activeTab === 'photos') {
      const isFreePhoto =
        state.selection.type === 'decor' &&
        state.selection.pageIndex === state.targetPageIndex &&
        page.decors &&
        page.decors[state.selection.decorIndex]?.type === 'free-photo';

      if (isFreePhoto) {
        const dIdx = state.selection.decorIndex;
        const decor = page.decors[dIdx];
        panel.innerHTML = `
          ${targetSwitchHtml}
          <div class="tool-group" style="background:rgba(235,207,203,0.22);padding:12px;border-radius:10px;">
            <div class="tool-section-title">
              <span>Đang chọn Ảnh tự do</span>
              <button type="button" class="btn btn-rose btn-sm" id="deleteFreePhotoBtn">Xóa ảnh</button>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button type="button" class="btn btn-primary btn-sm" style="flex:1;" id="replaceFreePhotoBtn">Thay ảnh khác</button>
              <button type="button" class="btn btn-soft btn-sm" style="flex:1;" id="cropFreePhotoBtn">Cắt ảnh</button>
            </div>
            <div class="control-row" style="margin-top:12px;">
              <div class="control-label"><span>Dòng chú thích</span></div>
              <input type="text" class="vintage-input" id="freePhotoCaptionInput" placeholder="Viết chú thích ảnh..." value="${esc(decor.caption || '')}"/>
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Kiểu khung ảnh</span></div>
            <div class="frame-picker-grid">
              ${PTB.Assets.FRAME_STYLES.map(
                (f) =>
                  `<button type="button" class="frame-choice-btn ${
                    (decor.frame || 'polaroid') === f.id ? 'active' : ''
                  }" data-free-frame-id="${f.id}">${f.label}</button>`
              ).join('')}
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Kích thước & Góc xoay</span></div>
            <div class="control-row">
              <div class="control-label"><span>Kích thước (Scale)</span><span>${Math.round((decor.scale || 1) * 100)}%</span></div>
              <input type="range" class="vintage-range" id="freePhotoScaleRange" min="0.45" max="2.4" step="0.05" value="${decor.scale || 1}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Góc xoay</span><span>${decor.rotate || 0}°</span></div>
              <input type="range" class="vintage-range" id="freePhotoRotateRange" min="-180" max="180" step="2" value="${decor.rotate || 0}"/>
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Căn chỉnh ảnh bên trong khung</span></div>
            <div class="control-row">
              <div class="control-label"><span>Phóng to lòng ảnh</span><span>${Math.round((decor.zoom || 1) * 100)}%</span></div>
              <input type="range" class="vintage-range" id="freePhotoZoomRange" min="1" max="2.4" step="0.05" value="${decor.zoom || 1}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Vị trí ngang (Pan X)</span><span>${decor.panX || 0}px</span></div>
              <input type="range" class="vintage-range" id="freePhotoPanXRange" min="-70" max="70" step="2" value="${decor.panX || 0}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Vị trí dọc (Pan Y)</span><span>${decor.panY || 0}px</span></div>
              <input type="range" class="vintage-range" id="freePhotoPanYRange" min="-70" max="70" step="2" value="${decor.panY || 0}"/>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button type="button" class="btn btn-soft btn-sm" style="flex:1;" id="freePhotoRotate90Btn">↻ Xoay ảnh 90°</button>
              <button type="button" class="btn btn-soft btn-sm" id="freePhotoResetTransformBtn">Đặt lại</button>
            </div>
          </div>

          <div class="tool-group">
            <button type="button" class="btn btn-soft btn-sm" style="width:100%;" id="freePhotoDeselectBtn">← Quay lại danh sách khung</button>
          </div>
        `;

        bindFreePhotoTabEvents(panel, dIdx);
      } else {
        const layoutDef = PTB.Assets.getLayoutById(page.layout);
        const selSlotIdx =
          state.selection.type === 'photo' && state.selection.pageIndex === state.targetPageIndex
            ? state.selection.slotIndex
            : 0;
        const slot = layoutDef.slots > 0 ? ensureSlotExists(state.targetPageIndex, selSlotIdx) : null;
        const freePhotos = (page.decors || [])
          .map((d, idx) => ({ ...d, originalIdx: idx }))
          .filter((d) => d.type === 'free-photo');

        panel.innerHTML = `
          ${targetSwitchHtml}
          <div class="tool-group" style="border: 1px dashed var(--rose-accent); background: rgba(212,143,124,0.06); padding: 12px; border-radius: 10px;">
            <div class="tool-section-title" style="margin-bottom:6px;"><span>Tự do thêm ảnh (Freeform)</span></div>
            <p style="font-size:0.78rem;color:var(--ink-muted);margin:0 0 10px;">Thêm ảnh tự do ở bất kỳ vị trí nào, có thể kéo thả, phóng to, xoay và viết chú thích trực tiếp.</p>
            <button type="button" class="btn btn-primary btn-sm" style="width:100%;" id="addFreePhotoBtn">+ Thêm ảnh tự do lên trang</button>
            ${
              freePhotos.length > 0
                ? `
              <div style="margin-top:10px;">
                <span style="font-size:0.74rem;color:var(--ink-muted);display:block;margin-bottom:6px;">Ảnh tự do đã thêm (${freePhotos.length}):</span>
                <div class="filter-pills">
                  ${freePhotos
                    .map(
                      (fp, i) => `
                    <button type="button" class="filter-pill" data-pick-free-photo="${fp.originalIdx}">
                      Ảnh tự do #${i + 1}
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }
          </div>

          ${
            layoutDef.slots === 0
              ? `
            <div class="tool-group" style="text-align:center;padding:20px 14px;color:var(--ink-muted);">
              <div style="font-size:1.6rem;margin-bottom:6px;">🎨</div>
              <strong>Trang trống tự do</strong>
              <p style="font-size:0.8rem;margin:6px 0 0;">Trang này không có khung ảnh mẫu cố định. Bạn hãy nhấn nút trên để thêm ảnh tự do hoặc sang tab Chữ / Sticker để trang trí theo ý thích!</p>
            </div>
          `
              : `
            <div class="tool-group">
              <div class="tool-section-title"><span>Khung ảnh theo mẫu trên trang ${state.targetPageIndex + 1}</span></div>
              <div class="filter-pills" style="margin-bottom:12px;">
                ${Array.from({ length: layoutDef.slots })
                  .map(
                    (_, i) =>
                      `<button type="button" class="filter-pill ${i === selSlotIdx ? 'active' : ''}" data-pick-slot="${i}">Khung ${i + 1}</button>`
                  )
                  .join('')}
              </div>

              <div class="upload-dropzone" id="sidebarUploadBtn">
                <strong>${slot.src ? 'Thay đổi ảnh trong khung' : 'Tải ảnh từ thiết bị'}</strong>
                <div style="font-size:0.76rem;color:var(--ink-muted);margin-top:4px;">Hỗ trợ JPG, JPEG, PNG, WEBP hoặc kéo thả thẳng vào khung</div>
              </div>

              ${
                slot.src
                  ? `<div style="display:flex;gap:8px;margin-top:10px;">
                      <button type="button" class="btn btn-soft btn-sm" style="flex:1;" id="openCropBtn">Cắt ảnh</button>
                      <button type="button" class="btn btn-rose btn-sm" id="removeSlotPhotoBtn">Xóa ảnh</button>
                    </div>`
                  : ''
              }
            </div>

            <div class="tool-group">
              <div class="tool-section-title"><span>Kiểu khung ảnh mẫu</span></div>
              <div class="frame-picker-grid">
                ${PTB.Assets.FRAME_STYLES.map(
                  (f) =>
                    `<button type="button" class="frame-choice-btn ${
                      (slot.frame || 'polaroid') === f.id ? 'active' : ''
                    }" data-frame-id="${f.id}">${f.label}</button>`
                ).join('')}
              </div>
            </div>

            <div class="tool-group">
              <div class="tool-section-title"><span>Điều chỉnh ảnh & góc nghiêng</span></div>
              <div class="control-row">
                <div class="control-label"><span>Phóng to / Thu nhỏ</span><span>${Math.round((slot.zoom || 1) * 100)}%</span></div>
                <input type="range" class="vintage-range" id="photoZoomRange" min="1" max="2.4" step="0.05" value="${slot.zoom || 1}"/>
              </div>
              <div class="control-row">
                <div class="control-label"><span>Vị trí ngang (Pan X)</span><span>${slot.panX || 0}px</span></div>
                <input type="range" class="vintage-range" id="photoPanXRange" min="-70" max="70" step="2" value="${slot.panX || 0}"/>
              </div>
              <div class="control-row">
                <div class="control-label"><span>Vị trí dọc (Pan Y)</span><span>${slot.panY || 0}px</span></div>
                <input type="range" class="vintage-range" id="photoPanYRange" min="-70" max="70" step="2" value="${slot.panY || 0}"/>
              </div>
              <div class="control-row">
                <div class="control-label"><span>Độ nghiêng khung</span><span>${slot.frameRotate || 0}°</span></div>
                <input type="range" class="vintage-range" id="frameTiltRange" min="-12" max="12" step="0.5" value="${slot.frameRotate || 0}"/>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button type="button" class="btn btn-soft btn-sm" style="flex:1;" id="rotateImg90Btn">↻ Xoay ảnh 90°</button>
                <button type="button" class="btn btn-soft btn-sm" id="resetPhotoTransformBtn">Đặt lại</button>
              </div>
            </div>
          `
          }
        `;

        bindPhotosTabEvents(panel, selSlotIdx);
      }
    } else if (state.activeTab === 'text') {
      const isFreeTextOrNote =
        state.selection.type === 'decor' &&
        state.selection.pageIndex === state.targetPageIndex &&
        page.decors &&
        (page.decors[state.selection.decorIndex]?.type === 'free-text' ||
          page.decors[state.selection.decorIndex]?.type === 'note');

      if (isFreeTextOrNote) {
        const dIdx = state.selection.decorIndex;
        const decor = page.decors[dIdx];
        const isNote = decor.type === 'note';
        const dFont = decor.font || 'var(--font-hand)';
        const dSize = decor.fontSize || (isNote ? 16 : 22);
        const dColor = decor.color || '#594638';
        const dAlign = decor.align || (isNote ? 'left' : 'center');
        const dBg = decor.bg || (isNote ? '#FCF3D9' : 'transparent');

        panel.innerHTML = `
          ${targetSwitchHtml}
          <div class="tool-group" style="background:rgba(235,207,203,0.22);padding:12px;border-radius:10px;">
            <div class="tool-section-title">
              <span>${isNote ? 'Đang chọn Giấy Note' : 'Đang chọn Chữ tự do'}</span>
              <button type="button" class="btn btn-rose btn-sm" id="deleteFreeTextBtn">Xóa</button>
            </div>
            <div class="control-row" style="margin-top:10px;">
              <div class="control-label"><span>Nội dung chữ</span></div>
              <textarea class="vintage-textarea" id="freeTextInput" rows="3" placeholder="Gõ nội dung chữ...">${esc(decor.text || '')}</textarea>
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Font & Cỡ chữ</span></div>
            <div class="control-row">
              <div class="control-label"><span>Phông chữ</span></div>
              <select class="vintage-select" id="freeTextFontSelect">
                <option value="var(--font-hand)" ${dFont === 'var(--font-hand)' ? 'selected' : ''}>Caveat (Viết tay tự nhiên)</option>
                <option value="var(--font-script)" ${dFont === 'var(--font-script)' ? 'selected' : ''}>Dancing Script (Nét mềm)</option>
                <option value="var(--font-display)" ${dFont === 'var(--font-display)' ? 'selected' : ''}>Playfair Display (Cổ điển)</option>
                <option value="var(--font-body)" ${dFont === 'var(--font-body)' ? 'selected' : ''}>Lora (Tạp chí)</option>
                <option value="var(--font-ui)" ${dFont === 'var(--font-ui)' ? 'selected' : ''}>Nunito (Hiện đại)</option>
              </select>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Cỡ chữ</span><span>${dSize}px</span></div>
              <input type="range" class="vintage-range" id="freeTextSizeRange" min="12" max="48" step="1" value="${dSize}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Căn lề</span></div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
                ${['left', 'center', 'right']
                  .map(
                    (a) =>
                      `<button type="button" class="frame-choice-btn ${dAlign === a ? 'active' : ''}" data-ftext-align="${a}">
                        ${a === 'left' ? 'Trái' : a === 'center' ? 'Giữa' : 'Phải'}
                      </button>`
                  )
                  .join('')}
              </div>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Màu chữ</span></div>
              <div class="swatch-row">
                ${['#594638', '#846E5C', '#3E4B3B', '#8E5250', '#4A4352', '#1F2937']
                  .map(
                    (c) =>
                      `<button type="button" class="color-swatch ${dColor === c ? 'active' : ''}" style="background:${c}" data-ftext-color="${c}"></button>`
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Màu nền hộp chữ</span></div>
            <div class="swatch-row" style="margin-top:6px;">
              ${[
                { label: 'Trong suốt', val: 'transparent', bgCss: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' },
                { label: 'Trắng kem', val: '#FFFDF7', bgCss: '#FFFDF7' },
                { label: 'Vàng Note', val: '#FCF3D9', bgCss: '#FCF3D9' },
                { label: 'Hồng phấn', val: '#F6E2DF', bgCss: '#F6E2DF' },
                { label: 'Xanh Sage', val: '#E4EBE0', bgCss: '#E4EBE0' },
              ]
                .map(
                  (bg) =>
                    `<button type="button" class="color-swatch ${dBg === bg.val ? 'active' : ''}" title="${bg.label}" style="background:${bg.bgCss};background-size:8px 8px;border:1px solid rgba(0,0,0,0.15);" data-ftext-bg="${bg.val}"></button>`
                )
                .join('')}
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Kích thước & Góc xoay</span></div>
            <div class="control-row">
              <div class="control-label"><span>Tỷ lệ (Scale)</span><span>${Math.round((decor.scale || 1) * 100)}%</span></div>
              <input type="range" class="vintage-range" id="freeTextScaleRange" min="0.45" max="2.4" step="0.05" value="${decor.scale || 1}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Góc xoay</span><span>${decor.rotate || 0}°</span></div>
              <input type="range" class="vintage-range" id="freeTextRotateRange" min="-180" max="180" step="2" value="${decor.rotate || 0}"/>
            </div>
          </div>

          <div class="tool-group">
            <button type="button" class="btn btn-soft btn-sm" style="width:100%;" id="freeTextDeselectBtn">← Quay lại nhật ký trang</button>
          </div>
        `;

        bindFreeTextTabEvents(panel, dIdx);
      } else {
        const ns = page.noteStyle || { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' };
        const freeTexts = (page.decors || [])
          .map((d, idx) => ({ ...d, originalIdx: idx }))
          .filter((d) => d.type === 'free-text' || d.type === 'note');

        panel.innerHTML = `
          ${targetSwitchHtml}
          <div class="tool-group" style="border: 1px dashed var(--rose-accent); background: rgba(212,143,124,0.06); padding: 12px; border-radius: 10px;">
            <div class="tool-section-title" style="margin-bottom:6px;"><span>Chữ & Giấy Note tự do</span></div>
            <p style="font-size:0.78rem;color:var(--ink-muted);margin:0 0 10px;">Thêm dòng chữ hoặc mẩu giấy note ở bất kỳ vị trí nào trên trang giấy, kéo thả và tùy biến phông chữ, màu sắc tự do.</p>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-primary btn-sm" style="flex:1;" id="addFreeTextBtn">+ Chữ tự do</button>
              <button type="button" class="btn btn-rose btn-sm" style="flex:1;" id="addFreeNoteBtn">+ Giấy Note</button>
            </div>
            ${
              freeTexts.length > 0
                ? `
              <div style="margin-top:10px;">
                <span style="font-size:0.74rem;color:var(--ink-muted);display:block;margin-bottom:6px;">Chữ / Note trên trang (${freeTexts.length}):</span>
                <div class="filter-pills">
                  ${freeTexts
                    .map(
                      (ft) => `
                    <button type="button" class="filter-pill" data-pick-free-text="${ft.originalIdx}">
                      ${ft.type === 'note' ? '📝 Note' : '🔤 Chữ'}: "${esc((ft.text || '').slice(0, 12)) || '...'}"
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Tiêu đề & Ngày tháng</span></div>
            <div class="control-row">
              <div class="control-label"><span>Tiêu đề trang</span></div>
              <input type="text" class="vintage-input" id="sidebarPageTitleInput" value="${esc(page.title || '')}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Ngày tháng / Địa điểm</span></div>
              <input type="text" class="vintage-input" id="sidebarPageDateInput" value="${esc(page.date || '')}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Font tiêu đề</span></div>
              <select class="vintage-select" id="titleFontSelect">
                <option value="var(--font-hand)" ${page.titleFont === 'var(--font-hand)' ? 'selected' : ''}>Caveat (Viết tay tự nhiên)</option>
                <option value="var(--font-script)" ${page.titleFont === 'var(--font-script)' ? 'selected' : ''}>Dancing Script (Nét mềm)</option>
                <option value="var(--font-display)" ${page.titleFont === 'var(--font-display)' ? 'selected' : ''}>Playfair Display (Cổ điển)</option>
                <option value="var(--font-body)" ${page.titleFont === 'var(--font-body)' ? 'selected' : ''}>Lora (Tạp chí)</option>
              </select>
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title"><span>Đoạn nhật ký trên trang</span></div>
            <textarea class="vintage-textarea" id="sidebarPageNoteInput" rows="4" placeholder="Viết dòng tâm sự hoặc lời nhắn...">${esc(page.note || '')}</textarea>
            <div class="control-row" style="margin-top:10px;">
              <div class="control-label"><span>Font nội dung</span></div>
              <select class="vintage-select" id="noteFontSelect">
                <option value="var(--font-body)" ${ns.font === 'var(--font-body)' ? 'selected' : ''}>Lora (Nhẹ nhàng)</option>
                <option value="var(--font-ui)" ${ns.font === 'var(--font-ui)' ? 'selected' : ''}>Nunito (Hiện đại)</option>
                <option value="var(--font-hand)" ${ns.font === 'var(--font-hand)' ? 'selected' : ''}>Caveat (Viết tay)</option>
                <option value="var(--font-display)" ${ns.font === 'var(--font-display)' ? 'selected' : ''}>Playfair Display</option>
              </select>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Cỡ chữ</span><span>${ns.size || 13}px</span></div>
              <input type="range" class="vintage-range" id="noteSizeRange" min="11" max="22" step="1" value="${ns.size || 13}"/>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Căn lề</span></div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
                ${['left', 'center', 'right']
                  .map(
                    (a) =>
                      `<button type="button" class="frame-choice-btn ${ns.align === a ? 'active' : ''}" data-note-align="${a}">
                        ${a === 'left' ? 'Trái' : a === 'center' ? 'Giữa' : 'Phải'}
                      </button>`
                  )
                  .join('')}
              </div>
            </div>
            <div class="control-row">
              <div class="control-label"><span>Màu chữ</span></div>
              <div class="swatch-row">
                ${['#594638', '#846E5C', '#3E4B3B', '#8E5250', '#4A4352']
                  .map(
                    (c) =>
                      `<button type="button" class="color-swatch ${ns.color === c ? 'active' : ''}" style="background:${c}" data-note-color="${c}"></button>`
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <div class="tool-group">
            <div class="tool-section-title">
              <span>Thẻ kỷ niệm (Tags)</span>
              <span style="font-size:0.75rem;color:var(--ink-muted);font-family:var(--font-ui);">${(page.tags || []).length} thẻ</span>
            </div>
            <div class="editor-tags-list" id="editorTagsList">
              ${
                (page.tags || []).length
                  ? (page.tags || [])
                      .map(
                        (t, idx) => `
                  <span class="editor-tag-chip">
                    <span>${esc(t)}</span>
                    <button type="button" class="editor-tag-remove" data-tag-idx="${idx}" title="Xóa thẻ">✕</button>
                  </span>
                `
                      )
                      .join('')
                  : '<span style="font-size:0.78rem;color:var(--ink-muted);font-style:italic;">Chưa có thẻ nào cho trang này</span>'
              }
            </div>
            <div class="editor-tag-input-row" style="margin-top:8px;display:flex;gap:6px;">
              <input type="text" class="vintage-input" id="newTagInput" placeholder="Nhập thẻ (VD: #dulich, #banbe)..." />
              <button type="button" class="btn btn-soft btn-sm" id="addNewTagBtn" style="flex-shrink:0;">+ Thêm</button>
            </div>
            <div class="preset-tags-row" style="margin-top:10px;">
              <span style="font-size:0.74rem;color:var(--ink-muted);display:block;margin-bottom:6px;">Gợi ý nhanh:</span>
              <div class="preset-tags-chips">
                ${['#dulich', '#banbe', '#giađinh', '#kyniem', '#chuyendi', '#cafe', '#sinhnhat', '#thiennhien']
                  .map((preset) => {
                    const hasIt = (page.tags || []).some(
                      (t) => PTB.Home.normalizeTagKey(t) === PTB.Home.normalizeTagKey(preset)
                    );
                    return `<button type="button" class="preset-tag-chip ${hasIt ? 'is-active' : ''}" data-preset-tag="${preset}">
                      ${hasIt ? '✓ ' : '+ '}${preset}
                    </button>`;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        `;

        bindTextTabEvents(panel);
      }
    } else if (state.activeTab === 'stickers') {
      const selDecor =
        state.selection.type === 'decor' && state.selection.pageIndex === state.targetPageIndex
          ? page.decors[state.selection.decorIndex]
          : null;

      panel.innerHTML = `
        ${targetSwitchHtml}
        ${
          selDecor
            ? `<div class="tool-group" style="background:rgba(235,207,203,0.22);padding:12px;border-radius:10px;">
                <div class="tool-section-title">
                  <span>Đang chọn vật trang trí</span>
                  <button type="button" class="btn btn-rose btn-sm" id="deleteSelectedDecorBtn">Xóa</button>
                </div>
                <div class="control-row">
                  <div class="control-label"><span>Kích thước</span><span>${Math.round((selDecor.scale || 1) * 100)}%</span></div>
                  <input type="range" class="vintage-range" id="decorScaleRange" min="0.45" max="2.2" step="0.05" value="${selDecor.scale || 1}"/>
                </div>
                <div class="control-row">
                  <div class="control-label"><span>Góc xoay</span><span>${selDecor.rotate || 0}°</span></div>
                  <input type="range" class="vintage-range" id="decorRotateRange" min="-180" max="180" step="2" value="${selDecor.rotate || 0}"/>
                </div>
              </div>`
            : `<p style="font-size:0.8rem;color:var(--ink-muted);margin:0 0 12px;">Nhấn vào sticker để dán lên Trang ${state.targetPageIndex + 1}, sau đó kéo thả, xoay và phóng to trực tiếp trên giấy.</p>`
        }
        <div class="tool-group">
          <div class="tool-section-title"><span>Thư viện Sticker & Washi Tape</span></div>
          <div class="stickers-grid">
            ${PTB.Assets.STICKERS.map(
              (s) => `
              <button type="button" class="sticker-card-btn" data-add-sticker="${s.id}">
                ${s.svg}
                <span>${s.label}</span>
              </button>
            `
            ).join('')}
          </div>
        </div>
      `;

      bindStickersTabEvents(panel);
    } else if (state.activeTab === 'settings') {
      panel.innerHTML = `
        <div class="tool-group">
          <div class="tool-section-title"><span>Thiết kế bìa & Quyền riêng tư</span></div>
          <p style="font-size:0.84rem;color:var(--ink-muted);margin:0 0 10px;">
            Cuốn sổ: <strong>${esc(album.title)}</strong><br/>
            Trạng thái: <strong>${album.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</strong>
          </p>
          <button type="button" class="btn btn-primary btn-sm" style="width:100%;margin-bottom:8px;" id="sidebarEditCoverBtn">Thiết kế lại bìa &amp; tên sổ</button>
          <button type="button" class="btn btn-soft btn-sm" style="width:100%;" id="sidebarShareBookBtn">Chia sẻ đường link</button>
        </div>

        <div class="tool-group">
          <div class="tool-section-title"><span>Tải xuống & Lưu trữ</span></div>
          <button type="button" class="btn btn-sage btn-sm" style="width:100%;margin-bottom:8px;" id="exportPngBtn">Tải Trang ${state.targetPageIndex + 1} dạng ảnh PNG</button>
          <button type="button" class="btn btn-soft btn-sm" style="width:100%;" id="exportPdfBtn">Xuất / In cuốn sổ PDF</button>
        </div>

        <div class="tool-group">
          <div class="tool-section-title"><span>Trải nghiệm đọc</span></div>
          <label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;">
            <input type="checkbox" id="toggleSoundChk" ${state.flipCtrl.soundEnabled ? 'checked' : ''}/>
            <span>Âm thanh lật giấy nhẹ nhàng</span>
          </label>
        </div>
      `;

      document.getElementById('sidebarEditCoverBtn').onclick = () => openEditCoverModal(state.activeAlbum);
      document.getElementById('sidebarShareBookBtn').onclick = () =>
        PTB.Exporter.openShareModal(state.activeAlbum, () => commitAlbumMutation(false));
      document.getElementById('exportPngBtn').onclick = () =>
        PTB.Exporter.exportPageAsPng(state.activeAlbum, state.targetPageIndex);
      document.getElementById('exportPdfBtn').onclick = () => PTB.Exporter.exportBookToPdfPrint(state.activeAlbum);
      document.getElementById('toggleSoundChk').onchange = (e) => {
        state.flipCtrl.soundEnabled = e.target.checked;
      };
    }

    // Bind Target Page Switch (Left vs Right)
    panel.querySelectorAll('[data-target-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.targetPageIndex = Number(btn.dataset.targetPage);
        renderEditorPanel();
      });
    });
  }

  function bindPagesTabEvents(panel) {
    panel.querySelectorAll('[data-layout-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = state.activeAlbum.pages[state.targetPageIndex];
        const layoutId = btn.dataset.layoutId;
        if (page.layout === layoutId) return;
        page.layout = layoutId;
        const def = PTB.Assets.getLayoutById(layoutId);
        while (page.photos.length < def.slots) {
          page.photos.push(PTB.Seed.makePhotoSlot('', '', def.defaultFrame, 0));
        }
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    panel.querySelectorAll('[data-paper-tone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeAlbum.pages[state.targetPageIndex].paperTone = btn.dataset.paperTone;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    document.getElementById('addPageBtn').addEventListener('click', () => {
      const newPage = {
        id: PTB.Storage.uid('page'),
        title: `Trang kỷ niệm ${state.activeAlbum.pages.length + 1}`,
        date: formatPageDateVN(),
        tags: ['#kyniem'],
        paperTone: 'ivory',
        layout: 'layout-2',
        titleFont: 'var(--font-hand)',
        note: 'Ghi chú lại những điều đáng nhớ ở đây...',
        noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
        photos: [
          PTB.Seed.makePhotoSlot('', '', 'polaroid', -2),
          PTB.Seed.makePhotoSlot('', '', 'polaroid', 2),
        ],
        decors: [],
      };
      state.activeAlbum.pages.push(newPage);
      const newIdx = state.activeAlbum.pages.length - 1;
      state.targetPageIndex = newIdx;
      state.flipCtrl.jumpToPage(state.activeAlbum, newIdx);
      commitAlbumMutation(true);
      renderBookView();
      renderEditorPanel();
      showToast(`Đã thêm Trang ${newIdx + 1}`);
    });

    panel.querySelectorAll('[data-jump-page]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-page-act]')) return;
        const idx = Number(row.dataset.jumpPage);
        state.targetPageIndex = idx;
        state.flipCtrl.jumpToPage(state.activeAlbum, idx);
        renderBookView();
        renderEditorPanel();
      });
    });

    panel.querySelectorAll('[data-page-act]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.pageAct;
        const idx = Number(btn.dataset.idx);
        const pages = state.activeAlbum.pages;

        if (act === 'up' && idx > 0) {
          [pages[idx - 1], pages[idx]] = [pages[idx], pages[idx - 1]];
          state.targetPageIndex = idx - 1;
        } else if (act === 'down' && idx < pages.length - 1) {
          [pages[idx + 1], pages[idx]] = [pages[idx], pages[idx + 1]];
          state.targetPageIndex = idx + 1;
        } else if (act === 'dup') {
          const copy = PTB.Storage.deepClone(pages[idx]);
          copy.id = PTB.Storage.uid('page');
          copy.title = `${copy.title} (Bản sao)`;
          pages.splice(idx + 1, 0, copy);
          state.targetPageIndex = idx + 1;
        } else if (act === 'del') {
          if (pages.length <= 2) {
            showToast('Cuốn sổ cần ít nhất 2 trang để lật.');
            return;
          }
          pages.splice(idx, 1);
          state.targetPageIndex = Math.min(idx, pages.length - 1);
        }

        state.flipCtrl.jumpToPage(state.activeAlbum, state.targetPageIndex);
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });
  }

  function bindFreePhotoTabEvents(panel, dIdx) {
    const page = state.activeAlbum.pages[state.targetPageIndex];
    const decor = page.decors && page.decors[dIdx];
    if (!decor) return;

    const delBtn = document.getElementById('deleteFreePhotoBtn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        page.decors.splice(dIdx, 1);
        state.selection = { type: null, pageIndex: state.targetPageIndex };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
        showToast('Đã xóa ảnh tự do khỏi trang');
      });
    }

    const replaceBtn = document.getElementById('replaceFreePhotoBtn');
    if (replaceBtn) {
      replaceBtn.addEventListener('click', () => {
        triggerReplaceFreePhoto(state.targetPageIndex, dIdx);
      });
    }

    const cropBtn = document.getElementById('cropFreePhotoBtn');
    if (cropBtn) {
      cropBtn.addEventListener('click', () => {
        PTB.Cropper.openCropper(decor.src, (croppedUrl) => {
          decor.src = croppedUrl;
          decor.zoom = 1;
          decor.panX = 0;
          decor.panY = 0;
          commitAlbumMutation(true);
          renderBookView();
          renderEditorPanel();
          showToast('Đã cắt ảnh xong!');
        });
      });
    }

    const capInp = document.getElementById('freePhotoCaptionInput');
    if (capInp) {
      capInp.addEventListener('input', () => {
        decor.caption = capInp.value;
        const domCaption = document.querySelector(
          `#bookPaperStack .decor-item[data-page-index="${state.targetPageIndex}"][data-decor-index="${dIdx}"] .photo-caption`
        );
        if (domCaption) domCaption.textContent = capInp.value;
      });
      capInp.addEventListener('change', () => commitAlbumMutation(true));
    }

    panel.querySelectorAll('[data-free-frame-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        decor.frame = btn.dataset.freeFrameId;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    const bindRange = (id, key, suffix = '', factor = 1) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        decor[key] = Number(el.value);
        const labelVal = el.parentElement?.querySelector('.control-label span:last-child');
        if (labelVal) {
          labelVal.textContent =
            factor === 100 ? `${Math.round(decor[key] * 100)}%` : `${decor[key]}${suffix}`;
        }
        renderBookView();
      });
      el.addEventListener('change', () => commitAlbumMutation(true));
    };

    bindRange('freePhotoScaleRange', 'scale', '%', 100);
    bindRange('freePhotoRotateRange', 'rotate', '°');
    bindRange('freePhotoZoomRange', 'zoom', '%', 100);
    bindRange('freePhotoPanXRange', 'panX', 'px');
    bindRange('freePhotoPanYRange', 'panY', 'px');

    const rot90 = document.getElementById('freePhotoRotate90Btn');
    if (rot90) {
      rot90.addEventListener('click', () => {
        decor.imgRotate = ((decor.imgRotate || 0) + 90) % 360;
        commitAlbumMutation(true);
        renderBookView();
      });
    }

    const resetBtn = document.getElementById('freePhotoResetTransformBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        decor.zoom = 1;
        decor.panX = 0;
        decor.panY = 0;
        decor.imgRotate = 0;
        decor.rotate = -2;
        decor.scale = 1;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    }

    const deselectBtn = document.getElementById('freePhotoDeselectBtn');
    if (deselectBtn) {
      deselectBtn.addEventListener('click', () => {
        state.selection = { type: null, pageIndex: state.targetPageIndex };
        renderBookView();
        renderEditorPanel();
      });
    }
  }

  function bindFreeTextTabEvents(panel, dIdx) {
    const page = state.activeAlbum.pages[state.targetPageIndex];
    const decor = page.decors && page.decors[dIdx];
    if (!decor) return;

    const delBtn = document.getElementById('deleteFreeTextBtn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        page.decors.splice(dIdx, 1);
        state.selection = { type: null, pageIndex: state.targetPageIndex };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
        showToast('Đã xóa chữ tự do');
      });
    }

    const txtInp = document.getElementById('freeTextInput');
    if (txtInp) {
      txtInp.addEventListener('input', () => {
        decor.text = txtInp.value;
        const domBox = document.querySelector(
          `#bookPaperStack .decor-item[data-page-index="${state.targetPageIndex}"][data-decor-index="${dIdx}"] .free-text-box, #bookPaperStack .decor-item[data-page-index="${state.targetPageIndex}"][data-decor-index="${dIdx}"] .sticky-note-paper`
        );
        if (domBox) domBox.textContent = txtInp.value;
      });
      txtInp.addEventListener('change', () => commitAlbumMutation(true));
    }

    const fontSel = document.getElementById('freeTextFontSelect');
    if (fontSel) {
      fontSel.addEventListener('change', (e) => {
        decor.font = e.target.value;
        commitAlbumMutation(true);
        renderBookView();
      });
    }

    const sizeRange = document.getElementById('freeTextSizeRange');
    if (sizeRange) {
      sizeRange.addEventListener('input', () => {
        decor.fontSize = Number(sizeRange.value);
        const labelVal = sizeRange.parentElement?.querySelector('.control-label span:last-child');
        if (labelVal) labelVal.textContent = `${sizeRange.value}px`;
        renderBookView();
      });
      sizeRange.addEventListener('change', () => commitAlbumMutation(true));
    }

    panel.querySelectorAll('[data-ftext-align]').forEach((btn) => {
      btn.addEventListener('click', () => {
        decor.align = btn.dataset.ftextAlign;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    panel.querySelectorAll('[data-ftext-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        decor.color = btn.dataset.ftextColor;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    panel.querySelectorAll('[data-ftext-bg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        decor.bg = btn.dataset.ftextBg;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    const scaleRange = document.getElementById('freeTextScaleRange');
    if (scaleRange) {
      scaleRange.addEventListener('input', () => {
        decor.scale = Number(scaleRange.value);
        const labelVal = scaleRange.parentElement?.querySelector('.control-label span:last-child');
        if (labelVal) labelVal.textContent = `${Math.round(decor.scale * 100)}%`;
        renderBookView();
      });
      scaleRange.addEventListener('change', () => commitAlbumMutation(true));
    }

    const rotRange = document.getElementById('freeTextRotateRange');
    if (rotRange) {
      rotRange.addEventListener('input', () => {
        decor.rotate = Number(rotRange.value);
        const labelVal = rotRange.parentElement?.querySelector('.control-label span:last-child');
        if (labelVal) labelVal.textContent = `${decor.rotate}°`;
        renderBookView();
      });
      rotRange.addEventListener('change', () => commitAlbumMutation(true));
    }

    const deselectBtn = document.getElementById('freeTextDeselectBtn');
    if (deselectBtn) {
      deselectBtn.addEventListener('click', () => {
        state.selection = { type: null, pageIndex: state.targetPageIndex };
        renderBookView();
        renderEditorPanel();
      });
    }
  }

  function bindPhotosTabEvents(panel, selSlotIdx) {
    const addFreeBtn = document.getElementById('addFreePhotoBtn');
    if (addFreeBtn) {
      addFreeBtn.addEventListener('click', () => {
        triggerAddFreePhoto(state.targetPageIndex);
      });
    }

    panel.querySelectorAll('[data-pick-free-photo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dIdx = Number(btn.dataset.pickFreePhoto);
        state.selection = { type: 'decor', pageIndex: state.targetPageIndex, decorIndex: dIdx };
        renderBookView();
        renderEditorPanel();
      });
    });

    const uploadBtn = document.getElementById('sidebarUploadBtn');
    if (!uploadBtn) return; // Layout-free with 0 template slots

    panel.querySelectorAll('[data-pick-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.pickSlot);
        state.selection = { type: 'photo', pageIndex: state.targetPageIndex, slotIndex: sIdx };
        renderBookView();
        renderEditorPanel();
      });
    });

    uploadBtn.addEventListener('click', () => {
      triggerPhotoUploadForSlot(state.targetPageIndex, selSlotIdx);
    });

    const cropBtn = document.getElementById('openCropBtn');
    if (cropBtn) {
      cropBtn.addEventListener('click', () => {
        const slot = ensureSlotExists(state.targetPageIndex, selSlotIdx);
        PTB.Cropper.openCropper(slot.src, (croppedUrl) => {
          slot.src = croppedUrl;
          slot.zoom = 1;
          slot.panX = 0;
          slot.panY = 0;
          commitAlbumMutation(true);
          renderBookView();
          renderEditorPanel();
          showToast('Đã cắt ảnh xong!');
        });
      });
    }

    const delBtn = document.getElementById('removeSlotPhotoBtn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        const slot = ensureSlotExists(state.targetPageIndex, selSlotIdx);
        slot.src = '';
        slot.caption = '';
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
        showToast('Đã xóa ảnh khỏi khung');
      });
    }

    panel.querySelectorAll('[data-frame-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = ensureSlotExists(state.targetPageIndex, selSlotIdx);
        slot.frame = btn.dataset.frameId;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    const bindRange = (id, key, suffix = '') => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const slot = ensureSlotExists(state.targetPageIndex, selSlotIdx);
        slot[key] = Number(el.value);
        const labelVal = el.parentElement?.querySelector('.control-label span:last-child');
        if (labelVal) {
          labelVal.textContent = key === 'zoom' ? `${Math.round(slot[key] * 100)}%` : `${slot[key]}${suffix}`;
        }
        renderBookView();
      });
      el.addEventListener('change', () => commitAlbumMutation(true));
    };

    bindRange('photoZoomRange', 'zoom');
    bindRange('photoPanXRange', 'panX', 'px');
    bindRange('photoPanYRange', 'panY', 'px');
    bindRange('frameTiltRange', 'frameRotate', '°');

    document.getElementById('rotateImg90Btn').addEventListener('click', () => {
      const slot = ensureSlotExists(state.targetPageIndex, selSlotIdx);
      slot.imgRotate = ((slot.imgRotate || 0) + 90) % 360;
      commitAlbumMutation(true);
      renderBookView();
    });

    document.getElementById('resetPhotoTransformBtn').addEventListener('click', () => {
      const slot = ensureSlotExists(state.targetPageIndex, selSlotIdx);
      slot.zoom = 1;
      slot.panX = 0;
      slot.panY = 0;
      slot.imgRotate = 0;
      slot.frameRotate = 0;
      commitAlbumMutation(true);
      renderBookView();
      renderEditorPanel();
    });
  }

  function bindTextTabEvents(panel) {
    const page = state.activeAlbum.pages[state.targetPageIndex];
    const ensureNoteStyle = () => {
      page.noteStyle = page.noteStyle || { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' };
      return page.noteStyle;
    };

    const titleInp = document.getElementById('sidebarPageTitleInput');
    titleInp.addEventListener('input', () => {
      page.title = titleInp.value;
      renderBookView();
    });
    titleInp.addEventListener('change', () => commitAlbumMutation(true));

    const dateInp = document.getElementById('sidebarPageDateInput');
    dateInp.addEventListener('input', () => {
      page.date = dateInp.value;
      renderBookView();
    });
    dateInp.addEventListener('change', () => commitAlbumMutation(true));

    document.getElementById('titleFontSelect').addEventListener('change', (e) => {
      page.titleFont = e.target.value;
      commitAlbumMutation(true);
      renderBookView();
    });

    const noteInp = document.getElementById('sidebarPageNoteInput');
    noteInp.addEventListener('input', () => {
      page.note = noteInp.value;
      renderBookView();
    });
    noteInp.addEventListener('change', () => commitAlbumMutation(true));

    document.getElementById('noteFontSelect').addEventListener('change', (e) => {
      ensureNoteStyle().font = e.target.value;
      commitAlbumMutation(true);
      renderBookView();
    });

    const sizeRange = document.getElementById('noteSizeRange');
    sizeRange.addEventListener('input', () => {
      ensureNoteStyle().size = Number(sizeRange.value);
      const labelVal = sizeRange.parentElement?.querySelector('.control-label span:last-child');
      if (labelVal) labelVal.textContent = `${sizeRange.value}px`;
      renderBookView();
    });
    sizeRange.addEventListener('change', () => commitAlbumMutation(true));

    panel.querySelectorAll('[data-note-align]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ensureNoteStyle().align = btn.dataset.noteAlign;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    panel.querySelectorAll('[data-note-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ensureNoteStyle().color = btn.dataset.noteColor;
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    const addFreeTxtBtn = document.getElementById('addFreeTextBtn');
    if (addFreeTxtBtn) {
      addFreeTxtBtn.addEventListener('click', () => {
        page.decors = page.decors || [];
        const x = 35 + Math.round(Math.random() * 30);
        const y = 35 + Math.round(Math.random() * 30);
        page.decors.push(PTB.Seed.makeFreeText('Gõ chữ ở đây...', x, y, 0));
        state.selection = { type: 'decor', pageIndex: state.targetPageIndex, decorIndex: page.decors.length - 1 };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
        showToast('Đã thêm chữ tự do — kéo thả để di chuyển!');
      });
    }

    const addNoteBtn = document.getElementById('addFreeNoteBtn');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => {
        page.decors = page.decors || [];
        const x = 35 + Math.round(Math.random() * 30);
        const y = 35 + Math.round(Math.random() * 30);
        page.decors.push(PTB.Seed.makeFreeNote('Một lời nhắn nhỏ ✨', x, y, -2, '#FCF3D9'));
        state.selection = { type: 'decor', pageIndex: state.targetPageIndex, decorIndex: page.decors.length - 1 };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
        showToast('Đã dán thêm giấy Note — kéo để di chuyển!');
      });
    }

    panel.querySelectorAll('[data-pick-free-text]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dIdx = Number(btn.dataset.pickFreeText);
        state.selection = { type: 'decor', pageIndex: state.targetPageIndex, decorIndex: dIdx };
        renderBookView();
        renderEditorPanel();
      });
    });

    // Page Tags Management
    panel.querySelectorAll('.editor-tag-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tIdx = Number(btn.dataset.tagIdx);
        if (Array.isArray(page.tags) && tIdx >= 0 && tIdx < page.tags.length) {
          page.tags.splice(tIdx, 1);
          commitAlbumMutation(true);
          renderBookView();
          renderEditorPanel();
        }
      });
    });

    const addTagFromInput = () => {
      const inp = document.getElementById('newTagInput');
      if (!inp) return;
      const formatted = PTB.Home.formatCleanTag(inp.value);
      if (!formatted) return;
      page.tags = Array.isArray(page.tags) ? page.tags : [];
      const key = PTB.Home.normalizeTagKey(formatted);
      const exists = page.tags.some((t) => PTB.Home.normalizeTagKey(t) === key);
      if (!exists) {
        page.tags.push(formatted);
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
        showToast(`Đã gắn thẻ ${formatted}`);
      } else {
        showToast(`Thẻ ${formatted} đã có trên trang này`);
      }
    };

    const addTagBtn = document.getElementById('addNewTagBtn');
    if (addTagBtn) addTagBtn.addEventListener('click', addTagFromInput);

    const newTagInput = document.getElementById('newTagInput');
    if (newTagInput) {
      newTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTagFromInput();
        }
      });
    }

    panel.querySelectorAll('[data-preset-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.presetTag;
        page.tags = Array.isArray(page.tags) ? page.tags : [];
        const key = PTB.Home.normalizeTagKey(preset);
        const existingIdx = page.tags.findIndex((t) => PTB.Home.normalizeTagKey(t) === key);
        if (existingIdx >= 0) {
          page.tags.splice(existingIdx, 1);
        } else {
          page.tags.push(preset);
        }
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });
  }

  function bindStickersTabEvents(panel) {
    const page = state.activeAlbum.pages[state.targetPageIndex];

    panel.querySelectorAll('[data-add-sticker]').forEach((btn) => {
      btn.addEventListener('click', () => {
        page.decors = page.decors || [];
        const x = 35 + Math.round(Math.random() * 30);
        const y = 35 + Math.round(Math.random() * 30);
        page.decors.push(PTB.Seed.makeSticker(btn.dataset.addSticker, x, y, 1, 0));
        state.selection = { type: 'decor', pageIndex: state.targetPageIndex, decorIndex: page.decors.length - 1 };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    });

    const scaleRange = document.getElementById('decorScaleRange');
    if (scaleRange) {
      scaleRange.addEventListener('input', () => {
        const d = page.decors[state.selection.decorIndex];
        if (!d) return;
        d.scale = Number(scaleRange.value);
        renderBookView();
      });
      scaleRange.addEventListener('change', () => commitAlbumMutation(true));
    }

    const rotRange = document.getElementById('decorRotateRange');
    if (rotRange) {
      rotRange.addEventListener('input', () => {
        const d = page.decors[state.selection.decorIndex];
        if (!d) return;
        d.rotate = Number(rotRange.value);
        renderBookView();
      });
      rotRange.addEventListener('change', () => commitAlbumMutation(true));
    }

    const delDecorBtn = document.getElementById('deleteSelectedDecorBtn');
    if (delDecorBtn) {
      delDecorBtn.addEventListener('click', () => {
        page.decors.splice(state.selection.decorIndex, 1);
        state.selection = { type: null, pageIndex: state.targetPageIndex };
        commitAlbumMutation(true);
        renderBookView();
        renderEditorPanel();
      });
    }
  }

  function bindGlobalEvents() {
    // Filter pills on homepage
    document.querySelectorAll('.filter-pill[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill[data-filter]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.filter = btn.dataset.filter;
        renderHome();
      });
    });

    // Discovery Bar: Search input & Clear
    const searchInp = document.getElementById('homeSearchInput');
    const searchClear = document.getElementById('homeSearchClearBtn');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        state.searchQuery = searchInp.value.trim();
        if (searchClear) searchClear.classList.toggle('hidden', !state.searchQuery);
        renderHome();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInp) searchInp.value = '';
        state.searchQuery = '';
        searchClear.classList.add('hidden');
        renderHome();
        if (searchInp) searchInp.focus();
      });
    }

    const resetLink = document.getElementById('searchResetLink');
    if (resetLink) {
      resetLink.addEventListener('click', () => {
        state.searchQuery = '';
        state.activeTag = '';
        if (searchInp) searchInp.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        renderHome();
      });
    }

    // View Mode Toggle (Cuốn sổ vs Dòng thời gian) & Timeline Sort
    const booksBtn = document.getElementById('viewModeBooksBtn');
    const timelineBtn = document.getElementById('viewModeTimelineBtn');
    const sortBtn = document.getElementById('timelineSortBtn');

    if (booksBtn) {
      booksBtn.addEventListener('click', () => {
        state.viewMode = 'books';
        renderHome();
      });
    }
    if (timelineBtn) {
      timelineBtn.addEventListener('click', () => {
        state.viewMode = 'timeline';
        renderHome();
      });
    }
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        state.timelineSort = state.timelineSort === 'desc' ? 'asc' : 'desc';
        renderHome();
      });
    }

    const navTimelineLink = document.getElementById('navTimelineLink');
    if (navTimelineLink) {
      navTimelineLink.addEventListener('click', (e) => {
        e.preventDefault();
        state.viewMode = 'timeline';
        renderHome();
        const collectionSec = document.getElementById('collection');
        if (collectionSec) collectionSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const navCollectionLink = document.querySelector('.main-nav a[href="#collection"]');
    if (navCollectionLink) {
      navCollectionLink.addEventListener('click', () => {
        state.viewMode = 'books';
        renderHome();
      });
    }

    // Header & Hero CTA buttons
    document.getElementById('headerCreateBtn').addEventListener('click', openCreateBookModal);
    document.getElementById('heroCreateBtn').addEventListener('click', openCreateBookModal);

    // Import Backup (.ptb.json)
    const importBtn = document.getElementById('importBackupBtn');
    const importInput = document.getElementById('importBackupInput');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const imported = await PTB.Exporter.importAlbumFromJsonFile(file, state.albums);
          await PTB.Storage.saveAlbum(imported);
          state.albums.unshift(imported);
          renderHome();
          showToast(`Đã khôi phục cuốn sổ “${imported.title}”!`);
        } catch (err) {
          showToast(err.message || 'Không thể nhập tệp sao lưu.');
        } finally {
          importInput.value = '';
        }
      });
    }

    // Auth / Profile button
    const openProfile = () => {
      PTB.Home.openAuthModal(state.profile, (updated) => {
        state.profile = PTB.Storage.saveUserProfile(updated);
        PTB.Home.renderHeaderUser(state.profile);
      });
    };
    document.getElementById('headerUserPill').addEventListener('click', openProfile);
    document.getElementById('headerLoginBtn').addEventListener('click', () => {
      if (state.profile && state.profile.loggedIn) {
        state.profile = PTB.Storage.saveUserProfile({ name: '', tagline: '', loggedIn: false });
        PTB.Home.renderHeaderUser(state.profile);
        showToast('Đã đăng xuất tài khoản.');
      } else {
        openProfile();
      }
    });

    // Book topbar actions
    document.getElementById('backToHomeBtn').addEventListener('click', closeBookToHome);
    document.getElementById('modeEditBtn').addEventListener('click', () => setMode(true));
    document.getElementById('modePreviewBtn').addEventListener('click', () => setMode(false));
    document.getElementById('undoBtn').addEventListener('click', performUndo);
    document.getElementById('redoBtn').addEventListener('click', performRedo);

    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      const target = document.getElementById('bookView');
      if (!document.fullscreenElement) {
        target.requestFullscreen?.().catch(() => {});
        target.classList.add('is-fullscreen');
      } else {
        document.exitFullscreen?.().catch(() => {});
        target.classList.remove('is-fullscreen');
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const target = document.getElementById('bookView');
      if (!document.fullscreenElement && target) {
        target.classList.remove('is-fullscreen');
      }
    });

    document.querySelectorAll('.main-nav .nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        document.querySelectorAll('.main-nav .nav-link').forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    document.getElementById('topbarShareBtn').addEventListener('click', () => {
      if (!state.activeAlbum) return;
      PTB.Exporter.openShareModal(state.activeAlbum, () => commitAlbumMutation(false));
    });

    // Page flip arrow buttons
    document.getElementById('flipPrevBtn').addEventListener('click', () => {
      if (!state.activeAlbum) return;
      state.flipCtrl.flip('prev', state.activeAlbum, state.editMode, state.selection, getPageCallbacks());
    });
    document.getElementById('flipNextBtn').addEventListener('click', () => {
      if (!state.activeAlbum) return;
      state.flipCtrl.flip('next', state.activeAlbum, state.editMode, state.selection, getPageCallbacks());
    });

    // Editor tab switching
    document.querySelectorAll('.editor-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        syncTabButtons();
        renderEditorPanel();
      });
    });

    // File upload input handler
    document.getElementById('slotPhotoUploadInput').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !state.pendingUploadTarget) return;
      const { pIdx, sIdx } = state.pendingUploadTarget;
      await applyFileToSlot(pIdx, sIdx, file);
    });

    const freePhotoInp = document.getElementById('freePhotoUploadInput');
    if (freePhotoInp) {
      freePhotoInp.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const pIdx = state.pendingUploadTarget?.pIdx ?? state.targetPageIndex;
        await applyFileToFreePhoto(pIdx, file);
      });
    }

    const replaceFreePhotoInp = document.getElementById('replaceFreePhotoInput');
    if (replaceFreePhotoInp) {
      replaceFreePhotoInp.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file || !state.pendingReplaceFreePhotoTarget) return;
        const { pIdx, dIdx } = state.pendingReplaceFreePhotoTarget;
        await applyFileToReplaceFreePhoto(pIdx, dIdx, file);
      });
    }

    // Mobile drawer controls & one-hand quick photo FAB
    const sidebar = document.getElementById('editorSidebar');
    document.querySelectorAll('[data-mobile-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.mobileTab;
        if (sidebar.classList.contains('mobile-open') && state.activeTab === tab) {
          sidebar.classList.remove('mobile-open');
        } else {
          state.activeTab = tab;
          syncTabButtons();
          renderEditorPanel();
          sidebar.classList.add('mobile-open');
        }
      });
    });

    document.getElementById('mobileQuickPhotoFab').addEventListener('click', () => {
      if (!state.activeAlbum) return;
      const activePages = state.flipCtrl.getActivePageIndices(state.activeAlbum);
      const pIdx = activePages[0] ?? state.targetPageIndex;
      const page = state.activeAlbum.pages[pIdx];
      const layoutDef = PTB.Assets.getLayoutById(page.layout);
      const emptyIdx =
        layoutDef.slots > 0
          ? (page.photos || []).slice(0, layoutDef.slots).findIndex((p) => !p.src)
          : -1;
      if (emptyIdx >= 0) {
        triggerPhotoUploadForSlot(pIdx, emptyIdx);
      } else {
        triggerAddFreePhoto(pIdx);
      }
    });

    // Keyboard shortcuts (Arrow flip & Undo/Redo)
    global.addEventListener('keydown', (e) => {
      if (!state.activeAlbum) return;
      const activeTag = document.activeElement?.tagName;
      const isEditingText =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isEditingText) {
        e.preventDefault();
        if (e.shiftKey) performRedo();
        else performUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isEditingText) {
        e.preventDefault();
        performRedo();
      } else if (e.key === 'ArrowRight' && !isEditingText) {
        document.getElementById('flipNextBtn').click();
      } else if (e.key === 'ArrowLeft' && !isEditingText) {
        document.getElementById('flipPrevBtn').click();
      }
    });

    // Re-render cleanly on resize (crossing 768px desktop/mobile threshold)
    let resizeTimer = null;
    global.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.activeAlbum) renderBookView();
      }, 150);
    });
  }

  function initScrollNavObserver() {
    const navLinks = Array.from(document.querySelectorAll('.main-nav .nav-link'));
    if (!navLinks.length || !('IntersectionObserver' in global)) return;

    const setActiveHash = (hash) => {
      navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === hash));
    };

    const targets = [
      { el: document.querySelector('.hero-section'), hash: '#top' },
      { el: document.getElementById('collection'), hash: '#collection' },
      { el: document.getElementById('memories'), hash: '#memories' },
      { el: document.getElementById('about'), hash: '#about' },
    ].filter((t) => t.el);

    const observer = new IntersectionObserver(
      (entries) => {
        const homeView = document.getElementById('homeView');
        if (homeView && homeView.classList.contains('hidden')) return;
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const match = targets.find((t) => t.el === visible.target);
          if (match) setActiveHash(match.hash);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.5] }
    );

    targets.forEach((t) => observer.observe(t.el));
  }

  async function checkAndHandleSharedLink() {
    if (!PTB.Cloud) return false;
    const parsed = PTB.Cloud.parseShareParams();
    if (!parsed || !parsed.shareId) return false;

    showToast('Đang tải cuốn sổ kỷ niệm từ đám mây Supabase...');

    try {
      const remoteAlbum = await PTB.Cloud.fetchSharedAlbum(parsed.shareId, parsed.credentials);
      if (!remoteAlbum) throw new Error('Không tìm thấy dữ liệu cuốn sổ');

      state.activeAlbum = PTB.Storage.deepClone(remoteAlbum);
      state.activeAlbum.isRemoteShared = true;
      state.history.reset(state.activeAlbum);
      state.editMode = false;
      state.targetPageIndex = 0;
      state.selection = { type: null, pageIndex: 0, slotIndex: 0, decorIndex: 0 };

      document.getElementById('homeView').classList.add('hidden');
      document.getElementById('bookView').classList.remove('hidden');

      state.flipCtrl.jumpToPage(state.activeAlbum, 0);
      syncBookHeaderAndTheme();
      setMode(false); // Reader / Preview 3D mode

      const cloneBtn = document.getElementById('saveSharedCloneBtn');
      if (cloneBtn) {
        cloneBtn.onclick = async () => {
          const clone = PTB.Storage.deepClone(state.activeAlbum);
          clone.id = PTB.Storage.uid('album');
          delete clone.isRemoteShared;
          delete clone.cloudShareId;
          clone.title = `${clone.title} (Bản sao)`;
          clone.createdAt = Date.now();
          clone.updatedAt = Date.now();
          await PTB.Storage.saveAlbum(clone);
          state.albums.unshift(clone);
          state.activeAlbum = clone;
          syncBookHeaderAndTheme();
          setMode(true);
          showToast(`Đã lưu "${clone.title}" vào bàn làm việc của bạn!`);
        };
      }

      global.scrollTo(0, 0);
      return true;
    } catch (err) {
      showToast(err.message || 'Không thể tải cuốn sổ từ đám mây.');
      return false;
    }
  }

  async function handleHashRoute() {
    const hash = global.location.hash || '';
    const search = global.location.search || '';

    if (hash.includes('share=') || hash.includes('shared=') || search.includes('share=')) {
      const handled = await checkAndHandleSharedLink();
      if (handled) return;
    }

    const match = hash.match(/#book=([^&]+)/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      if (state.albums.some((a) => a.id === id)) {
        openBook(id, 0);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
