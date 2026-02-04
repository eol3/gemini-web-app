// 使用全局的 Vue
const { createApp } = Vue

const App = {
  data() {
    return {
      isMenuOpen: false,

    }
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen
    },
    closeMenu() {
      this.isMenuOpen = false
    }
  }
}

createApp(App).use(router).mount('#app')