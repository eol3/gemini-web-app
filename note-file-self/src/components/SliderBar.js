export default {
  props: {
    active: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:active'],
  setup(props, { emit }) {
    function hideMenu() {
      emit('update:active', false)
    }

    return {
      hideMenu
    }
  },
  template: /* html */`
    <div class="slider h-100" :class="{ active: active }">
      <button class="btn btn-outline-secondary" @click="hideMenu">
        基本設定
        <i class="bi bi-arrow-right-circle"></i>
      </button>
    </div>
  `
}