// 使用全局的 VueRouter
const { createRouter, createWebHashHistory } = VueRouter

// 定義路由
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/note/:id', component: NoteDetail },
  { path: '/note/new', component: NoteEditor },
  { path: '/note/:id/edit', component: NoteEditor },
  { path: '/data', component: DataManagement }
]

// 創建路由實例並設為全局變量
const router = createRouter({
  history: createWebHashHistory(),
  routes
})
