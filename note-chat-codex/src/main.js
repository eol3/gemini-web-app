
import { createApp, reactive, ref, computed, onMounted, onUnmounted, watch } from "https://cdn.jsdelivr.net/npm/vue@3.5.13/dist/vue.esm-browser.prod.js";
import { createRouter, createWebHashHistory, useRouter } from "https://cdn.jsdelivr.net/npm/vue-router@4.5.0/dist/vue-router.esm-browser.prod.js";
import * as initSqlJs from "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/+esm";
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const THEME_MAP = {
  classic: { bg: "#ececec", panel: "#f7f7f7", line: "#171717", text: "#111", muted: "#666", accent: "#0d6efd" },
  ocean: { bg: "#e7eff5", panel: "#f4f9ff", line: "#14324a", text: "#0d2233", muted: "#446076", accent: "#2f88ff" },
  warm: { bg: "#f5efe5", panel: "#fcf8f2", line: "#4a3523", text: "#2d1f14", muted: "#7a6452", accent: "#d16a31" },
};

const APP_FILES = ["index.html", "src/main.js", "src/assets/main.css"];

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function arrayToBase64(bytes) {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArray(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

class BinaryStorage {
  constructor() {
    this.mode = "memory";
    this.root = null;
  }

  async init() {
    if (navigator.storage?.getDirectory) {
      this.root = await navigator.storage.getDirectory();
      this.mode = "opfs";
      return;
    }
    this.mode = "localStorage";
  }

  key(path) {
    return `noteapp:${path}`;

  }

  async write(path, bytes) {
    if (this.mode === "opfs") {
      const parts = path.split("/").filter(Boolean);
      const filename = parts.pop();
      let dir = this.root;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await dir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(bytes);
      await writable.close();
      return;
    }
    localStorage.setItem(this.key(path), arrayToBase64(bytes));
  }

  async read(path) {
    if (this.mode === "opfs") {
      try {
        const parts = path.split("/").filter(Boolean);
        const filename = parts.pop();
        let dir = this.root;
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part);
        }
        const fileHandle = await dir.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return new Uint8Array(await file.arrayBuffer());
      } catch {
        return null;
      }
    }
    const raw = localStorage.getItem(this.key(path));
    return raw ? base64ToArray(raw) : null;
  }

  async remove(path) {
    if (this.mode === "opfs") {
      try {
        const parts = path.split("/").filter(Boolean);
        const filename = parts.pop();
        let dir = this.root;
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part);
        }
        await dir.removeEntry(filename);
      } catch {}
      return;
    }
    localStorage.removeItem(this.key(path));
  }

  async list(prefix = "") {
    if (this.mode === "opfs") {
      const result = [];
      const walk = async (dirHandle, currentPath) => {
        for await (const [name, handle] of dirHandle.entries()) {
          const nextPath = currentPath ? `${currentPath}/${name}` : name;
          if (handle.kind === "file") {
            if (nextPath.startsWith(prefix)) result.push(nextPath);
          } else {
            await walk(handle, nextPath);
          }
        }
      };
      await walk(this.root, "");
      return result;
    }

    const out = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("noteapp:")) continue;
      const path = key.slice(8);
      if (path.startsWith(prefix)) out.push(path);
    }
    return out;
  }
}

