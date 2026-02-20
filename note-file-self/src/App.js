export default {
  template: /* html */`
      <div class="container">
        <nav class="navbar">
          <div class="container-fluid">
            <router-link class="navbar-brand fs-3" to="/">本地檔案記事本</router-link>
            <router-link class="nav-link fs-4" :class="{ 'active': $route.name === 'Setting' }" to="/setting">設定</router-link>
          </div>
        </nav>
        <router-view></router-view>
      </div>
    `,
}