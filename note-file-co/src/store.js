// Using global Vue API
const { reactive } = Vue;

let store = null;

export function createStore() {
    if (store) return store;

    store = reactive({
        // UI State
        notebookName: '我的記事本',
        currentTheme: 'theme-light',
        
        // Data
        notes: [],
        categories: [],
        selectedNoteId: null,
        
        // Methods
        setNotebookName(name) {
            this.notebookName = name;
            localStorage.setItem('notebookName', name);
            console.log('✅ Notebook name updated:', name);
        },
        
        setTheme(theme) {
            this.currentTheme = `theme-${theme}`;
            localStorage.setItem('theme', theme);
            console.log('✅ Theme changed:', theme);
        },
        
        loadSettings() {
            try {
                // Load notebook name
                const savedName = localStorage.getItem('notebookName');
                if (savedName) {
                    this.notebookName = savedName;
                }
                
                // Load theme
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme) {
                    this.currentTheme = `theme-${savedTheme}`;
                }
                
                console.log('✅ Settings loaded from localStorage');
            } catch (e) {
                console.warn('⚠️ Failed to load settings:', e);
            }
        }
    });

    store.loadSettings();
    
    return store;
}

export function useStore() {
    if (!store) {
        store = createStore();
    }
    return store;
}