class DataService {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.storage = new BinaryStorage();
  }

  async init() {
    this.SQL = await window.initSqlJs({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}` });
    await this.storage.init();
    const existing = await this.storage.read("data/data.sql");
    this.db = existing ? new this.SQL.Database(existing) : new this.SQL.Database();
    this.db.run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        mime TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id)
      );
    `);

    const info = this.rowsFrom(this.db, "PRAGMA table_info(notes)");
    const categoryCol = info.find((col) => col.name === "category_id");
    if (categoryCol && Number(categoryCol.notnull) === 1) {
      this.db.run("ALTER TABLE notes RENAME TO notes_old");
      this.db.run(`
        CREATE TABLE notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        );
      `);
      this.db.run(`
        INSERT INTO notes(id, category_id, title, content, created_at, updated_at)
        SELECT id, category_id, title, content, created_at, updated_at FROM notes_old;
      `);
      this.db.run("DROP TABLE notes_old");
    }

    if (!this.getSetting("notebook_name")) this.setSetting("notebook_name", "記事本");
    if (!this.getSetting("theme")) this.setSetting("theme", "classic");
    await this.flush();
  }

  rowsFrom(database, sql, params = []) {
    const stmt = database.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  rows(sql, params = []) {
    return this.rowsFrom(this.db, sql, params);
  }

  row(sql, params = []) {
    return this.rows(sql, params)[0] || null;
  }

  getSetting(key) {
    const row = this.row("SELECT value FROM settings WHERE key = ?", [key]);
    return row?.value || null;
  }

  setSetting(key, value) {
    this.db.run(
      "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );
  }

  async flush() {
    await this.storage.write("data/data.sql", this.db.export());
  }

  listCategories() {
    return this.rows("SELECT id, name, sort_order FROM categories ORDER BY sort_order, id");
  }

  async addCategory(name = "新分類") {
    const stamp = nowIso();
    const maxRow = this.row("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM categories");
    this.db.run("INSERT INTO categories(name, sort_order, created_at, updated_at) VALUES(?, ?, ?, ?)", [
      name,
      maxRow.next_sort,
      stamp,
      stamp,
    ]);
    await this.flush();
    return this.row("SELECT last_insert_rowid() AS id").id;
  }

  async updateCategory(id, name) {
    this.db.run("UPDATE categories SET name = ?, updated_at = ? WHERE id = ?", [name, nowIso(), id]);
    await this.flush();
  }

  async reorderCategory(ids) {
    ids.forEach((id, index) => {
      this.db.run("UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?", [index, nowIso(), id]);
    });
    await this.flush();
  }

  async deleteCategory(id) {
    this.db.run("UPDATE notes SET category_id = NULL, updated_at = ? WHERE category_id = ?", [nowIso(), id]);
    this.db.run("DELETE FROM categories WHERE id = ?", [id]);
    await this.flush();
  }

  listNotes(categoryId, search = "") {
    const q = `%${search.trim()}%`;
    if (categoryId === null || typeof categoryId === "undefined") {
      return this.rows(
        `SELECT n.id, n.title, n.content, n.updated_at, n.category_id,
         (SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id) AS attachment_count
         FROM notes n
         WHERE (n.title LIKE ? OR n.content LIKE ?)
         ORDER BY datetime(n.updated_at) DESC`,
        [q, q]
      );
    }
    if (Number(categoryId) === 0) {
      return this.rows(
        `SELECT n.id, n.title, n.content, n.updated_at, n.category_id,
         (SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id) AS attachment_count
         FROM notes n
         WHERE n.category_id IS NULL
         AND (n.title LIKE ? OR n.content LIKE ?)
         ORDER BY datetime(n.updated_at) DESC`,
        [q, q]
      );
    }
    return this.rows(
      `SELECT n.id, n.title, n.content, n.updated_at, n.category_id,
       (SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id) AS attachment_count
       FROM notes n
       WHERE n.category_id = ?
       AND (n.title LIKE ? OR n.content LIKE ?)
       ORDER BY datetime(n.updated_at) DESC`,
      [Number(categoryId), q, q]
    );
  }

  getNote(id) {
    const note = this.row("SELECT * FROM notes WHERE id = ?", [id]);
    if (!note) return null;
    const attachments = this.rows("SELECT * FROM attachments WHERE note_id = ? ORDER BY id DESC", [id]);
    return { ...note, attachments };
  }

  async upsertNote(payload) {
    const stamp = nowIso();
    const categoryId = payload.category_id ? Number(payload.category_id) : null;
    if (payload.id) {
      this.db.run(
        "UPDATE notes SET category_id = ?, title = ?, content = ?, updated_at = ? WHERE id = ?",
        [categoryId, payload.title, payload.content, stamp, payload.id]
      );
      await this.flush();
      return payload.id;
    }

    this.db.run(
      "INSERT INTO notes(category_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [categoryId, payload.title, payload.content, stamp, stamp]
    );
    await this.flush();
    return this.row("SELECT last_insert_rowid() AS id").id;
  }

  async removeNote(id) {
    const attachments = this.rows("SELECT path FROM attachments WHERE note_id = ?", [id]);
    for (const item of attachments) {
      await this.storage.remove(item.path);
    }
    this.db.run("DELETE FROM attachments WHERE note_id = ?", [id]);
    this.db.run("DELETE FROM notes WHERE id = ?", [id]);
    await this.flush();
  }

  async pickAttachmentPath(filename) {
    const files = await this.storage.list("data/files/");
    const folderIndex = Math.floor(files.length / 100);
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `data/files/${folderIndex}/${uid()}_${safe}`;
  }

  async addAttachments(noteId, fileList) {
    for (const file of fileList) {
      const path = await this.pickAttachmentPath(file.name);
      await this.storage.write(path, new Uint8Array(await file.arrayBuffer()));
      this.db.run(
        "INSERT INTO attachments(note_id, name, mime, path, size, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [noteId, file.name, file.type || "application/octet-stream", path, file.size, nowIso()]
      );
    }
    await this.flush();
  }

  async deleteAttachment(id) {
    const row = this.row("SELECT path FROM attachments WHERE id = ?", [id]);
    if (row) await this.storage.remove(row.path);
    this.db.run("DELETE FROM attachments WHERE id = ?", [id]);
    await this.flush();
  }

  async getAttachmentBlob(att) {
    const bytes = await this.storage.read(att.path);
    if (!bytes) return null;
    return new Blob([bytes], { type: att.mime });
  }

  async exportZip(mode = "split") {
    const zip = new JSZip();
    zip.file("data/data.sql", this.db.export());

    const attRows = this.rows("SELECT path FROM attachments");
    for (const { path } of attRows) {
      const bytes = await this.storage.read(path);
      if (bytes) zip.file(path, bytes);
    }

    if (mode === "split") {
      for (const path of APP_FILES) {
        const res = await fetch(new URL(path, window.location.href));
        zip.file(path, await res.text());
      }
    }

    if (mode === "render") {
      const all = this.rows(
        `SELECT n.id, n.title, n.content, n.updated_at, COALESCE(c.name, '未分類') AS category_name
         FROM notes n LEFT JOIN categories c ON c.id = n.category_id
         ORDER BY datetime(n.updated_at) DESC`
      );
      const name = escapeHtml(this.getSetting("notebook_name") || "記事本");
      const indexHtml = `<!doctype html><html><head><meta charset="UTF-8"><title>${name}</title><style>body{font-family:sans-serif;padding:20px}a{display:block;margin:8px 0}</style></head><body><h1>${name}</h1>${all
        .map((n) => `<a href="./data/${n.id}.html">${escapeHtml(n.title || "(無標題)")} - ${escapeHtml(n.category_name)}</a>`)
        .join("")}</body></html>`;
      zip.file("index.html", indexHtml);
      for (const n of all) {
        zip.file(
          `data/${n.id}.html`,
          `<!doctype html><html><head><meta charset="UTF-8"><title>${escapeHtml(
            n.title
          )}</title><style>body{font-family:sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.6}pre{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(
            n.title || "(無標題)"
          )}</h1><div>分類：${escapeHtml(n.category_name)}</div><div>更新：${escapeHtml(
            n.updated_at
          )}</div><hr/><pre>${escapeHtml(n.content || "")}</pre></body></html>`
        );
      }
    }

    return zip.generateAsync({ type: "blob" });
  }

  async importZip(file, strategy = "merge") {
    const zip = await JSZip.loadAsync(file);
    const sqlFile = zip.file("data/data.sql");
    if (!sqlFile) throw new Error("Zip 缺少 data/data.sql");

    const importedBytes = new Uint8Array(await sqlFile.async("arraybuffer"));
    const importedDb = new this.SQL.Database(importedBytes);

    if (strategy === "replace") {
      const oldFiles = await this.storage.list("data/files/");
      for (const f of oldFiles) await this.storage.remove(f);

      const zipFiles = Object.values(zip.files).filter((f) => !f.dir && f.name.startsWith("data/files/"));
      for (const f of zipFiles) {
        await this.storage.write(f.name, new Uint8Array(await f.async("arraybuffer")));
      }

      this.db = importedDb;
      await this.flush();
      return;
    }

    const categoryMap = new Map();
    const importedCats = this.rowsFrom(importedDb, "SELECT id, name FROM categories ORDER BY sort_order, id");
    for (const c of importedCats) {
      const existed = this.row("SELECT id FROM categories WHERE name = ?", [c.name]);
      if (existed) {
        categoryMap.set(Number(c.id), Number(existed.id));
      } else {
        const id = await this.addCategory(c.name);
        categoryMap.set(Number(c.id), Number(id));
      }
    }

    const noteMap = new Map();
    const notes = this.rowsFrom(importedDb, "SELECT * FROM notes ORDER BY id");
    for (const note of notes) {
      const importedCategoryId = note.category_id === null || typeof note.category_id === "undefined" ? null : Number(note.category_id);
      const mappedCategory = importedCategoryId ? categoryMap.get(importedCategoryId) || null : null;
      const newId = await this.upsertNote({
        category_id: mappedCategory,
        title: note.title,
        content: note.content,
      });
      noteMap.set(Number(note.id), Number(newId));
    }

    const atts = this.rowsFrom(importedDb, "SELECT * FROM attachments ORDER BY id");
    for (const att of atts) {
      const zipAtt = zip.file(att.path);
      if (!zipAtt) continue;
      const newPath = await this.pickAttachmentPath(att.name);
      await this.storage.write(newPath, new Uint8Array(await zipAtt.async("arraybuffer")));
      this.db.run(
        "INSERT INTO attachments(note_id, name, mime, path, size, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [noteMap.get(Number(att.note_id)), att.name, att.mime, newPath, att.size || 0, nowIso()]
      );
    }

    await this.flush();
  }
}

const store = reactive({
  ready: false,
  notebookName: "記事本",
  categories: [],
  currentCategoryId: null,
  notes: [],
  selectedNote: null,
  search: "",
  theme: "classic",
  mobileEditor: false,
  previewUrl: "",
  previewMime: "",
  statusText: "",
  importMode: "merge",
  exportMode: "split",
  localFs: Boolean(window.showDirectoryPicker),
});

const service = new DataService();

function applyTheme(themeKey) {
  const theme = THEME_MAP[themeKey] || THEME_MAP.classic;
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--line", theme.line);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--accent", theme.accent);
}

