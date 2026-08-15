import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'HomeLayout',
    component: () => import('./views/home/Layout.js'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('./views/home/Home.js')
      }
    ]
  },
  {
    path: '/setting',
    name: 'SettingLayout',
    component: () => import('./views/setting/Layout.js'),
    children: [
      {
        path: '',
        name: 'Setting',
        component: () => import('./views/setting/Setting.js')
      },
      {
        path: 'themes',
        name: 'Themes',
        component: () => import('./views/setting/Themes.js')
      },
      {
        path: 'import-export',
        name: 'ImportExport',
        component: () => import('./views/setting/ImportExport.js')
      },
      {
        path: 'file-browser',
        name: 'FileBrowser',
        component: () => import('./views/setting/FileBrowser.js')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;