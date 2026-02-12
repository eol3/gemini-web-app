const { ref, onMounted, computed } = Vue;
const { useRouter, useRoute } = VueRouter;
import { getAllCategories, getNoteById, createNote, updateNote, deleteNote, addAttachment, getAttachments, deleteAttachment, getAttachmentUrl } from '../db.js';

export default {
    name: 'NoteEditor',
    setup() {
        const router = useRouter();
        const route = useRoute();
        const noteId = ref(route.params.id ? parseInt(route.params.id) : null);
        const title = ref('');
        const content = ref('');
        const categoryId = ref(0);
        const categories = ref([]);
        const isNew = ref(!noteId.value);
        const saving = ref(false);
        const attachments = ref([]);
        const uploading = ref(false);
        const previewAttachment = ref(null);

        onMounted(async () => {
            loadCategories();
            if (noteId.value) {
                loadNote();
            }
        });

        const loadNote = () => {
            try {
                const note = getNoteById(noteId.value);
                if (note) {
                    title.value = note.title || '';
                    content.value = note.content || '';
                    categoryId.value = note.category_id || 0;
                    isNew.value = false;
                    // Load attachments
                    attachments.value = getAttachments(noteId.value);
                    console.log('✅ Note loaded:', note.title);
                } else {
                    alert('記事未找到');
                    router.push('/');
                }
            } catch (e) {
                console.error('Load note failed:', e);
                alert('加載記事失敗');
                router.push('/');
            }
        };

        const loadCategories = () => {
            try {
                categories.value = getAllCategories();
                console.log(`✅ Loaded ${categories.value.length} categories`);
            } catch (e) {
                console.error('Load categories failed:', e);
            }
        };

        const uploadAttachment = async () => {
            if (isNew.value) {
                alert('請先儲存記事，然後才能添加附件');
                return;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                uploading.value = true;
                try {
                    await addAttachment(noteId.value, file);
                    attachments.value = getAttachments(noteId.value);
                    console.log('✅ Attachment uploaded:', file.name);
                } catch (err) {
                    console.error('Upload failed:', err);
                    alert('上傳失敗：' + err.message);
                } finally {
                    uploading.value = false;
                }
            };
            input.click();
        };

        const removeAttachment = async (attachmentId) => {
            if (!confirm('確認要刪除此附件嗎？')) {
                return;
            }

            try {
                await deleteAttachment(attachmentId);
                attachments.value = getAttachments(noteId.value);
                console.log('✅ Attachment deleted');
            } catch (err) {
                console.error('Delete failed:', err);
                alert('刪除失敗');
            }
        };

        const getFileIcon = (fileType) => {
            if (fileType.startsWith('image/')) return '🖼️';
            if (fileType.startsWith('video/')) return '🎥';
            if (fileType.startsWith('audio/')) return '🎵';
            if (fileType.includes('pdf')) return '📄';
            return '📎';
        };

        const showPreview = (attachment) => {
            previewAttachment.value = attachment;
        };

        const closePreview = () => {
            previewAttachment.value = null;
        };

        const getPreviewUrl = (attachment) => {
            if (attachment && attachment.file_data) {
                const blob = new Blob([new Uint8Array(attachment.file_data)], { type: attachment.file_type });
                return URL.createObjectURL(blob);
            }
            return null;
        };

        const saveNote = async () => {
            if (!title.value.trim()) {
                alert('請輸入記事標題');
                return;
            }

            saving.value = true;
            try {
                if (isNew.value) {
                    const id = await createNote(title.value, content.value, categoryId.value);
                    console.log('✅ Note created with id:', id);
                    alert('記事已建立');
                } else {
                    await updateNote(noteId.value, title.value, content.value, categoryId.value);
                    console.log('✅ Note updated:', noteId.value);
                    alert('記事已儲存');
                }
                setTimeout(() => {
                    router.push('/');
                }, 300);
            } catch (e) {
                console.error('Save failed:', e);
                saving.value = false;
                alert('儲存失敗：' + e.message);
            }
        };

        const deleteCurrentNote = async () => {
            if (!confirm('確認要刪除此記事嗎？此操作無法復原。')) {
                return;
            }

            try {
                await deleteNote(noteId.value);
                console.log('✅ Note deleted:', noteId.value);
                alert('記事已刪除');
                router.push('/');
            } catch (e) {
                console.error('Delete failed:', e);
                alert('刪除失敗');
            }
        };

        const goBack = () => {
            if (title.value.trim() || content.value.trim()) {
                if (!confirm('有未儲存的變更，確定要放棄嗎？')) {
                    return;
                }
            }
            router.push('/');
        };

        return {
            title,
            content,
            categoryId,
            categories,
            isNew,
            saving,
            attachments,
            uploading,
            previewAttachment,
            saveNote,
            deleteCurrentNote,
            goBack,
            uploadAttachment,
            removeAttachment,
            getFileIcon,
            showPreview,
            closePreview,
            getPreviewUrl
        };
    },
    template: `
        <div class="editor-container">
            <div class="editor-header">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn btn-sm btn-outline-secondary" @click="goBack" :disabled="saving">
                        ← 返回
                    </button>
                    <input 
                        v-model="title" 
                        type="text" 
                        class="form-control form-control-sm" 
                        placeholder="輸入記事標題..."
                        style="flex: 1; margin-right: 8px;"
                        :disabled="saving"
                    >
                    <select v-model.number="categoryId" class="form-select form-select-sm" style="max-width: 150px;" :disabled="saving">
                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                            {{ cat.name }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="editor-content">
                <textarea 
                    v-model="content" 
                    class="editor-textarea"
                    placeholder="在此輸入記事內容..."
                    :disabled="saving"
                ></textarea>
                
                <!-- Attachments section -->
                <div style="border-top: 1px solid #ddd; margin-top: 12px; padding-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="font-weight: 500; margin: 0;">📎 附件 ({{ attachments.length }})</label>
                        <button 
                            v-if="!isNew"
                            class="btn btn-sm btn-outline-primary" 
                            @click="uploadAttachment"
                            :disabled="uploading || saving"
                        >
                            {{ uploading ? '上傳中...' : '➕ 添加附件' }}
                        </button>
                    </div>
                    
                    <div v-if="attachments.length === 0" style="font-size: 13px; color: #999;">
                        還沒有附件
                    </div>
                    
                    <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
                        <div 
                            v-for="att in attachments" 
                            :key="att.id"
                            @click="showPreview(att)"
                            style="
                                border: 1px solid #ddd; 
                                border-radius: 6px; 
                                padding: 8px; 
                                font-size: 12px;
                                background: #f9f9f9;
                                cursor: pointer;
                                transition: all 0.2s;
                            "
                            @mouseenter="$event.target.parentElement.style.backgroundColor = '#e8e8e8'; $event.target.parentElement.style.borderColor = '#999';"
                            @mouseleave="$event.target.parentElement.style.backgroundColor = '#f9f9f9'; $event.target.parentElement.style.borderColor = '#ddd';"
                        >
                            <div style="margin-bottom: 6px;">{{ getFileIcon(att.file_type) }} {{ att.filename.substring(0, 20) }}</div>
                            <div style="color: #666; font-size: 11px; margin-bottom: 6px;">{{ (att.file_size / 1024).toFixed(1) }} KB</div>
                            <button 
                                class="btn btn-xs btn-outline-danger" 
                                style="padding: 2px 6px; font-size: 11px;"
                                @click.stop="removeAttachment(att.id)"
                                :disabled="saving"
                            >
                                🗑️ 刪除
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Preview Modal -->
                <div v-if="previewAttachment" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                " @click="closePreview">
                    <div style="
                        background: white;
                        border-radius: 8px;
                        max-width: 90vh;
                        max-height: 80vh;
                        overflow: auto;
                        padding: 20px;
                        position: relative;
                    " @click.stop>
                        <button 
                            @click="closePreview"
                            style="
                                position: absolute;
                                top: 12px;
                                right: 12px;
                                background: none;
                                border: none;
                                font-size: 24px;
                                cursor: pointer;
                            "
                        >
                            ✕
                        </button>
                        
                        <div style="text-align: center;">
                            <img 
                                v-if="previewAttachment.file_type.startsWith('image/')"
                                :src="getPreviewUrl(previewAttachment)"
                                style="max-width: 100%; max-height: 70vh; border-radius: 4px;"
                            />
                            <video 
                                v-else-if="previewAttachment.file_type.startsWith('video/')"
                                :src="getPreviewUrl(previewAttachment)"
                                controls
                                style="max-width: 100%; max-height: 70vh; border-radius: 4px;"
                            ></video>
                            <audio 
                                v-else-if="previewAttachment.file_type.startsWith('audio/')"
                                :src="getPreviewUrl(previewAttachment)"
                                controls
                                style="width: 100%; margin-bottom: 12px;"
                            ></audio>
                            <div v-else style="padding: 20px; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 12px;">{{ getFileIcon(previewAttachment.file_type) }}</div>
                                <div style="font-weight: 500;">{{ previewAttachment.filename }}</div>
                                <div style="font-size: 12px; color: #666; margin-top: 8px;">{{ (previewAttachment.file_size / 1024).toFixed(1) }} KB</div>
                                <a 
                                    :href="getPreviewUrl(previewAttachment)"
                                    :download="previewAttachment.filename"
                                    class="btn btn-sm btn-primary"
                                    style="margin-top: 12px;"
                                >
                                    📥 下載
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            <div class="editor-footer">
                <button class="btn btn-sm btn-success" @click="saveNote" :disabled="saving">
                    {{ saving ? '儲存中...' : '💾 儲存' }}
                </button>
                <button v-if="!isNew" class="btn btn-sm btn-danger" @click="deleteCurrentNote" :disabled="saving">
                    🗑️ 刪除
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="goBack" :disabled="saving">
                    ✕ 關閉
                </button>
            </div>
        </div>
    `
};
