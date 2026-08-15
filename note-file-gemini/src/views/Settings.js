import { ref, onMounted } from 'vue';
import { getSetting, saveSetting } from '../db.js';
import { store } from '../store.js';
import { exportDataSeparated, exportStaticHtml, importData } from '../services/ImportExport.js';

export default {
  template: `
    <div class="d-flex flex-column vh-100 bg-light">
        <!-- Header -->
        <nav class="navbar navbar-light bg-white border-bottom px-3">
            <router-link to="/" class="btn btn-link text-dark p-0 text-decoration-none">
                <span class="fs-5">&lsaquo; 返回</span>
            </router-link>
            <span class="navbar-brand mb-0 h1 mx-auto">設定</span>
            <div style="width: 3rem;"></div>
        </nav>

        <!-- Settings List -->
        <div class="container py-3">
            
            <div class="mb-4">
                <label class="form-label text-muted small">記事本名稱</label>
                <div class="card border-0 shadow-sm">
                    <div class="card-body p-2">
                        <input 
                            v-model="appName" 
                            @change="saveAppName" 
                            class="form-control border-0 shadow-none p-0"
                            placeholder="記事本"
                        >
                    </div>
                </div>
                <div class="form-text">左上角名稱跟著變動</div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
                <div class="list-group list-group-flush">
                    <button @click="cycleTheme" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        主題顏色
                        <span class="text-muted">{{ themeName }} ></span> 
                    </button>
                    <!-- Storage info (readonly for now) -->
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        儲存位置
                        <span class="text-muted">OPFS</span>
                    </div>
                </div>
            </div>

             <div class="card border-0 shadow-sm mb-3">
                <div class="list-group list-group-flush">
                     <button @click="triggerImport" class="list-group-item list-group-item-action text-primary">
                        匯入資料
                    </button>
                    <button @click="exportSeparated" class="list-group-item list-group-item-action text-primary">
                        匯出資料 (分離HTML)
                    </button>
                    <button @click="exportStatic" class="list-group-item list-group-item-action text-primary">
                        匯出資料 (靜態HTML)
                    </button>
                </div>
            </div>
            
            <input type="file" ref="fileInput" @change="handleFileChange" accept=".sql" style="display: none;">

            <div class="text-center text-muted small mt-4">
                Version 1.0.0
            </div>

        </div>
    </div>
    `,
  setup() {
    const appName = ref(store.appName);
    const fileInput = ref(null);

    const themeName = ref('預設'); // Just a label, store.theme has the value

    onMounted(async () => {
      // Sync local state
      appName.value = store.appName;
      updateThemeLabel();
    });

    const saveAppName = async () => {
      store.appName = appName.value;
      await saveSetting('app_name', appName.value);
    };

    const updateThemeLabel = () => {
      const map = { 'default': '預設', 'dark': '暗色', 'warm': '暖色' };
      themeName.value = map[store.theme] || '預設';
    };

    const cycleTheme = async () => {
      const themes = ['default', 'dark', 'warm'];
      const currentIndex = themes.indexOf(store.theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];

      store.theme = nextTheme;
      await saveSetting('theme', nextTheme);
      updateThemeLabel();
    };

    // Import/Export
    const triggerImport = () => {
      fileInput.value.click();
    };

    const handleFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Ask mode
      const mode = confirm("點擊「確定」會清除現有資料並匯入（取代），點擊「取消」則嘗試合併（可能會有衝突）。") ? 'replace' : 'merge'; // Basic prompt

      try {
        await importData(file, mode);
        alert('匯入成功！請重新整理頁面。');
        location.reload();
      } catch (e) {
        alert('匯入失敗: ' + e.message);
      }

      // Reset input
      event.target.value = '';
    };

    const exportSeparated = async () => {
      try {
        await exportDataSeparated();
      } catch (e) {
        console.error(e);
        alert('匯出失敗');
      }
    };

    const exportStatic = async () => {
      try {
        await exportStaticHtml();
      } catch (e) {
        console.error(e);
        alert('匯出失敗');
      }
    };


    return {
      appName,
      saveAppName,
      themeName,
      cycleTheme,
      triggerImport,
      handleFileChange,
      exportSeparated,
      exportStatic,
      fileInput
    };
  }
}