async function refreshCategories() {
  store.categories = service.listCategories();
  if (store.currentCategoryId === null || Number(store.currentCategoryId) === 0) return;
  if (!store.categories.find((c) => Number(c.id) === Number(store.currentCategoryId))) {
    store.currentCategoryId = null;
  }
}

async function refreshNotes() {
  store.notes = service.listNotes(store.currentCategoryId, store.search);
}

async function boot() {
  await service.init();
  store.notebookName = service.getSetting("notebook_name") || "記事本";
  store.theme = service.getSetting("theme") || "classic";
  applyTheme(store.theme);
  await refreshCategories();
  await refreshNotes();
  store.ready = true;
}

watch(
  () => [store.search, store.currentCategoryId],
  async () => {
    if (!store.ready) return;
    await refreshNotes();
  }
);

const MainView = {
  setup() {
    const router = useRouter();
    const editing = ref({ id: 0, title: "", content: "", category_id: 0, attachments: [] });
    const touchState = ref({ x: 0, y: 0 });
    const uploading = ref(false);
    const uploadProgress = ref(0);

    const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : 1024);
    const categoryName = computed(() => {
      if (store.currentCategoryId === null || typeof store.currentCategoryId === "undefined") return "所有分類";
      if (Number(store.currentCategoryId) === 0) return "未分類";
      const found = store.categories.find((c) => Number(c.id) === Number(store.currentCategoryId));
      return found ? found.name : "未分類";
    });
    const clearPreview = () => {
      if (store.previewUrl) URL.revokeObjectURL(store.previewUrl);
      store.previewUrl = "";
      store.previewMime = "";
    };

    const openNote = (id) => {
      const found = service.getNote(id);
      if (!found) return;
      editing.value = { ...found, category_id: found.category_id ?? 0, attachments: found.attachments || [] };
      store.selectedNote = found.id;
      if (windowWidth.value <= 900) store.mobileEditor = true;
      clearPreview();
    };

    const addNew = () => {
      editing.value = { id: 0, title: "", content: "", category_id: 0, attachments: [] };
      store.selectedNote = 0;
      clearPreview();
      if (windowWidth.value <= 900) store.mobileEditor = true;
    };

    const save = async () => {
      const id = await service.upsertNote({
        id: editing.value.id,
        title: editing.value.title || "未命名記事",
        content: editing.value.content || "",
        category_id: editing.value.category_id,
      });
      editing.value.id = id;
      store.selectedNote = id;
      const refreshed = service.getNote(id);
      if (refreshed) {
        editing.value.attachments = refreshed.attachments || [];
      } else {
        editing.value.attachments = editing.value.attachments || [];
      }
      await refreshNotes();
      store.statusText = "已儲存";
      if (windowWidth.value <= 900) store.mobileEditor = false;
      setTimeout(() => {
        if (store.statusText === "已儲存") store.statusText = "";
      }, 1200);
    };

    const remove = async () => {
      if (!editing.value.id) return;
      await service.removeNote(editing.value.id);
      editing.value = { id: 0, title: "", content: "", category_id: 0, attachments: [] };
      store.selectedNote = null;
      clearPreview();
      await refreshNotes();
    };
    const onFiles = async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      if (!editing.value.id) {
        editing.value.id = await service.upsertNote({
          id: 0,
          title: editing.value.title || "未命名記事",
          content: editing.value.content || "",
          category_id: editing.value.category_id,
        });
        store.selectedNote = editing.value.id;
      }
      uploading.value = true;
      uploadProgress.value = 0;
      const total = files.length;
      for (let i = 0; i < files.length; i += 1) {
        await service.addAttachments(editing.value.id, [files[i]]);
        uploadProgress.value = Math.round(((i + 1) / total) * 100);
      }
      const refreshed = service.getNote(editing.value.id);
      editing.value.attachments = refreshed ? refreshed.attachments : [];
      event.target.value = "";
      await refreshNotes();
      uploading.value = false;
    };
    const preview = async (att) => {
      clearPreview();
      const blob = await service.getAttachmentBlob(att);
      if (!blob) return;
      store.previewUrl = URL.createObjectURL(blob);
      store.previewMime = att.mime;
    };

    const removeAttachment = async (attId) => {
      await service.deleteAttachment(attId);
      editing.value.attachments = service.getNote(editing.value.id).attachments;
      clearPreview();
      await refreshNotes();
    };

    const onTouchStart = (e) => {
      const t = e.changedTouches[0];
      touchState.value = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e, id) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchState.value.x;
      const dy = Math.abs(t.clientY - touchState.value.y);
      if (dx < -45 && dy < 35) openNote(id);
    };

    const handleResize = () => {
      if (typeof window !== "undefined") {
        windowWidth.value = window.innerWidth;
      }
    };

    onMounted(() => {
      if (!store.notes.length) addNew();
      if (typeof window !== "undefined") {
        windowWidth.value = window.innerWidth;
        window.addEventListener("resize", handleResize);
      }
    });

    onUnmounted(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    });

    return {
      store,
      editing,
      categoryName,
      windowWidth,
      openNote,
      addNew,
      save,
      remove,
      onFiles,
      preview,
      removeAttachment,
      onTouchStart,
      onTouchEnd,
      goCategories: () => router.push("/categories"),
    };
  },
  template: `
    <div class="app-body">
      <div class="side-panel mobile-stack" :class="{ active: !store.mobileEditor || windowWidth > 900 }">
        <div class="row-actions align-items-center">
          <button class="btn-outline" @click="goCategories">◁ 所有分類</button>
          <div class="fw-bold">{{ categoryName }}</div>
          <button class="btn-outline ms-auto" @click="addNew">新增</button>
        </div>
        <input v-model="store.search" class=\"form-control mb-2\" placeholder=\"搜尋\" />
        <div class="mb-2 fs-5 fw-bold">記事列表</div>
        <div class="note-list" v-if="store.notes.length">
          <div
            class="note-item"
            v-for="n in store.notes"
            :key="n.id"
            :class="{ active: n.id === store.selectedNote }"
            @click="openNote(n.id)"
            @touchstart="onTouchStart"
            @touchend="(e) => onTouchEnd(e, n.id)"
          >
            <h6>{{ n.title }}</h6>
            <p>{{ (n.content || '').slice(0, 36) || '（空白）' }}</p>
          </div>
        </div>
        <div v-else class="empty-tip">目前沒有記事</div>
      </div>

      <div class="main-panel mobile-stack" :class="{ active: store.mobileEditor || windowWidth > 900 }">
        <div class="row-actions justify-content-end">
          <button class="btn-outline" @click="remove">刪除</button>
          <button class="btn-outline" @click="save">儲存</button>
        </div>

        <div class="editor-panel" v-if="editing">
          <div class="mb-2">
            <label class="form-label">標題</label>
            <input class="form-control" v-model="editing.title" placeholder="輸入標題" />
          </div>
          <div class="mb-2">
            <label class="form-label">分類</label>
            <select class="form-select" v-model.number="editing.category_id">
              <option :value="0">未分類</option>
              <option v-for="c in store.categories" :value="Number(c.id)" :key="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="mb-2">
            <label class="form-label">內容</label>
            <textarea class="form-control" v-model="editing.content" placeholder="輸入記事內容"></textarea>
          </div>
          <div class="mb-2">
            <label class="form-label">附加檔案</label>
            <input class="form-control" type="file" multiple @change="onFiles" />
          </div>
          <div class="progress mt-2" v-if="uploading">\n            <div class="progress-bar" role="progressbar" :style="{ width: uploadProgress + \"%\" }">{{ uploadProgress }}%</div>\n          </div>\n          <div class="attach-list" v-if="editing.attachments && editing.attachments.length">
            <div class="attach-row" v-for="a in editing.attachments" :key="a.id">
              <div>{{ a.name }}</div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" @click="preview(a)">預覽</button>
                <button class="btn btn-sm btn-outline-danger" @click="removeAttachment(a.id)">刪除</button>
              </div>
            </div>
          </div>
          <div class="preview-box" v-if="store.previewUrl">
            <img v-if="store.previewMime.startsWith('image/')" :src="store.previewUrl" alt="preview" />
            <video v-else-if="store.previewMime.startsWith('video/')" :src="store.previewUrl" controls></video>
            <div v-else>此檔案類型不支援預覽</div>
          </div>
        </div>

        <div class="text-success mt-2">{{ store.statusText }}</div>
      </div>
    </div>
  `,
};

