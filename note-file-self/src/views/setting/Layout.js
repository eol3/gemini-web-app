import { ref  } from 'vue';
import { useRoute } from 'vue-router';

export default {
  setup() {
    const route = useRoute();
    const showMenu = ref(isMobile());

    function isMobile() {
      if (screen.width <= 760) {
        return true
      } else {
        return false
      }
    }

    return {
      route,
      showMenu,
      isMobile
    };
  },
  template: /* html */`
    <div class="container my-3">
      <div class="row" style="position: relative;">
        <Transition name="slide-left">
          <div class="col-12 col-md-3 d-md-block" v-show="showMenu">
            <ul class="nav flex-column">
              <li class="nav-item">
                <router-link
                  class="nav-link"
                  :class="{ 'active': route.name === 'Setting' }"
                  @click="showMenu = false"
                  :to="{ name: 'Setting' }"
                >
                  基本設定
                </router-link>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#">佈景主題</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#">匯入匯出</a>
              </li>
              <li class="nav-item">
                <router-link
                  class="nav-link"
                  :class="{ 'active': route.name === 'FileBrowser' }"
                  @click="showMenu = false"
                  :to="{ name: 'FileBrowser' }"
                >
                  檔案瀏覽器
                </router-link>
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
            <router-view></router-view>
          </div>
        </template>
      </div>
    </div>
  `,
}