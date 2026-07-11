<template>
  <div class="download-wrapper" ref="wrapperRef">
    <button class="download-btn" @click.stop="onClick" title="下载">
      <svg viewBox="0 0 256 256" height="18" width="22" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M74.34 85.66a8 8 0 0 1 11.32-11.32L120 108.69V24a8 8 0 0 1 16 0v84.69l34.34-34.35a8 8 0 0 1 11.32 11.32l-48 48a8 8 0 0 1-11.32 0ZM240 136v64a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16h52.4a4 4 0 0 1 2.83 1.17L111 145a24 24 0 0 0 34 0l23.8-23.8a4 4 0 0 1 2.8-1.2H224a16 16 0 0 1 16 16m-40 32a12 12 0 1 0-12 12a12 12 0 0 0 12-12"
          fill="currentColor"
        ></path>
      </svg>
    </button>
    <Transition name="toast">
      <div class="toast" v-if="showToast">开发中...</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'

const emit = defineEmits(['opened'])

const showToast = ref(false)
const wrapperRef = ref(null)
let timer = null

function onClick() {
  clearTimeout(timer)
  showToast.value = true
  emit('opened')
  timer = setTimeout(() => { showToast.value = false }, 1500)
  setTimeout(() => document.addEventListener('click', onClickOutside, true), 0)
}

function onClickOutside(e) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    closeToast()
  }
}

function closeToast() {
  clearTimeout(timer)
  showToast.value = false
  document.removeEventListener('click', onClickOutside, true)
}

function close() {
  closeToast()
}

function cleanup() {
  clearTimeout(timer)
  document.removeEventListener('click', onClickOutside, true)
}

onBeforeUnmount(cleanup)

defineExpose({ close })
</script>

<style scoped>
.download-wrapper {
  position: relative;
}

.download-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary, #8a7560);
  font-family: inherit;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.download-btn:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--accent, #4A90D9);
  transform: translateY(-2px);
}

.download-btn:active {
  transform: translateY(0);
}

.toast {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 10px;
  background: var(--dropdown-bg, rgba(255,255,255,0.88));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--dropdown-border, rgba(200,180,160,0.4));
  box-shadow: var(--shadow-md, 0 8px 32px rgba(0,0,0,0.12));
  color: var(--text-color, #3d2e1c);
  font-size: 13px;
  font-family: inherit;
  white-space: nowrap;
  letter-spacing: 1px;
  z-index: 30;
  pointer-events: none;
  transition: background 0.8s, border-color 0.8s, color 0.8s;
}

.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(6px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px) scale(0.95);
}
</style>
