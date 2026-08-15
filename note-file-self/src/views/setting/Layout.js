import { ref  } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SliderBar from '../../components/SliderBar.js';

export default {
  components: {
    SliderBar
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const showMenu = ref(false);
    // console.log(showMenu.value)
    function isMobile() {
      if (window.innerWidth <= 760) {
        return true
      } else {
        return false
      }
    }

    // if (isMobile()) {
    //   showMenu.value = false
    // }

    function goLink(path) {
      showMenu.value = false
      router.push(path)
      console.log(showMenu.value)
      console.log(isMobile())
    }

    return {
      route,
      showMenu,
      isMobile,
      goLink
    };
  },
  template: /* html */`
    <div class="container my-3" style="position: relative;">
      <SliderBar v-model:active="showMenu" />
      <div class="slider-content">
        <button class="btn btn-outline-secondary" @click="showMenu = true"">
          <i class="bi bi-arrow-left-circle"></i>
          所有設定
        </button>
      </div>
    </div>
  `,
}