const CategoryView = {
  setup() {
    const router = useRouter();
    const pick = async (id) => {
      if (id === null || typeof id === "undefined") {
        store.currentCategoryId = null;
      } else {
        store.currentCategoryId = Number(id);
      }
      await refreshNotes();
      router.push("/");
    };
    return { store, pick, edit: () => router.push("/categories/edit") };
  },
  template: `
    <div class="app-body">
      <div class="side-panel">
        <div class="row-actions"><button class="btn-outline" @click="edit">編輯</button></div>
        <div class="menu-block">\n          <button class="btn-outline menu-btn" @click="pick(null)">所有分類</button>\n          <div class="menu-sep"></div>\n        </div>
        <div class="menu-block">
          <button class="btn-outline menu-btn" v-for="c in store.categories" :key="c.id" @click="pick(c.id)"><span class="menu-icon">▸</span>{{ c.name }}</button>
        </div>
        <div class="empty-tip">點擊進入筆記頁</div>
      </div>
      <div class="main-panel desktop-only"></div>
    </div>
  `,
};

const CategoryEditView = {
  setup() {
    const router = useRouter();
    const selectedId = ref(store.categories[0]?.id || 1);
    const name = ref(store.categories.find((c) => c.id === selectedId.value)?.name || "");

    const pick = (id) => {
      selectedId.value = Number(id);
      name.value = store.categories.find((c) => Number(c.id) === Number(id))?.name || "";
    };

    const add = async () => {
      const id = await service.addCategory();
      await refreshCategories();
      pick(id);
    };

    const save = async () => {
      await service.updateCategory(selectedId.value, name.value || "未命名分類");
      await refreshCategories();
    };

    const remove = async () => {
      await service.deleteCategory(selectedId.value);
      await refreshCategories();
      pick(store.categories[0]?.id || 1);
      await refreshNotes();
    };

    const move = async (id, direction) => {
      const ids = store.categories.map((c) => Number(c.id));
      const index = ids.indexOf(Number(id));
      const target = index + direction;
      if (target < 0 || target >= ids.length) return;
      const temp = ids[index];
      ids[index] = ids[target];
      ids[target] = temp;
      await service.reorderCategory(ids);
      await refreshCategories();
    };

    return { store, selectedId, name, pick, add, save, remove, move, done: () => router.push("/categories") };
  },
  template: `
    <div class="app-body">
      <div class="side-panel">
        <div class="row-actions">
          <button class="btn-outline" @click="done">完成</button>
          <button class="btn-outline" @click="add">新增</button>
        </div>
        <div class="menu-block">
          <div class="btn-outline d-flex justify-content-between align-items-center" v-for="c in store.categories" :key="c.id">
            <button class="btn btn-sm" @click="move(c.id, -1)">↑</button>
            <button class="btn btn-sm flex-grow-1" :class="{ 'fw-bold': Number(c.id)===Number(selectedId) }" @click="pick(c.id)">{{ c.name }}</button>
            <button class="btn btn-sm" @click="move(c.id, 1)">↓</button>
          </div>
        </div>
      </div>
      <div class="main-panel">
        <div class="row-actions justify-content-end">
          <button class="btn-outline" @click="remove" >刪除</button>
          <button class="btn-outline" @click="save">儲存</button>
        </div>
        <div class="editor-panel">
          <label class="form-label">編輯分類名字</label>
          <input class="form-control" v-model="name" />
        </div>
      </div>
    </div>
  `,
};

