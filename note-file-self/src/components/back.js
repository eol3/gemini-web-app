export default {
  template: /* html */`
      <div class="row" style="position: relative;">
        <Transition name="slide-left">
          <div class="col-12 col-md-3 d-md-block" v-show="showMenu">
            <ul class="nav flex-column">
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ 'active': route.name === 'Setting' }"
                  @click="goLink('/setting')"
                >
                  基本設定
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ 'active': route.name === 'Themes' }"
                  @click="goLink('/setting/themes')"
                >
                  佈景主題
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ 'active': route.name === 'ImportExport' }"
                  @click="goLink('/setting/import-export')"
                >
                  匯入匯出
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ 'active': route.name === 'FileBrowser' }"
                  @click="goLink('/setting/file-browser')"
                >
                  檔案瀏覽器
                </button>
              </li>
            </ul>
          </div>
        </Transition>
        <template v-if="isMobile()">
          <Transition name="slide-right">
            <div v-if="!showMenu" style="width: 100%; position: absolute; left: 0; top: 0;">
              <div @click="showMenu = true" class="btn btn-outline-secondary mb-3">返回</div>
              <router-view></router-view>
            </div>
          </Transition>
        </template>
        <template v-else>
          <div class="col-12 col-md-9">
            111
            <router-view></router-view>
          </div>
        </template>
      </div>
  `
}