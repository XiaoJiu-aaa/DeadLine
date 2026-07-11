<template>
  <header class="app-header">
    <div class="header-brand">
      <div class="brand-icon">📅</div>
      <span class="brand-text">待办日程</span>
    </div>

    <div class="header-actions">
      <HelpCard ref="helpCard" @opened="onHelpOpened" />
      <DownloadButton ref="downloadBtn" @opened="onDownloadToastOpened" />
      <SettingsPanel ref="settingsPanel" @action="handleAction" @opened="onSettingsOpened" />
    </div>

    <!-- Right-side tools group -->
    <div class="header-tools">
      <!-- Important Day Toggle -->
      <div class="heart-container" :class="{ active: isImportant, disabled: !canMark }" :title="heartTitle" @click.stop="onHeartClick">
        <div class="svg-container">
          <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z"/>
          </svg>
          <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z"/>
          </svg>
          <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="10,10 20,20"/>
            <polygon points="10,50 20,50"/>
            <polygon points="20,80 30,70"/>
            <polygon points="90,10 80,20"/>
            <polygon points="90,50 80,50"/>
            <polygon points="80,80 70,70"/>
          </svg>
        </div>
      </div>

      <!-- Special Day Toggle (circle) -->
      <div class="circle-container" :class="{ active: isSpecial, disabled: !canMark }" :title="circleTitle" @click.stop="onCircleClick">
        <div class="svg-container">
          <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8"/>
          </svg>
          <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8"/>
          </svg>
          <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="10,10 20,20"/>
            <polygon points="10,50 20,50"/>
            <polygon points="20,80 30,70"/>
            <polygon points="90,10 80,20"/>
            <polygon points="90,50 80,50"/>
            <polygon points="80,80 70,70"/>
          </svg>
        </div>
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
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SettingsPanel from './SettingsPanel.vue'
import HelpCard from './HelpCard.vue'
import DownloadButton from './DownloadButton.vue'

const props = defineProps({
  selectedDate: { type: String, default: '' },
  isImportant: { type: Boolean, default: false },
  isSpecial: { type: Boolean, default: false },
  canMark: { type: Boolean, default: false },
})

const emit = defineEmits(['settingsAction', 'toggleImportant', 'toggleSpecial'])

const heartTitle = computed(() => {
  if (!props.canMark) return '请先选中今天或未来某天'
  return props.isImportant ? '取消重要日' : '标记为重要日'
})

const circleTitle = computed(() => {
  if (!props.canMark) return '请先选中今天或未来某天'
  return props.isSpecial ? '取消特殊日' : '标记为特殊日'
})

const settingsPanel = ref(null)
const helpCard = ref(null)
const downloadBtn = ref(null)
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

function onHeartClick() {
  if (!props.canMark) return
  emit('toggleImportant')
}

function onCircleClick() {
  if (!props.canMark) return
  emit('toggleSpecial')
}

function handleAction(action) {
  emit('settingsAction', action)
}

function closeDropdowns() {
  settingsPanel.value?.close()
  helpCard.value?.close()
  downloadBtn.value?.close()
}

function onHelpOpened() {
  settingsPanel.value?.close()
  downloadBtn.value?.close()
}

function onDownloadToastOpened() {
  settingsPanel.value?.close()
  helpCard.value?.close()
}

function onSettingsOpened() {
  helpCard.value?.close()
  downloadBtn.value?.close()
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

/* Right-side tools group */
.header-tools {
  position: fixed;
  top: 11px;
  right: 340px;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Theme slider */
.theme-slider {
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

/* ===== Heart Toggle ===== */
.heart-container {
  --heart-color: rgb(255, 91, 137);
  width: 34px;
  height: 34px;
  transition: .3s;
  cursor: pointer;
  flex-shrink: 0;
}

.heart-container.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.heart-container .svg-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.heart-container .svg-outline,
.heart-container .svg-filled {
  fill: var(--heart-color);
  position: absolute;
  width: 22px;
  height: 22px;
}

.heart-container .svg-filled {
  animation: heart-filled 1s;
  display: none;
}

.heart-container.active .svg-filled {
  display: block;
}

.heart-container.active .svg-outline {
  display: none;
}

.heart-container .svg-celebrate {
  position: absolute;
  width: 50px;
  height: 50px;
  animation: heart-celebrate .5s;
  animation-fill-mode: forwards;
  display: none;
  stroke: var(--heart-color);
  fill: var(--heart-color);
  stroke-width: 2px;
}

.heart-container.active .svg-celebrate {
  display: block;
}

@keyframes heart-filled {
  0%   { transform: scale(0); }
  25%  { transform: scale(1.2); }
  50%  { transform: scale(1); filter: brightness(1.5); }
}

@keyframes heart-celebrate {
  0%   { transform: scale(0); }
  50%  { opacity: 1; filter: brightness(1.5); }
  100% { transform: scale(1.4); opacity: 0; display: none; }
}

/* ===== Circle Toggle ===== */
.circle-container {
  --circle-color: #4A90D9;
  width: 34px;
  height: 34px;
  transition: .3s;
  cursor: pointer;
  flex-shrink: 0;
}

.circle-container.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.circle-container .svg-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.circle-container .svg-outline,
.circle-container .svg-filled {
  fill: none;
  stroke: var(--circle-color);
  stroke-width: 2;
  position: absolute;
  width: 22px;
  height: 22px;
}

.circle-container .svg-filled {
  fill: var(--circle-color);
  animation: circle-filled 1s;
  display: none;
}

.circle-container.active .svg-filled {
  display: block;
}

.circle-container.active .svg-outline {
  display: none;
}

.circle-container .svg-celebrate {
  position: absolute;
  width: 50px;
  height: 50px;
  animation: circle-celebrate .5s;
  animation-fill-mode: forwards;
  display: none;
  stroke: var(--circle-color);
  fill: var(--circle-color);
  stroke-width: 2px;
}

.circle-container.active .svg-celebrate {
  display: block;
}

@keyframes circle-filled {
  0%   { transform: scale(0); }
  25%  { transform: scale(1.2); }
  50%  { transform: scale(1); filter: brightness(1.5); }
}

@keyframes circle-celebrate {
  0%   { transform: scale(0); }
  50%  { opacity: 1; filter: brightness(1.5); }
  100% { transform: scale(1.4); opacity: 0; display: none; }
}
</style>