const SettingsView = {
  setup() {
    const tab = ref("name");
    const notebookName = ref(store.notebookName);
    const importFile = ref(null);

    const saveName = async () => {
      service.setSetting("notebook_name", notebookName.value || "記事本");
      await service.flush();
      store.notebookName = notebookName.value || "記事本";
    };

    const saveTheme = async (theme) => {
      store.theme = theme;
      applyTheme(theme);
      service.setSetting("theme", theme);
      await service.flush();
    };

    const doImport = async () => {
      if (!importFile.value) return;
      await service.importZip(importFile.value, store.importMode);
      await refreshCategories();
      await refreshNotes();
      store.selectedNote = null;
      store.statusText = "已完成匯入";
    };

    const doExport = async () => {
      const blob = await service.exportZip(store.exportMode);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `notebook-${store.exportMode}-${Date.now()}.zip`;

      a.click();
      URL.revokeObjectURL(a.href);
    };

    return {
      store,
      tab,
      notebookName,
      importFile,
      setTab: (k) => (tab.value = k),
      saveName,
      saveTheme,
      doImport,
      doExport,
      pickFile: (e) => {
        importFile.value = e.target.files?.[0] || null;
      },
    };
  },
  template: `
    <div class="app-body">
      <div class="side-panel">
        <div class="menu-block">
          <button class="btn-outline menu-btn" :class="{ active: tab==='name' }" @click="setTab('name')">記事本名稱</button>
          <button class="btn-outline menu-btn" :class="{ active: tab==='import' }" @click="setTab('import')">匯入</button>
          <button class="btn-outline menu-btn" :class="{ active: tab==='export' }" @click="setTab('export')">匯出</button>
          <button class="btn-outline menu-btn" :class="{ active: tab==='theme' }" @click="setTab('theme')">主題</button>
          <button class="btn-outline menu-btn" :class="{ active: tab==='storage' }" @click="setTab('storage')">儲存位置</button>
        </div>
      </div>
      <div class="main-panel">
        <div class="row-actions justify-content-end">
          <button class="btn-outline" @click="saveName" v-if="tab==='name'">儲存</button>
        </div>
        <div class="editor-panel">
          <div v-if="tab==='name'">
            <label class="form-label">記事本名稱</label>
            <input class="form-control" v-model="notebookName" />
          </div>

          <div v-if="tab==='import'">
            <div class="mb-2">選擇 zip 匯入</div>
            <input class="form-control mb-3" type="file" accept=".zip" @change="pickFile" />
            <div class="form-check">
              <input class="form-check-input" type="radio" id="merge" value="merge" v-model="store.importMode" />
              <label class="form-check-label" for="merge">合併</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" id="replace" value="replace" v-model="store.importMode" />
              <label class="form-check-label" for="replace">取代</label>
            </div>
            <button class="btn-outline mt-3" @click="doImport">開始匯入</button>
          </div>

          <div v-if="tab==='export'">
            <div class="form-check">
              <input class="form-check-input" type="radio" id="split" value="split" v-model="store.exportMode" />
              <label class="form-check-label" for="split">資料分離 html</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" id="render" value="render" v-model="store.exportMode" />
              <label class="form-check-label" for="render">資料渲染 html</label>
            </div>
            <button class="btn-outline mt-3" @click="doExport">匯出 zip</button>
          </div>

          <div v-if="tab==='theme'">
            <div class="mb-2">主題顏色預覽</div>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn-outline" @click="saveTheme('classic')">Classic</button>
              <button class="btn-outline" @click="saveTheme('ocean')">Ocean</button>
              <button class="btn-outline" @click="saveTheme('warm')">Warm</button>
            </div>
          </div>

          <div v-if="tab==='storage'">
            <p class="mb-1">目前儲存：OPFS（或瀏覽器 fallback）</p>
            <p class="text-muted mb-0" v-if="!store.localFs">此瀏覽器不支援自選本地路徑，已使用 OPFS。</p>
            <p class="text-muted mb-0" v-else>此版本先以 OPFS 儲存為主，保留本地路徑功能入口。</p>
          </div>
        </div>
      </div>
    </div>
  `,
};

const routes = [
  { path: "/", component: MainView },
  { path: "/categories", component: CategoryView },
  { path: "/categories/edit", component: CategoryEditView },
  { path: "/settings", component: SettingsView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const App = {
  setup() {
    const router = useRouter();
    const toMain = () => router.push("/");
    const toSettings = () => router.push("/settings");
    return { store, toMain, toSettings };
  },
  template: `
    <div class="app-shell" v-if="store.ready">
      <header class="app-header">
        <button class="app-nav-btn" @click="toMain">{{ store.notebookName }}</button>
        <button class="app-nav-btn fs-2" @click="toSettings">設定</button>
      </header>
      <router-view />
    </div>
    <div v-else class="p-4">載入中...</div>
  `,
};

await boot();
createApp(App).use(router).mount("#app");





































