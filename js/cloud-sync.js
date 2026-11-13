/* ==========================================================================
   PTB Online – Supabase Cloud Sync & Public Shareable Link Service
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  const CONFIG_STORAGE_KEY = 'PTB_SUPABASE_CONFIG';

  // Default pre-fill or user-configured Supabase project credentials
  function getConfig() {
    try {
      const raw = global.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.url && parsed.anonKey) {
          return {
            url: String(parsed.url).trim().replace(/\/+$/, ''),
            anonKey: String(parsed.anonKey).trim(),
          };
        }
      }
    } catch {
      // ignore
    }
    return { url: 'https://pwiiydolbwhvnmptkziy.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aWl5ZG9sYndodm5tcHRreml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0OTk1NDksImV4cCI6MjExMDA3NTU0OX0.asqjxkWRYjI-bB2oIDEeeLpYv2EFYeRIoQPAnQ8qWi4' };
  }

  function saveConfig(url, anonKey) {
    const cleanUrl = String(url || '').trim().replace(/\/+$/, '');
    const cleanKey = String(anonKey || '').trim();
    if (!cleanUrl || !cleanKey) {
      throw new Error('Vui lòng nhập đầy đủ Supabase Project URL và Public Anon Key.');
    }
    const isHttpLocal = cleanUrl.startsWith('http://localhost') || cleanUrl.startsWith('http://127.0.0.1');
    if (!cleanUrl.startsWith('https://') && !isHttpLocal) {
      throw new Error('Supabase URL phải bắt đầu bằng https:// (Ví dụ: https://xyz.supabase.co)');
    }
    const cfg = { url: cleanUrl, anonKey: cleanKey };
    global.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    return cfg;
  }

  function clearConfig() {
    global.localStorage.removeItem(CONFIG_STORAGE_KEY);
  }

  function isConfigured(config = null) {
    const c = config || getConfig();
    return Boolean(c.url && c.anonKey);
  }

  function generateShareId() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let id = 'mem-';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  function packCredentials(config) {
    if (!config || !config.url || !config.anonKey) return '';
    try {
      const payload = JSON.stringify({ u: config.url, k: config.anonKey });
      return btoa(unescape(encodeURIComponent(payload)));
    } catch {
      return '';
    }
  }

  function unpackCredentials(token) {
    if (!token) return null;
    try {
      const decoded = decodeURIComponent(escape(atob(token)));
      const obj = JSON.parse(decoded);
      if (obj && obj.u && obj.k) {
        return {
          url: String(obj.u).trim().replace(/\/+$/, ''),
          anonKey: String(obj.k).trim(),
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  function buildShareUrl(shareId, config) {
    const origin = global.location.origin;
    const pathname = global.location.pathname;
    const cfg = config || getConfig();
    const token = packCredentials(cfg);
    const tokenParam = token ? `&sb=${encodeURIComponent(token)}` : '';
    return `${origin}${pathname}#share=${encodeURIComponent(shareId)}${tokenParam}`;
  }

  function parseShareParams() {
    const hash = global.location.hash || '';
    const search = global.location.search || '';

    // Check hash first: #share=xxx&sb=yyy
    let match = hash.match(/[#&]share=([^&]+)/i) || hash.match(/[#&]shared=([^&]+)/i);
    let tokenMatch = hash.match(/[#&]sb=([^&]+)/i);

    // Fallback to query string: ?share=xxx&sb=yyy
    if (!match) {
      match = search.match(/[?&]share=([^&]+)/i) || search.match(/[?&]shared=([^&]+)/i);
    }
    if (!tokenMatch) {
      tokenMatch = search.match(/[?&]sb=([^&]+)/i);
    }

    if (!match) return null;

    const shareId = decodeURIComponent(match[1]);
    const sbToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';
    const unpacked = unpackCredentials(sbToken);

    return { shareId, credentials: unpacked };
  }

  function getSetupSql() {
    return `-- ============================================================
-- MEMORA: Khởi tạo bảng lưu trữ cuốn sổ chia sẻ trên Supabase
-- Chạy đoạn mã này trong mục "SQL Editor" trên trang quản trị Supabase
-- ============================================================

-- 1. Tạo bảng shared_albums
create table if not exists public.shared_albums (
  id text primary key,
  album_id text,
  title text not null,
  owner text,
  description text,
  cover_theme text,
  cover_photo text,
  pages_count integer default 0,
  album_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Bật Row Level Security (RLS) để kiểm soát truy cập
alter table public.shared_albums enable row level security;

-- 3. Cho phép mọi người xem cuốn sổ công khai (Public Read)
drop policy if exists "Public Read Access" on public.shared_albums;
create policy "Public Read Access" on public.shared_albums
  for select using (true);

-- 4. Cho phép đăng tải cuốn sổ (Insert / Upsert)
drop policy if exists "Public Insert Access" on public.shared_albums;
create policy "Public Insert Access" on public.shared_albums
  for insert with check (true);

drop policy if exists "Public Update Access" on public.shared_albums;
create policy "Public Update Access" on public.shared_albums
  for update using (true);
`;
  }

  async function testConnection(url, anonKey) {
    const cleanUrl = String(url || '').trim().replace(/\/+$/, '');
    const cleanKey = String(anonKey || '').trim();
    if (!cleanUrl || !cleanKey) {
      throw new Error('Vui lòng điền đủ Supabase Project URL và Anon Key.');
    }

    const endpoint = `${cleanUrl}/rest/v1/shared_albums?select=id&limit=1`;
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
        },
      });
    } catch (err) {
      throw new Error(`Không thể kết nối tới Supabase (${err.message || 'Lỗi mạng hoặc CORS'}).`);
    }

    if (resp.status === 200 || resp.status === 206) {
      return { success: true, message: 'Kết nối thành công! Bảng shared_albums đã sẵn sàng.' };
    }

    const bodyText = await resp.text();
    if (resp.status === 401 || resp.status === 403) {
      throw new Error('Anon Key không chính xác hoặc không đủ quyền truy cập (Mã lỗi ' + resp.status + ').');
    }

    if (resp.status === 404 || bodyText.includes('relation') || bodyText.includes('does not exist')) {
      return {
        success: false,
        needTable: true,
        message: 'Kết nối tới Supabase được nhưng chưa có bảng `shared_albums`. Hãy chạy mã SQL tạo bảng.',
      };
    }

    throw new Error(`Phản hồi từ Supabase (${resp.status}): ${bodyText.slice(0, 120)}`);
  }

  async function publishAlbum(album, configOverride = null) {
    const cfg = configOverride || getConfig();
    if (!isConfigured(cfg)) {
      throw new Error('Chưa thiết lập cấu hình Supabase. Vui lòng cài đặt Project URL và Anon Key trước.');
    }

    if (album.privacy === 'private') {
      throw new Error('Cuốn sổ đang ở chế độ Riêng tư. Vui lòng chuyển sang Công khai trước khi chia sẻ.');
    }

    const shareId = album.cloudShareId || generateShareId();
    album.cloudShareId = shareId;
    album.cloudUpdatedAt = Date.now();

    const payload = {
      id: shareId,
      album_id: album.id,
      title: album.title || 'Cuốn sổ kỷ niệm',
      owner: album.owner || '',
      description: album.description || '',
      cover_theme: album.coverTheme || 'leather',
      cover_photo: album.coverPhoto || '',
      pages_count: Array.isArray(album.pages) ? album.pages.length : 0,
      album_data: album,
      updated_at: new Date().toISOString(),
    };

    const endpoint = `${cfg.url}/rest/v1/shared_albums`;
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error(`Lỗi kết nối tải lên đám mây: ${err.message || 'Mạng không ổn định'}`);
    }

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 404 || errText.includes('relation') || errText.includes('does not exist')) {
        throw new Error('Chưa tạo bảng `shared_albums` trên Supabase. Nhấn "Cài đặt Supabase" để lấy mã SQL tạo bảng.');
      }
      throw new Error(`Tải lên Supabase thất bại (${resp.status}): ${errText.slice(0, 120)}`);
    }

    const shareUrl = buildShareUrl(shareId, cfg);
    return {
      success: true,
      shareId,
      shareUrl,
      album,
    };
  }

  async function fetchSharedAlbum(shareId, configOverride = null) {
    const cfg = configOverride || getConfig();
    if (!isConfigured(cfg)) {
      throw new Error('Chưa có thông tin kết nối Supabase để tải cuốn sổ.');
    }

    const endpoint = `${cfg.url}/rest/v1/shared_albums?id=eq.${encodeURIComponent(shareId)}&select=*`;
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
        },
      });
    } catch (err) {
      throw new Error(`Không thể kết nối tới máy chủ đám mây: ${err.message || 'Lỗi mạng'}`);
    }

    if (!resp.ok) {
      throw new Error(`Lỗi tải cuốn sổ từ đám mây (${resp.status}).`);
    }

    const rows = await resp.json();
    if (!rows || !rows.length || !rows[0].album_data) {
      throw new Error('Không tìm thấy cuốn sổ trên đám mây. Đường liên kết có thể đã bị xóa hoặc không chính xác.');
    }

    const remoteAlbum = rows[0].album_data;
    remoteAlbum.cloudShareId = rows[0].id || shareId;
    remoteAlbum.isRemoteShared = true;
    return remoteAlbum;
  }

  PTB.Cloud = {
    getConfig,
    saveConfig,
    clearConfig,
    isConfigured,
    generateShareId,
    buildShareUrl,
    parseShareParams,
    getSetupSql,
    testConnection,
    publishAlbum,
    fetchSharedAlbum,
  };
})(window);
