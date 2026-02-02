const DataManagement = {
  data() {
    return {
      activeTab: 'import', // 'import' or 'export'
      importMode: 'merge', // 'merge' or 'replace'
      exportMode: 'data'   // 'data' or 'zip'
    }
  },
  methods: {
    setTab(tab) {
      this.activeTab = tab
    },
    goBack() {
      this.$router.push('/')
    },
    triggerImport() {
      this.$refs.fileInput.click()
    },
    handleFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const importedNotes = JSON.parse(event.target.result)
          if (!Array.isArray(importedNotes)) {
            alert('無效的檔案格式')
            return
          }
          this.processImport(importedNotes)
        } catch (error) {
          alert('檔案讀取失敗，請確認格式正確')
        }
        // Reset input
        e.target.value = ''
      }
      reader.readAsText(file) // Use readAsText to avoid UTF-8 issues if possible, though strict JSON usually fine.
    },
    processImport(importedNotes) {
      const saved = localStorage.getItem('notes')
      let currentNotes = saved ? JSON.parse(saved) : []

      if (this.importMode === 'replace') {
        if (confirm('確定要替換所有記事嗎？原本的資料將會消失。')) {
          currentNotes = importedNotes
          localStorage.setItem('notes', JSON.stringify(currentNotes))
          alert('匯入成功！已替換所有記事。')
        }
      } else {
        // Merge
        let addedCount = 0
        importedNotes.forEach(note => {
          if (!currentNotes.find(n => n.id === note.id)) {
            currentNotes.push(note)
            addedCount++
          }
        })
        localStorage.setItem('notes', JSON.stringify(currentNotes))
        alert(`匯入成功！已合併 ${addedCount} 則新記事。`)
      }
    },
    handleExport() {
      const saved = localStorage.getItem('notes')
      if (!saved || JSON.parse(saved).length === 0) {
        alert('沒有可匯出的記事')
        return
      }

      const notes = JSON.parse(saved)
      if (this.exportMode === 'data') {
        this.exportJSON(saved)
      } else {
        this.exportZIP(notes)
      }
    },
    exportJSON(dataStr) {
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `notes_backup_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    },
    async exportZIP(notes) {
      const zip = new JSZip()

      // List of files to include in the ZIP
      // These are fetched dynamically from the running server
      const filesToFetch = [
        'index.html',
        'src/main.js',
        'src/router.js',
        'src/styles.css',
        'src/views/Home.js',
        'src/views/About.js',
        'src/views/NoteDetail.js',
        'src/views/NoteEditor.js',
        'src/views/DataManagement.js'
      ]

      try {
        // Fetch and add source files
        for (const filePath of filesToFetch) {
          const response = await fetch(filePath)
          if (!response.ok) throw new Error(`Failed to fetch ${filePath}`)

          let content = await response.text()

          // Special handling for index.html to inject Export Flag
          if (filePath === 'index.html') {
            // Inject the flag and the data.js script
            // We inject it before the closing head tag
            const injection = `
  <script>
    window.IS_EXPORT = true;
  </script>
  <script src="./data/data.js"></script>
`
            content = content.replace('</head>', injection + '</head>')
          }

          zip.file(filePath, content)
        }

        // Add Data as JSON (Backup)
        zip.file("data/data.json", JSON.stringify(notes, null, 2))

        // Add Data as JS (For App Loading - Fixing CORS)
        const dataJsContent = `window.EXPORTED_NOTES = ${JSON.stringify(notes, null, 2)};`
        zip.file("data/data.js", dataJsContent)

        // Generate ZIP
        const content = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(content)
        const link = document.createElement('a')
        link.href = url
        link.download = `notes_website_export_${new Date().toISOString().split('T')[0]}.zip`
        link.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        alert('匯出失敗：' + err.message)
        console.error(err)
      }
    }
  },
  template: `
    <div class="data-manage-container">
      <div class="detail-header">
        <button @click="goBack" class="btn-back">← 返回首頁</button>
      </div>

      <div class="data-card">
        <div class="tabs">
          <div 
            class="tab-item" 
            :class="{ active: activeTab === 'import' }"
            @click="setTab('import')"
          >
            匯入資料
          </div>
          <div 
            class="tab-item" 
            :class="{ active: activeTab === 'export' }"
            @click="setTab('export')"
          >
            匯出資料
          </div>
        </div>

        <div class="tab-content">
          <!-- Import Section -->
          <div v-if="activeTab === 'import'" class="import-section">
            <h3 class="section-title">選擇匯入方式</h3>
            
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="importMode" value="merge">
                <div class="radio-content">
                  <span class="radio-title">合併資料 (Merge)</span>
                  <span class="radio-desc">保留現有記事，僅加入新的記事 (ID 不重複)</span>
                </div>
              </label>
              
              <label class="radio-label">
                <input type="radio" v-model="importMode" value="replace">
                <div class="radio-content">
                  <span class="radio-title">替換資料 (Replace)</span>
                  <span class="radio-desc">清空現有所有記事，完全使用匯入的檔案</span>
                </div>
              </label>
            </div>

            <input 
              type="file" 
              ref="fileInput" 
              style="display: none" 
              accept=".json"
              @change="handleFileChange"
            >
            
            <div class="action-area">
              <button @click="triggerImport" class="btn-primary lg">
                選擇檔案並匯入
              </button>
            </div>
          </div>

          <!-- Export Section -->
          <div v-if="activeTab === 'export'" class="export-section">
            <h3 class="section-title">選擇匯出格式</h3>

            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="exportMode" value="data">
                <div class="radio-content">
                  <span class="radio-title">僅數據 (JSON)</span>
                  <span class="radio-desc">備份用途，日後可重新匯入</span>
                </div>
              </label>
              
              <label class="radio-label">
                <input type="radio" v-model="exportMode" value="zip">
                <div class="radio-content">
                  <span class="radio-title">完整網站 (ZIP)</span>
                  <span class="radio-desc">下載包含網頁檢視器的壓縮檔 (index.html + data.json)</span>
                </div>
              </label>
            </div>

            <div class="action-area">
              <button @click="handleExport" class="btn-primary lg">
                開始匯出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
