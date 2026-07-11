<template>
  <header class="app-header">
    <div class="header-brand">
      <div class="brand-icon">📅</div>
      <span class="brand-text">待办日程</span>
    </div>

    <div class="header-actions">
      <SettingsPanel ref="settingsPanel" @action="handleAction" />
    </div>

    <!-- Theme Slider -->
    <div class="theme-slider">
      <div class="slider-thumb" ref="sliderThumb"></div>
      <button
        v-for="opt in themes"
        :key="opt.key"
        class="slider-option"
        @click="setTheme(opt.key)"
        v-html="opt.icon"
      ></button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SettingsPanel from './SettingsPanel.vue'

const emit = defineEmits(['settingsAction'])

const settingsPanel = ref(null)
const sliderThumb = ref(null)
let themeObserver = null

const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
const sunsetIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42 1.42"/><path d="M7 18h10"/></svg>`
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`

const themes = [
  { key: 'day', icon: sunIcon, label: '白天' },
  { key: 'evening', icon: sunsetIcon, label: '傍晚' },
  { key: 'night', icon: moonIcon, label: '夜晚' },
]

const thumbPositions = { day: 3, evening: 37, night: 71 }

function setTheme(theme) {
  document.body.setAttribute('data-theme', theme)
  sliderThumb.value.style.left = thumbPositions[theme] + 'px'
}

function handleAction(action) {
  emit('settingsAction', action)
}

function closeDropdowns() {
  settingsPanel.value?.close()
}

function syncThumb() {
  const theme = document.body.getAttribute('data-theme')
  if (theme && sliderThumb.value) {
    sliderThumb.value.style.left = thumbPositions[theme] + 'px'
  }
}

onMounted(() => {
  syncThumb()
  themeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') syncThumb()
    }
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})

defineExpose({ closeDropdowns })
</script>

<style scoped>
/* Theme variables cascade from :root set in parent */
.app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--header-bg, rgba(255, 255, 255, 0.72));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--header-border, rgba(255, 255, 255, 0.5));
  box-shadow: var(--shadow-sm, 0 2px 12px rgba(0, 0, 0, 0.06));
  transition: background var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
  user-select: none;
}

.brand-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent, #e8a850), color-mix(in srgb, var(--accent, #e8a850) 70%, #fff));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  box-shadow: 0 2px 8px var(--accent-glow, rgba(232, 168, 80, 0.25));
  transition: background var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-text {
  font-family: "Noto Serif SC", "STSong", serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-color, #3d2e1c);
  letter-spacing: 2px;
  transition: color var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Theme slider */
.theme-slider {
  position: fixed;
  top: 12px;
  right: 340px;
  z-index: 25;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 28px;
  padding: 3px;
  transition: background var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--transition-speed, 0.8s) cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.slider-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  z-index: 0;
}

.slider-option {
  position: relative;
  z-index: 1;
  width: 34px; height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  font-size: 13px;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slider-option:hover { transform: scale(1.15); }
.slider-option:active { transform: scale(0.9); }

.slider-option :deep(svg) {
  width: 15px;
  height: 15px;
  display: block;
}

.slider-option .tooltip {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  white-space: nowrap;
  color: var(--text-color);
  background: var(--header-bg);
  backdrop-filter: blur(8px);
  padding: 3px 10px;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  letter-spacing: 0.5px;
}

.slider-option:hover .tooltip { opacity: 1; }
</style>
