/* ==========================================================================
   PTB Online – Home Workspace, Photobook Collection & Auth Modal
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  function normalizeVN(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  }

  function normalizeTagKey(tag) {
    return normalizeVN(tag).replace(/^#+/, '').replace(/\s+/g, '');
  }

  function formatCleanTag(raw) {
    const cleaned = String(raw || '')
      .trim()
      .replace(/^#+/, '')
      .replace(/\s+/g, '');
    if (!cleaned) return '';
    return `#${cleaned}`;
  }

  function isAlbumAccessible(album, unlockedIds) {
    if (!album) return false;
    if (album.privacy !== 'private') return true;
    return Boolean(unlockedIds && unlockedIds.has(album.id));
  }

  function parseDateInfo(dateStr, fallback) {
    const raw = String(dateStr || '').trim();
    let year = null;
    let month = null;
    let day = null;

    // 1. "14 Tháng 05, 2026" or "14 thang 5 2026"
    let m = raw.match(/(\d{1,2})\s*th[aá]ng\s*(\d{1,2})(?:[,\s/\-]+(?:n[ăa]m\s*)?(\d{4}))?/i);
    if (m) {
      day = Number(m[1]);
      month = Number(m[2]);
      if (m[3]) year = Number(m[3]);
    }

    // 2. "Tháng 01/2026" or "05/2026"
    if (!month) {
      m = raw.match(/(?:th[aá]ng\s*)?(\d{1,2})\s*[/\-,\s]+\s*(\d{4})/i);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) {
        month = Number(m[1]);
        year = Number(m[2]);
        day = 1;
      }
    }

    // 3. "YYYY-MM-DD"
    if (!year) {
      m = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (m) {
        year = Number(m[1]);
        month = Number(m[2]);
        day = Number(m[3]);
      }
    }

    // 4. "DD/MM/YYYY"
    if (!year) {
      m = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (m) {
        day = Number(m[1]);
        month = Number(m[2]);
        year = Number(m[3]);
      }
    }

    // 5. Standalone year fallback in string
    if (!year) {
      m = raw.match(/\b(19\d{2}|20\d{2})\b/);
      if (m) year = Number(m[1]);
    }

    // Fallback to album startDate or createdAt
    if (!year || !month) {
      let fbDate = null;
      if (typeof fallback === 'string' && /^\d{4}-\d{1,2}-\d{1,2}/.test(fallback)) {
        const parts = fallback.split(/[-/]/);
        fbDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else if (fallback) {
        fbDate = new Date(fallback);
      }
      if (!fbDate || isNaN(fbDate.getTime())) fbDate = new Date();
      year = year || fbDate.getFullYear();
      month = month || fbDate.getMonth() + 1;
      day = day || fbDate.getDate();
    }

    month = Math.min(12, Math.max(1, month || 1));
    day = Math.min(31, Math.max(1, day || 1));

    const dt = new Date(year, month - 1, day);
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');

    return {
      year,
      month,
      day,
      timestamp: dt.getTime(),
      monthLabel: `Tháng ${monthStr}, ${year}`,
      yearLabel: `${year}`,
      displayDate: raw && raw !== 'Ghi chú' ? raw : `${dayStr} Tháng ${monthStr}, ${year}`,
    };
  }

  function extractPageAllTags(page) {
    const seen = new Map();
    const addTag = (t) => {
      const formatted = formatCleanTag(t);
      if (!formatted) return;
      const key = normalizeTagKey(formatted);
      if (key && !seen.has(key)) {
        seen.set(key, formatted);
      }
    };
    if (Array.isArray(page.tags)) {
      page.tags.forEach(addTag);
    }
    const inlineSrc = `${page.title || ''} ${page.note || ''}`;
    const matches = inlineSrc.match(/#[\p{L}\p{N}_-]+/gu);
    if (matches) matches.forEach(addTag);
    return Array.from(seen.values());
  }

  function countAlbumPhotos(album) {
    let total = 0;
    (album.pages || []).forEach((p) => {
      (p.photos || []).forEach((s) => {
        if (s.src) total++;
      });
      (p.decors || []).forEach((d) => {
        if (d.type === 'free-photo' && d.src) total++;
      });
    });
    return total;
  }

  function formatDateVN(ts) {
    if (!ts) return 'Gần đây';
    const d = new Date(ts);
    return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  }

  let bookMenuDismissBound = false;

  function closeAllBookMenus() {
    document.querySelectorAll('.book-more-menu:not(.hidden)').forEach((menu) => {
      menu.classList.add('hidden');
      const wrap = menu.closest('.book-more-wrap');
      const btn = wrap && wrap.querySelector('.book-more-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      const item = menu.closest('.book-item');
      if (item) item.classList.remove('menu-open');
    });
  }

  function bindBookMenuDismissOnce() {
    if (bookMenuDismissBound) return;
    bookMenuDismissBound = true;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.book-more-wrap')) {
        closeAllBookMenus();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllBookMenus();
    });
  }

  function renderHeaderUser(profile) {
    const avatarEl = document.getElementById('headerAvatar');
    const nameEl = document.getElementById('headerUserName');
    const loginBtn = document.getElementById('headerLoginBtn');
    const userPill = document.getElementById('headerUserPill');

    const isLoggedIn = Boolean(profile && profile.loggedIn && profile.name && profile.name.trim());

    if (userPill) {
      userPill.classList.toggle('hidden', !isLoggedIn);
    }

    if (isLoggedIn) {
      const name = profile.name.trim();
      const initials = name.charAt(0).toUpperCase();
      if (avatarEl) avatarEl.textContent = initials;
      if (nameEl) nameEl.textContent = name;
      if (loginBtn) loginBtn.textContent = 'Đăng xuất';
    } else {
      if (avatarEl) avatarEl.textContent = '';
      if (nameEl) nameEl.textContent = '';
      if (loginBtn) loginBtn.textContent = 'Đăng nhập';
    }
  }

  function renderBooksGrid(albums, filter = 'all', handlers = {}) {
    const grid = document.getElementById('booksGrid');
    const esc = PTB.PageRenderer.escapeHtml;

    const filtered = albums.filter((a) => {
      if (filter === 'public') return a.privacy === 'public';
      if (filter === 'private') return a.privacy === 'private';
      return true;
    });

    if (!filtered.length) {
      const isSearching = Boolean(handlers.hasSearchFilter);
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:42px 20px;color:var(--ink-muted);">
          <p style="font-family:var(--font-hand);font-size:1.6rem;margin:0 0 8px;">${
            isSearching ? 'Không tìm thấy cuốn sổ nào phù hợp...' : 'Chưa có cuốn sổ nào ở mục này...'
          }</p>
          <p style="margin:0 0 16px;">${
            isSearching
              ? 'Hãy thử từ khóa khác hoặc xóa bộ lọc tìm kiếm hiện tại.'
              : 'Hãy bắt đầu tạo cuốn album ảnh kỷ niệm đầu tiên cho riêng bạn.'
          }</p>
          ${
            isSearching
              ? '<button class="btn btn-soft" id="emptyResetFilterBtn">Xóa bộ lọc tìm kiếm</button>'
              : '<button class="btn btn-primary" id="emptyCreateBtn">+ Tạo cuốn sổ mới</button>'
          }
        </div>
      `;
      const btn = document.getElementById('emptyCreateBtn');
      if (btn && handlers.onCreateNew) btn.onclick = handlers.onCreateNew;
      const resetBtn = document.getElementById('emptyResetFilterBtn');
      if (resetBtn && handlers.onResetFilter) resetBtn.onclick = handlers.onResetFilter;
      return;
    }

    bindBookMenuDismissOnce();
    grid.innerHTML = '';
    filtered.forEach((album, idx) => {
      const photoCount = countAlbumPhotos(album);
      const tiltClass = idx % 2 === 0 ? 'tilt-left' : 'tilt-right';

      const card = document.createElement('div');
      card.className = 'book-item';
      card.innerHTML = `
        <div class="book-cover-card cover-theme-${esc(album.coverTheme || 'leather')}" title="Nhấn để mở ${esc(album.title)}">
          <span class="cover-sparkle" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z"/>
            </svg>
          </span>
          <div class="cover-photo-window ${tiltClass}">
            <img src="${album.coverPhoto || PTB.Assets.createSampleArtPhoto('flowers')}" alt="${esc(album.title)}"/>
          </div>
          <div class="cover-title-plate">
            <span class="cover-memories-label">MEMORIES OF</span>
            <h3 class="cover-title-text">${esc(album.title)}</h3>
          </div>
        </div>
        <div class="book-meta-below">
          <div class="book-meta-head">
            <h3 class="book-meta-title">${esc(album.title)}</h3>
            <div class="book-more-wrap">
              <button type="button" class="book-more-btn" aria-label="Tùy chọn cuốn sổ" aria-expanded="false" aria-haspopup="menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="2.1"/>
                  <circle cx="12" cy="12" r="2.1"/>
                  <circle cx="19" cy="12" r="2.1"/>
                </svg>
              </button>
              <div class="book-more-menu hidden" role="menu">
                <button type="button" class="book-more-item" data-act="edit-cover" role="menuitem">
                  <span aria-hidden="true">🎨</span><span>Thiết kế bìa</span>
                </button>
                <button type="button" class="book-more-item" data-act="share" role="menuitem">
                  <span aria-hidden="true">🔗</span><span>Chia sẻ</span>
                </button>
                <button type="button" class="book-more-item book-more-item-danger" data-act="delete" role="menuitem">
                  <span aria-hidden="true">🗑️</span><span>Xóa cuốn sổ</span>
                </button>
              </div>
            </div>
          </div>
          <p class="book-meta-desc">${esc(album.description || '')}</p>
          <div class="book-meta-stats">
            ${album.privacy === 'private' ? '<span class="book-lock-badge" title="Sổ riêng tư có mật khẩu">🔒</span>' : ''}
            <span>${formatDateVN(album.createdAt)} · ${photoCount} ảnh</span>
          </div>
          <div class="book-card-actions">
            <button type="button" class="btn-open-book">
              <span>Mở cuốn sổ</span>
              <svg class="btn-open-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      const moreBtn = card.querySelector('.book-more-btn');
      const moreMenu = card.querySelector('.book-more-menu');

      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !moreMenu.classList.contains('hidden');
        closeAllBookMenus();
        if (!isOpen) {
          moreMenu.classList.remove('hidden');
          moreBtn.setAttribute('aria-expanded', 'true');
          card.classList.add('menu-open');
        }
      });

      card.querySelector('.book-cover-card').addEventListener('click', () => handlers.onOpenBook(album.id));
      card.querySelector('.btn-open-book').addEventListener('click', () => handlers.onOpenBook(album.id));
      card.querySelector('[data-act="edit-cover"]').addEventListener('click', () => {
        closeAllBookMenus();
        handlers.onEditCover(album);
      });
      card.querySelector('[data-act="share"]').addEventListener('click', () => {
        closeAllBookMenus();
        handlers.onShare(album);
      });
      card.querySelector('[data-act="delete"]').addEventListener('click', () => {
        closeAllBookMenus();
        handlers.onDelete(album);
      });

      grid.appendChild(card);
    });

    // Add "Tạo cuốn sổ mới" dashed card at the end of the grid
    const createItem = document.createElement('div');
    createItem.className = 'book-item book-create-item';
    createItem.innerHTML = `
      <button type="button" class="book-create-card">
        <span class="book-create-plus" aria-hidden="true">+</span>
        <span class="book-create-title">Tạo cuốn sổ mới</span>
        <span class="book-create-sub">Bắt đầu một câu chuyện mới</span>
      </button>
    `;
    const createBtn = createItem.querySelector('.book-create-card');
    if (handlers.onCreateNew) {
      createBtn.addEventListener('click', handlers.onCreateNew);
    }
    grid.appendChild(createItem);
  }

  function renderMemoriesStrip(albums, onJumpToPage, unlockedIds = new Set()) {
    const container = document.getElementById('memoriesGrid');
    const esc = PTB.PageRenderer.escapeHtml;
    const highlights = [];

    // Only expose photos from public (or unlocked) albums so locked private books never leak onto home
    (albums || [])
      .filter((album) => isAlbumAccessible(album, unlockedIds))
      .forEach((album) => {
        (album.pages || []).forEach((page, pIdx) => {
          const firstPhoto =
            (page.photos || []).find((p) => p.src) ||
            (page.decors || []).find((d) => d.type === 'free-photo' && d.src);
          if (firstPhoto && highlights.length < 8) {
            highlights.push({
              albumId: album.id,
              albumTitle: album.title,
              pageIndex: pIdx,
              pageTitle: page.title,
              date: page.date,
              src: firstPhoto.src,
            });
          }
        });
      });

    container.innerHTML = '';
    if (!highlights.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--ink-muted);font-style:italic;">
          Chưa có trang kỷ niệm công khai nào để hiển thị ở đây.
        </div>
      `;
      return;
    }

    highlights.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'memory-postcard';
      card.innerHTML = `
        <img src="${item.src}" alt="${esc(item.pageTitle)}"/>
        <h4 class="memory-postcard-title">${esc(item.pageTitle)}</h4>
        <div class="memory-postcard-meta">${esc(item.albumTitle)} • ${esc(item.date || '')}</div>
      `;
      card.addEventListener('click', () => onJumpToPage(item.albumId, item.pageIndex));
      container.appendChild(card);
    });
  }

  function openAuthModal(profile, onSaveProfile) {
    const modal = document.getElementById('authModal');
    const nameInput = document.getElementById('authNameInput');
    const taglineInput = document.getElementById('authTaglineInput');
    const logoutBtn = document.getElementById('authLogoutBtn');

    const isLoggedIn = Boolean(profile && profile.loggedIn && profile.name && profile.name.trim());
    nameInput.value = isLoggedIn ? profile.name : '';
    taglineInput.value = isLoggedIn ? (profile.tagline || '') : '';

    if (logoutBtn) {
      logoutBtn.classList.toggle('hidden', !isLoggedIn);
      logoutBtn.onclick = () => {
        const updated = { name: '', tagline: '', loggedIn: false };
        onSaveProfile(updated);
        modal.classList.add('hidden');
        PTB.UI.showToast('Đã đăng xuất tài khoản.');
      };
    }

    modal.classList.remove('hidden');
    nameInput.focus();

    const handleSave = () => {
      const name = nameInput.value.trim();
      if (!name) {
        PTB.UI.showToast('Vui lòng nhập tên hiển thị của bạn.');
        nameInput.focus();
        return;
      }
      const tagline = taglineInput.value.trim();
      const updated = { ...profile, name, tagline, loggedIn: true };
      onSaveProfile(updated);
      modal.classList.add('hidden');
      PTB.UI.showToast(`Chào mừng ${name} quay lại bàn kỷ niệm!`);
    };

    document.getElementById('authSaveBtn').onclick = handleSave;

    nameInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    taglineInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
  }

  function initAuthModalEvents() {
    const modal = document.getElementById('authModal');
    document.getElementById('authCloseBtn').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('authCancelBtn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  let passwordModalState = null;

  function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.classList.add('hidden');
    passwordModalState = null;
  }

  function openPasswordModal(album, mode = 'unlock', onSuccess) {
    const modal = document.getElementById('passwordModal');
    const titleEl = document.getElementById('passwordModalTitle');
    const subEl = document.getElementById('passwordModalSubtitle');
    const labelEl = document.getElementById('passwordInputLabel');
    const inputEl = document.getElementById('passwordUnlockInput');
    const confirmWrap = document.getElementById('passwordConfirmWrap');
    const confirmEl = document.getElementById('passwordConfirmInput');
    const errorEl = document.getElementById('passwordUnlockError');
    const hintEl = document.getElementById('passwordSampleHint');
    const submitBtn = document.getElementById('passwordSubmitBtn');

    passwordModalState = { album, mode, onSuccess };

    const isSetMode = mode === 'set';
    titleEl.textContent = isSetMode ? '🔐 Đặt mật khẩu sổ riêng tư' : '🔒 Mở khóa sổ riêng tư';
    subEl.textContent = isSetMode
      ? `Hãy đặt mật khẩu để bảo vệ cuốn sổ “${album.title}”.`
      : `Cuốn sổ “${album.title}” đang ở chế độ riêng tư. Vui lòng nhập mật khẩu để mở.`;
    labelEl.textContent = isSetMode ? 'Mật khẩu mới' : 'Mật khẩu mở sổ';
    submitBtn.textContent = isSetMode ? 'Lưu mật khẩu' : 'Mở khóa';

    inputEl.value = '';
    inputEl.type = 'password';
    confirmEl.value = '';
    confirmWrap.classList.toggle('hidden', !isSetMode);

    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    const isSeedSample =
      !isSetMode &&
      (album.id === 'album_little_moments' || album.id === 'album_special_days') &&
      album.passwordHash === PTB.Storage.hashPassword('1234');
    hintEl.classList.toggle('hidden', !isSeedSample);

    modal.classList.remove('hidden');
    setTimeout(() => inputEl.focus(), 40);
  }

  function initPasswordModalEvents() {
    const modal = document.getElementById('passwordModal');
    const form = document.getElementById('passwordUnlockForm');
    const inputEl = document.getElementById('passwordUnlockInput');
    const confirmEl = document.getElementById('passwordConfirmInput');
    const errorEl = document.getElementById('passwordUnlockError');
    const toggleBtn = document.getElementById('passwordUnlockToggleBtn');

    if (!modal || !form) return;

    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      inputEl.classList.remove('input-shake');
      void inputEl.offsetWidth;
      inputEl.classList.add('input-shake');
      inputEl.focus();
    };

    toggleBtn.addEventListener('click', () => {
      inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('passwordCloseBtn').addEventListener('click', closePasswordModal);
    document.getElementById('passwordCancelBtn').addEventListener('click', closePasswordModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePasswordModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closePasswordModal();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!passwordModalState) return;
      const { album, mode, onSuccess } = passwordModalState;
      const rawPw = inputEl.value.trim();

      if (!rawPw) {
        showError('Vui lòng nhập mật khẩu.');
        return;
      }

      if (mode === 'set') {
        const confirmPw = confirmEl.value.trim();
        if (rawPw !== confirmPw) {
          showError('Mật khẩu xác nhận chưa khớp.');
          confirmEl.focus();
          return;
        }
        album.passwordHash = PTB.Storage.hashPassword(rawPw);
        await PTB.Storage.saveAlbum(album);
        const cb = onSuccess;
        closePasswordModal();
        if (cb) cb(album);
        return;
      }

      if (!PTB.Storage.verifyPassword(album, rawPw)) {
        showError('Mật khẩu chưa đúng, vui lòng thử lại.');
        return;
      }

      const cb = onSuccess;
      closePasswordModal();
      if (cb) cb(album);
    });
  }

  function initAboutReveal() {
    const section = document.getElementById('about');
    const frame = section && section.querySelector('[data-about-reveal]');
    if (!section || !frame) return;

    const reveal = () => {
      frame.classList.add('is-visible');
    };

    const isInOrAboveView = () => {
      const rect = frame.getBoundingClientRect();
      return rect.top <= (global.innerHeight || 800) * 0.95;
    };

    if (!('IntersectionObserver' in global) || global.location.hash === '#about' || isInOrAboveView()) {
      reveal();
      return;
    }

    section.classList.add('about-reveal-ready');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || isInOrAboveView()) {
            reveal();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );
    observer.observe(frame);

    const onScrollOrHash = () => {
      if (isInOrAboveView() || global.location.hash === '#about') {
        reveal();
        observer.disconnect();
        global.removeEventListener('scroll', onScrollOrHash);
        global.removeEventListener('hashchange', onScrollOrHash);
      }
    };
    global.addEventListener('scroll', onScrollOrHash, { passive: true });
    global.addEventListener('hashchange', onScrollOrHash);
  }

  function doesPageMatch(album, page, query, activeTag) {
    const tags = extractPageAllTags(page);
    if (activeTag) {
      const targetKey = normalizeTagKey(activeTag);
      const hasTag = tags.some((t) => normalizeTagKey(t) === targetKey);
      if (!hasTag) return false;
    }

    if (query) {
      const normQ = normalizeVN(query);
      const normQCompact = normQ.replace(/^#+/, '').replace(/\s+/g, '');
      const titleMatch = normalizeVN(page.title).includes(normQ);
      const noteMatch = normalizeVN(page.note).includes(normQ);
      const dateMatch = normalizeVN(page.date).includes(normQ);
      const albumMatch = normalizeVN(album.title).includes(normQ);
      const captionMatch =
        (page.photos || []).some((p) => normalizeVN(p.caption).includes(normQ)) ||
        (page.decors || []).some((d) => d.type === 'free-photo' && normalizeVN(d.caption).includes(normQ));
      const tagMatch = tags.some(
        (t) => normalizeVN(t).includes(normQ) || (normQCompact && normalizeTagKey(t).includes(normQCompact))
      );
      if (!titleMatch && !noteMatch && !dateMatch && !albumMatch && !captionMatch && !tagMatch) {
        return false;
      }
    }
    return true;
  }

  function collectUniqueTags(albums, unlockedIds = new Set(), filter = 'all') {
    const counts = new Map(); // normKey -> { label, count }
    (albums || [])
      .filter((a) => {
        if (!isAlbumAccessible(a, unlockedIds)) return false;
        if (filter === 'public') return a.privacy === 'public';
        if (filter === 'private') return a.privacy === 'private';
        return true;
      })
      .forEach((album) => {
        (album.pages || []).forEach((page) => {
          extractPageAllTags(page).forEach((tag) => {
            const key = normalizeTagKey(tag);
            if (!key) return;
            const prev = counts.get(key);
            if (prev) {
              prev.count += 1;
            } else {
              counts.set(key, { label: tag, key, count: 1 });
            }
          });
        });
      });

    const priority = ['dulich', 'banbe', 'giadinh', 'kyniem', 'chuyendi', 'cafe', 'sinhnhat'];
    return Array.from(counts.values()).sort((a, b) => {
      const pa = priority.indexOf(a.key);
      const pb = priority.indexOf(b.key);
      if (pa !== -1 && pb !== -1) return pa - pb;
      if (pa !== -1) return -1;
      if (pb !== -1) return 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'vi');
    });
  }

  function filterAndCollectSearchResults(albums, unlockedIds = new Set(), options = {}) {
    const { filter = 'all', query = '', activeTag = '' } = options;
    const normQ = normalizeVN(query);
    const hasSearch = Boolean(normQ || activeTag);

    const matchingAlbums = [];
    const matchingPages = [];
    const timelinePhotos = [];

    (albums || []).forEach((album) => {
      if (filter === 'public' && album.privacy !== 'public') return;
      if (filter === 'private' && album.privacy !== 'private') return;

      const accessible = isAlbumAccessible(album, unlockedIds);

      if (!hasSearch) {
        matchingAlbums.push(album);
      } else if (!accessible) {
        // Locked private albums only match on public cover metadata when no tag filter is active
        if (!activeTag && normQ) {
          const coverMatch =
            normalizeVN(album.title).includes(normQ) || normalizeVN(album.description).includes(normQ);
          if (coverMatch) matchingAlbums.push(album);
        }
      }

      if (!accessible) return;

      let albumHasPageMatch = false;
      (album.pages || []).forEach((page, pIdx) => {
        const matched = !hasSearch || doesPageMatch(album, page, query, activeTag);
        if (!matched) return;
        albumHasPageMatch = true;

        const tags = extractPageAllTags(page);
        const dateInfo = parseDateInfo(page.date, album.startDate || album.createdAt);
        const firstPhoto =
          (page.photos || []).find((p) => p.src) ||
          (page.decors || []).find((d) => d.type === 'free-photo' && d.src);

        if (hasSearch) {
          matchingPages.push({
            albumId: album.id,
            albumTitle: album.title,
            coverTheme: album.coverTheme || 'leather',
            pageIndex: pIdx,
            pageTitle: page.title || `Trang ${pIdx + 1}`,
            date: page.date || dateInfo.displayDate,
            note: page.note || '',
            tags,
            thumbSrc: firstPhoto ? firstPhoto.src : '',
          });
        }

        (page.photos || []).forEach((slot, sIdx) => {
          if (!slot.src) return;
          timelinePhotos.push({
            id: `${album.id}_p${pIdx}_s${sIdx}`,
            albumId: album.id,
            albumTitle: album.title,
            albumCoverTheme: album.coverTheme || 'leather',
            pageIndex: pIdx,
            pageTitle: page.title || `Trang ${pIdx + 1}`,
            date: page.date || dateInfo.displayDate,
            note: page.note || '',
            tags,
            src: slot.src,
            caption: slot.caption || '',
            frame: slot.frame || 'polaroid',
            dateInfo,
          });
        });

        (page.decors || []).forEach((decor, dIdx) => {
          if (decor.type !== 'free-photo' || !decor.src) return;
          timelinePhotos.push({
            id: `${album.id}_p${pIdx}_d${dIdx}`,
            albumId: album.id,
            albumTitle: album.title,
            albumCoverTheme: album.coverTheme || 'leather',
            pageIndex: pIdx,
            pageTitle: page.title || `Trang ${pIdx + 1}`,
            date: page.date || dateInfo.displayDate,
            note: page.note || '',
            tags,
            src: decor.src,
            caption: decor.caption || '',
            frame: decor.frame || 'polaroid',
            dateInfo,
          });
        });
      });

      if (hasSearch) {
        const coverMatch =
          !activeTag &&
          normQ &&
          (normalizeVN(album.title).includes(normQ) || normalizeVN(album.description).includes(normQ));
        if (albumHasPageMatch || coverMatch) {
          matchingAlbums.push(album);
        }
      }
    });

    return { matchingAlbums, matchingPages, timelinePhotos, hasSearch };
  }

  function renderTagPills(container, tagsList, activeTag, onSelectTag) {
    if (!container) return;
    const esc = PTB.PageRenderer.escapeHtml;
    const activeKey = activeTag ? normalizeTagKey(activeTag) : '';

    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `tag-pill-item ${!activeKey ? 'active' : ''}`;
    allBtn.textContent = 'Tất cả thẻ';
    allBtn.addEventListener('click', () => onSelectTag(''));
    container.appendChild(allBtn);

    tagsList.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = activeKey === item.key;
      btn.className = `tag-pill-item ${isActive ? 'active' : ''}`;
      btn.innerHTML = `<span>${esc(item.label)}</span><span class="tag-pill-count">${item.count}</span>`;
      btn.addEventListener('click', () => onSelectTag(isActive ? '' : item.label));
      container.appendChild(btn);
    });
  }

  function renderMatchingPages(container, pages, onJumpToPage, onTagClick) {
    if (!container) return;
    const esc = PTB.PageRenderer.escapeHtml;

    if (!pages.length) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="matching-pages-head">
        <h3 class="matching-pages-title">Trang kỷ niệm phù hợp (${pages.length})</h3>
        <span class="matching-pages-sub">Nhấn vào bất kỳ thẻ trang nào để mở thẳng đến trang đó</span>
      </div>
      <div class="matching-pages-grid"></div>
    `;

    const grid = container.querySelector('.matching-pages-grid');
    pages.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'matching-page-card';
      const snippet = item.note
        ? item.note.length > 96
          ? `${item.note.slice(0, 96).trim()}…`
          : item.note
        : 'Mở trang để xem ảnh và chi tiết kỷ niệm.';

      const tagsHtml = item.tags.length
        ? `<div class="matching-page-tags">${item.tags
            .map((t) => `<button type="button" class="mini-tag-chip" data-tag-filter="${esc(t)}">${esc(t)}</button>`)
            .join('')}</div>`
        : '';

      card.innerHTML = `
        <div class="matching-page-thumb">
          ${
            item.thumbSrc
              ? `<img src="${item.thumbSrc}" alt="${esc(item.pageTitle)}" />`
              : '<div class="matching-page-empty-thumb">Trang viết</div>'
          }
        </div>
        <div class="matching-page-body">
          <div class="matching-page-meta">
            <span class="matching-album-badge">${esc(item.albumTitle)}</span>
            <span class="matching-page-date">${esc(item.date)}</span>
          </div>
          <h4 class="matching-page-title">${esc(item.pageTitle)}</h4>
          <p class="matching-page-note">${esc(snippet)}</p>
          ${tagsHtml}
        </div>
      `;

      card.addEventListener('click', (e) => {
        const tagBtn = e.target.closest('[data-tag-filter]');
        if (tagBtn) {
          e.stopPropagation();
          if (onTagClick) onTagClick(tagBtn.dataset.tagFilter);
          return;
        }
        onJumpToPage(item.albumId, item.pageIndex);
      });

      grid.appendChild(card);
    });
  }

  function renderTimelineView(container, photos, sortOrder = 'desc', onJumpToPage, onTagClick, onResetFilter) {
    if (!container) return;
    const esc = PTB.PageRenderer.escapeHtml;

    if (!photos.length) {
      container.innerHTML = `
        <div class="timeline-empty-state">
          <div class="timeline-empty-badge">TIMELINE</div>
          <h3>Chưa có bức ảnh nào để hiển thị trên dòng thời gian</h3>
          <p>Các cuốn sổ riêng tư đang khóa mật khẩu sẽ được ẩn cho đến khi bạn mở khóa. Hoặc thử xóa bộ lọc hiện tại.</p>
          ${
            onResetFilter
              ? '<button type="button" class="btn btn-soft btn-sm" id="timelineEmptyResetBtn">Hiển thị tất cả kỷ niệm</button>'
              : ''
          }
        </div>
      `;
      const rBtn = container.querySelector('#timelineEmptyResetBtn');
      if (rBtn && onResetFilter) rBtn.addEventListener('click', onResetFilter);
      return;
    }

    const sorted = [...photos].sort((a, b) =>
      sortOrder === 'asc'
        ? a.dateInfo.timestamp - b.dateInfo.timestamp
        : b.dateInfo.timestamp - a.dateInfo.timestamp
    );

    const uniqueAlbums = new Set(sorted.map((p) => p.albumId)).size;

    // Group chronologically by Year -> Month
    const yearMap = new Map();
    sorted.forEach((photo) => {
      const y = photo.dateInfo.year;
      const m = photo.dateInfo.month;
      if (!yearMap.has(y)) {
        yearMap.set(y, { year: y, totalPhotos: 0, months: new Map() });
      }
      const yGroup = yearMap.get(y);
      yGroup.totalPhotos += 1;
      if (!yGroup.months.has(m)) {
        yGroup.months.set(m, {
          month: m,
          monthLabel: photo.dateInfo.monthLabel,
          items: [],
        });
      }
      yGroup.months.get(m).items.push(photo);
    });

    const years = Array.from(yearMap.values()).sort((a, b) =>
      sortOrder === 'asc' ? a.year - b.year : b.year - a.year
    );

    container.innerHTML = `
      <div class="timeline-summary-bar">
        <div class="timeline-summary-title">
          <span class="timeline-summary-eyebrow">CHRONOLOGICAL MEMORY TIMELINE</span>
          <h3 class="timeline-summary-heading">Dòng thời gian kỷ niệm</h3>
        </div>
        <div class="timeline-summary-stats">
          <span><strong>${sorted.length}</strong> bức ảnh</span>
          <span aria-hidden="true">•</span>
          <span><strong>${uniqueAlbums}</strong> cuốn sổ</span>
          <span aria-hidden="true">•</span>
          <span><strong>${years.length}</strong> năm lưu giữ</span>
        </div>
      </div>
      <div class="timeline-axis" id="timelineAxisRoot"></div>
    `;

    const axis = container.querySelector('#timelineAxisRoot');

    years.forEach((yGroup) => {
      const yearSection = document.createElement('section');
      yearSection.className = 'timeline-year-group';
      yearSection.innerHTML = `
        <div class="timeline-year-header">
          <div class="timeline-year-badge">
            <span class="timeline-year-star" aria-hidden="true">✦</span>
            <span class="timeline-year-number">Năm ${yGroup.year}</span>
            <span class="timeline-year-count">${yGroup.totalPhotos} ảnh</span>
          </div>
          <div class="timeline-year-rule" aria-hidden="true"></div>
        </div>
        <div class="timeline-months-stack"></div>
      `;

      const monthsStack = yearSection.querySelector('.timeline-months-stack');
      const months = Array.from(yGroup.months.values()).sort((a, b) =>
        sortOrder === 'asc' ? a.month - b.month : b.month - a.month
      );

      months.forEach((mGroup) => {
        const monthBlock = document.createElement('div');
        monthBlock.className = 'timeline-month-group';
        monthBlock.innerHTML = `
          <div class="timeline-month-marker">
            <span class="timeline-month-dot" aria-hidden="true"></span>
            <h4 class="timeline-month-heading">${esc(mGroup.monthLabel)}</h4>
            <span class="timeline-month-badge-count">${mGroup.items.length} khoảnh khắc</span>
          </div>
          <div class="timeline-cards-grid"></div>
        `;

        const cardsGrid = monthBlock.querySelector('.timeline-cards-grid');
        mGroup.items.forEach((item, idx) => {
          const card = document.createElement('article');
          const tiltClass = idx % 2 === 0 ? 'tilt-even' : 'tilt-odd';
          card.className = `timeline-polaroid-card ${tiltClass}`;

          const tagsHtml = item.tags.length
            ? `<div class="timeline-card-tags">${item.tags
                .slice(0, 3)
                .map((t) => `<button type="button" class="mini-tag-chip" data-tag-filter="${esc(t)}">${esc(t)}</button>`)
                .join('')}</div>`
            : '';

          card.innerHTML = `
            <span class="timeline-card-tape" aria-hidden="true"></span>
            <div class="timeline-card-photo">
              <img src="${item.src}" alt="${esc(item.caption || item.pageTitle)}" loading="lazy" />
            </div>
            <div class="timeline-card-body">
              <div class="timeline-card-meta-row">
                <span class="timeline-album-pill">${esc(item.albumTitle)}</span>
                <span class="timeline-card-date">${esc(item.date)}</span>
              </div>
              <h5 class="timeline-card-title">${esc(item.pageTitle)}</h5>
              ${
                item.caption
                  ? `<p class="timeline-card-caption">“${esc(item.caption)}”</p>`
                  : ''
              }
              ${tagsHtml}
            </div>
          `;

          card.addEventListener('click', (e) => {
            const tagBtn = e.target.closest('[data-tag-filter]');
            if (tagBtn) {
              e.stopPropagation();
              if (onTagClick) onTagClick(tagBtn.dataset.tagFilter);
              return;
            }
            onJumpToPage(item.albumId, item.pageIndex);
          });

          cardsGrid.appendChild(card);
        });

        monthsStack.appendChild(monthBlock);
      });

      axis.appendChild(yearSection);
    });
  }

  function initHeroCustomPhotos() {
    const leftImg = document.getElementById('heroPolaroidImgLeft');
    const rightImg = document.getElementById('heroPolaroidImgRight');
    if (!leftImg || !rightImg) return;

    const leftInput = document.getElementById('heroPhotoInputLeft');
    const rightInput = document.getElementById('heroPhotoInputRight');
    const leftResetBtn = document.getElementById('heroResetLeftBtn');
    const rightResetBtn = document.getElementById('heroResetRightBtn');
    const leftCap = document.getElementById('heroCapLeft');
    const rightCap = document.getElementById('heroCapRight');

    const defaultLeftSvg = leftImg.innerHTML;
    const defaultRightSvg = rightImg.innerHTML;
    const defaultLeftCap = 'our summer';
    const defaultRightCap = 'best day ever!';

    const applyPhotos = () => {
      const saved = PTB.Storage.getHeroCustomPhotos();
      if (saved.left) {
        leftImg.innerHTML =
          `<img src="${saved.left}" alt="Our Summer" class="hero-custom-uploaded-img" />` +
          `<div class="hero-photo-hover-overlay"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Thay ảnh</span></div>`;
        if (leftResetBtn) leftResetBtn.classList.remove('hidden');
      } else {
        leftImg.innerHTML = defaultLeftSvg;
        if (leftResetBtn) leftResetBtn.classList.add('hidden');
      }
      if (saved.capLeft && leftCap) {
        leftCap.textContent = saved.capLeft;
      }

      if (saved.right) {
        rightImg.innerHTML =
          `<img src="${saved.right}" alt="Best Day Ever" class="hero-custom-uploaded-img" />` +
          `<div class="hero-photo-hover-overlay"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Thay ảnh</span></div>`;
        if (rightResetBtn) rightResetBtn.classList.remove('hidden');
      } else {
        rightImg.innerHTML = defaultRightSvg;
        if (rightResetBtn) rightResetBtn.classList.add('hidden');
      }
      if (saved.capRight && rightCap) {
        rightCap.textContent = saved.capRight;
      }
    };

    applyPhotos();

    const handleFileUpload = async (file, side) => {
      if (!file) return;
      try {
        const compressed = await PTB.Storage.compressImageFile(file, 900, 0.88);
        if (side === 'left') {
          PTB.Storage.saveHeroCustomPhotos({ left: compressed });
          PTB.UI.showToast('Đã gắn ảnh vào khung bên trái ✨');
        } else {
          PTB.Storage.saveHeroCustomPhotos({ right: compressed });
          PTB.UI.showToast('Đã gắn ảnh vào khung bên phải ✨');
        }
        applyPhotos();
      } catch (err) {
        PTB.UI.showToast(err.message || 'Không thể tải ảnh lên.');
      }
    };

    leftImg.addEventListener('click', (e) => {
      e.stopPropagation();
      leftInput?.click();
    });
    rightImg.addEventListener('click', (e) => {
      e.stopPropagation();
      rightInput?.click();
    });

    leftInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file, 'left');
      e.target.value = '';
    });
    rightInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file, 'right');
      e.target.value = '';
    });

    leftResetBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      PTB.Storage.clearHeroCustomPhoto('left');
      if (leftCap) leftCap.textContent = defaultLeftCap;
      applyPhotos();
      PTB.UI.showToast('Đã khôi phục ảnh mẫu bên trái.');
    });
    rightResetBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      PTB.Storage.clearHeroCustomPhoto('right');
      if (rightCap) rightCap.textContent = defaultRightCap;
      applyPhotos();
      PTB.UI.showToast('Đã khôi phục ảnh mẫu bên phải.');
    });

    if (leftCap) {
      leftCap.addEventListener('click', (e) => e.stopPropagation());
      leftCap.addEventListener('blur', () => {
        const text = leftCap.textContent.trim() || defaultLeftCap;
        PTB.Storage.saveHeroCustomPhotos({ capLeft: text });
      });
      leftCap.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          leftCap.blur();
        }
      });
    }
    if (rightCap) {
      rightCap.addEventListener('click', (e) => e.stopPropagation());
      rightCap.addEventListener('blur', () => {
        const text = rightCap.textContent.trim() || defaultRightCap;
        PTB.Storage.saveHeroCustomPhotos({ capRight: text });
      });
      rightCap.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          rightCap.blur();
        }
      });
    }

    const setupDragDrop = (targetEl, side) => {
      targetEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        targetEl.classList.add('is-dragover');
      });
      targetEl.addEventListener('dragleave', () => {
        targetEl.classList.remove('is-dragover');
      });
      targetEl.addEventListener('drop', (e) => {
        e.preventDefault();
        targetEl.classList.remove('is-dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          handleFileUpload(file, side);
        }
      });
    };

    setupDragDrop(leftImg, 'left');
    setupDragDrop(rightImg, 'right');
  }

  PTB.Home = {
    countAlbumPhotos,
    renderHeaderUser,
    renderBooksGrid,
    renderMemoriesStrip,
    openAuthModal,
    initAuthModalEvents,
    openPasswordModal,
    initPasswordModalEvents,
    initAboutReveal,
    initHeroCustomPhotos,
    normalizeVN,
    normalizeTagKey,
    formatCleanTag,
    parseDateInfo,
    collectUniqueTags,
    filterAndCollectSearchResults,
    renderTagPills,
    renderMatchingPages,
    renderTimelineView,
  };
})(window);
