const { ref, onMounted, computed } = Vue;
const { useRouter } = VueRouter;
import { useStore } from '../store.js';
import { exportSQLiteFile, importSQLiteFile, clearAllData as clearDB } from '../db.js';

export default {
    name: 'Settings',
    setup() {
        const router = useRouter();
        const store = useStore();
        const notebookName = ref(store.notebookName);
        const selectedTheme = ref(localStorage.getItem('theme') || 'light');
        const importMode = ref('replace');
        const exporting = ref(false);

        const saveNotebookName = () => {
            if (!notebookName.value.trim()) {
                alert('記事本名稱不能為空');
                return;
            }

            try {
                store.setNotebookName(notebookName.value);
                alert('✅ 記事本名稱已更新');
                console.log('Notebook name changed:', notebookName.value);
            } catch (e) {
                console.error('Failed to save notebook name:', e);
                alert('更新失敗');
            }
        };

        const changeTheme = (theme) => {
            try {
                selectedTheme.value = theme;
                store.setTheme(theme);
                console.log('Theme changed:', theme);
            } catch (e) {
                console.error('Failed to change theme:', e);
                alert('切換主題失敗');
            }
        };

        const themes = [
            { name: 'light', label: '亮色', emoji: '☀️', color: '#ffffff' },
            { name: 'dark', label: '深色', emoji: '🌙', color: '#1e1e1e' },
            { name: 'blue', label: '藍色', emoji: '🔵', color: '#2196F3' },
            { name: 'purple', label: '紫色', emoji: '🟣', color: '#9c27b0' }
        ];

        const exportSQLite = async () => {
            exporting.value = true;
            try {
                await exportSQLiteFile();
                console.log('✅ SQLite file exported successfully');
                alert('✅ SQLite 檔案匯出成功');
            } catch (e) {
                console.error('Export SQLite failed:', e);
                alert('❌ 匯出 SQLite 失敗：' + e.message);
            } finally {
                exporting.value = false;
            }
        };

        const importSQLite = async () => {
            exporting.value = true;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) {
                        exporting.value = false;
                        return;
                    }

                    const confirm_import = confirm('⚠️ 匯入會' + (importMode.value === 'replace' ? '取代現有' : '合併') + '所有資料，是否繼續？');
                    if (!confirm_import) {
                        exporting.value = false;
                        return;
                    }

                    // Read file as ArrayBuffer
                    const arrayBuffer = await file.arrayBuffer();
                    await importSQLiteFile(arrayBuffer, importMode.value === 'merge');
                    console.log(`✅ ZIP file imported successfully (${importMode.value === 'merge' ? '合併' : '取代'})`);
                    alert(`✅ 匯入成功 (${importMode.value === 'merge' ? '合併' : '取代'})`);
                    // Reload immediately to reflect imported data
                    location.reload();
                } catch (err) {
                    console.error('Import failed:', err);
                    alert('❌ 匯入失敗：' + err.message);
                } finally {
                    exporting.value = false;
                }
            };
            input.click();
        };

        const goBack = () => {
            router.push('/');
        };

        const clearAllData = async () => {
            if (!confirm('⚠️ 確認要清空所有記事？此操作無法復原')) {
                return;
            }
            if (!confirm('最後確認：將永久刪除所有記事，是否繼續？')) {
                return;
            }

            try {
                localStorage.clear();
                indexedDB.deleteDatabase('notes');
                // Also clear OPFS-backed database via db helper
                try {
                    const ok = await clearDB();
                    console.log('clearDB helper returned:', ok);
                } catch (err) {
                    console.warn('clearDB helper failed:', err);
                }

                alert('✅ 所有數據已清除，將重新加載應用...');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } catch (e) {
                console.error('Clear data failed:', e);
                alert('❌ 清除失敗');
            }
        };

        return {
            notebookName,
            selectedTheme,
            importMode,
            themes,
            exporting,
            saveNotebookName,
            changeTheme,
            exportSQLite,
            importSQLite,
            clearAllData,
            goBack
        };
    },
    template: `
        <div class="container-fluid" style="padding: 16px; height: calc(100vh - 80px); display: flex; flex-direction: column;">
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                <button class="btn btn-sm btn-outline-secondary" @click="goBack">
                    ← 返回
                </button>
            </div>

            <div style="flex: 1; overflow-y: auto;">
                <!-- Notebook Name -->
                <div class="settings-group">
                    <h5>📝 記事本名稱</h5>
                    <p style="font-size: 12px; color: #999; margin-bottom: 12px;">
                        修改記事本的名稱，會顯示在應用左上角
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <input 
                            v-model="notebookName" 
                            type="text" 
                            class="form-control form-control-sm" 
                            placeholder="輸入記事本名稱"
                            maxlength="30"
                        >
                        <button class="btn btn-sm btn-primary" @click="saveNotebookName">
                            儲存
                        </button>
                    </div>
                    <small style="display: block; margin-top: 8px; color: #666;">
                        當前名稱：{{ notebookName }}
                    </small>
                </div>

                <!-- Theme -->
                <div class="settings-group">
                    <h5>🎨 主題色彩</h5>
                    <p style="font-size: 12px; color: #999; margin-bottom: 12px;">
                        選擇您喜歡的應用主題色彩
                    </p>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <div 
                            v-for="theme in themes" 
                            :key="theme.name"
                            class="theme-option"
                            :class="{ active: selectedTheme === theme.name }"
                            @click="changeTheme(theme.name)"
                            :style="{ backgroundColor: theme.color, cursor: 'pointer' }"
                            :title="theme.label"
                            style="width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 3px solid transparent; transition: all 0.3s;"
                        >
                            {{ theme.emoji }}
                        </div>
                    </div>
                </div>

                <!-- Import/Export -->
                <div class="settings-group">
                    <h5>📥📤 匯入/匯出</h5>
                    
                    <div class="settings-item">
                        <label style="font-weight: 500; margin-bottom: 8px; display: block;">📦 匯出為 ZIP 檔案</label>
                        <p style="font-size: 12px; color: #999; margin-bottom: 8px;">
                            將整個資料庫和附加檔案匯出為 ZIP 檔案，包含 database.db 和所有附件
                        </p>
                        <button class="btn btn-sm btn-outline-primary" @click="exportSQLite" :disabled="exporting">
                            {{ exporting ? '匯出中...' : '📥 匯出 ZIP' }}
                        </button>
                    </div>

                    <div class="settings-item" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                        <label style="font-weight: 500; margin-bottom: 8px; display: block;">� 匯入 ZIP 檔案</label>
                        <p style="font-size: 12px; color: #999; margin-bottom: 8px;">
                            從之前匯出的 ZIP 檔案匯入記事、分類和附加檔案
                        </p>
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 14px; margin-right: 20px; cursor: pointer;">
                                <input type="radio" v-model="importMode" value="replace" style="cursor: pointer;"> 
                                <span>取代現有資料</span>
                            </label>
                            <label style="font-size: 14px; cursor: pointer;">
                                <input type="radio" v-model="importMode" value="merge" style="cursor: pointer;"> 
                                <span>合併到現有資料</span>
                            </label>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" @click="importSQLite" :disabled="exporting">
                            {{ exporting ? '匯入中...' : '📤 匯入 ZIP' }}
                        </button>
                        <div style="font-size: 12px; color: #f44336; margin-top: 8px; padding: 8px; background: #ffebee; border-radius: 4px;">
                            ⚠️ 取代模式將清空現有所有資料！
                        </div>
                    </div>
                </div>

                <!-- Storage Info -->
                <div class="settings-group">
                    <h5>💾 儲存位置</h5>
                    <p style="font-size: 14px; margin-bottom: 8px;">
                        ✅ 使用本機儲存空間 (OPFS)
                    </p>
                    <div style="background: #e3f2fd; padding: 12px; border-radius: 4px; font-size: 13px;">
                        <p style="margin: 0 0 8px 0;">
                            <strong>📍 儲存方式：</strong>
                        </p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>所有資料儲存在您的瀏覽器本地</li>
                            <li>不會上傳到任何伺服器</li>
                            <li>清空瀏覽器快取時可能會丟失</li>
                            <li>建議定期匯出備份</li>
                        </ul>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="settings-group" style="background: #ffebee; border-left: 4px solid #f44336;">
                    <h5 style="color: #c62828;">⚠️ 危險操作</h5>
                    <p style="font-size: 12px; color: #666; margin-bottom: 12px;">
                        下列操作將無法復原，請謹慎使用
                    </p>
                    <button class="btn btn-sm btn-danger" @click="clearAllData">
                        🗑️ 清空所有資料
                    </button>
                </div>

                <!-- About -->
                <div class="settings-group" style="background: #f5f5f5;">
                    <h5>ℹ️ 關於應用</h5>
                    <p style="font-size: 13px; margin: 0;">
                        <strong>記事本應用</strong> v1.0.0<br>
                        <small style="color: #999;">
                            一個簡單而強大的記事本應用<br>
                            支持本地存儲、分類管理、主題切換<br>
                            基於 Vue 3 + SQLite + OPFS
                        </small>
                    </p>
                </div>
            </div>
        </div>
    `
};
