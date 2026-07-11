<template>
  <div class="diary-panel" :class="{ open: visible }" @click.stop>
    <!-- Date -->
    <div class="diary-date">{{ displayDate }}</div>

    <!-- Weather -->
    <div class="diary-section">
      <label>天气</label>
      <div class="weather-row">
        <button
          v-for="w in weathers"
          :key="w.key"
          class="icon-btn"
          :class="{ active: diary.weather === w.key }"
          @click="diary.weather = w.key"
          :title="w.label"
          v-html="w.icon"
        ></button>
      </div>
    </div>

    <!-- Mood -->
    <div class="diary-section">
      <label>心情</label>
      <div class="mood-row">
        <button
          v-for="m in moods"
          :key="m.key"
          class="mood-btn"
          :class="{ active: diary.mood === m.key }"
          @click="diary.mood = m.key"
        >{{ m.emoji }}</button>
      </div>
    </div>

    <!-- Message -->
    <div class="diary-section">
      <label>留言</label>
      <textarea
        v-model="diary.message"
        class="diary-textarea"
        placeholder="写点什么..."
        maxlength="200"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCurrentUser } from '../utils/storage.js'
import { getDiary, saveDiary } from '../utils/storage.js'

const props = defineProps({
  dateStr: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})

defineEmits(['close'])

const displayDate = computed(() => {
  if (!props.dateStr) return ''
  const d = new Date(props.dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${y}年${m}月${day}日 星期${week}`
})

const empty = () => ({ weather: '', mood: '', message: '' })
const diary = ref(empty())

const weathers = [
  { key: 'sunny', label: '晴', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34l-1.41 1.41M19.07 19.07l-1.41-1.41"/></svg>' },
  { key: 'cloudy', label: '多云', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>' },
  { key: 'rainy', label: '雨', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/></svg>' },
  { key: 'snowy', label: '雪', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="12" y1="16" x2="12" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/><line x1="8" y1="20" x2="8" y2="20.01"/><line x1="12" y1="20" x2="12" y2="20.01"/><line x1="16" y1="20" x2="16" y2="20.01"/></svg>' },
  { key: 'windy', label: '风', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>' },
]

const moods = [
  { key: 'happy', emoji: '😊' },
  { key: 'excited', emoji: '🥳' },
  { key: 'calm', emoji: '😌' },
  { key: 'tired', emoji: '😴' },
  { key: 'sad', emoji: '😢' },
  { key: 'angry', emoji: '😠' },
]

function load() {
  if (!props.dateStr) {
    diary.value = empty()
    return
  }
  const user = getCurrentUser()
  if (!user) return
  const saved = getDiary(user, props.dateStr)
  diary.value = saved ? { ...empty(), ...saved } : empty()
}

function onSave() {
  if (!props.dateStr) return
  const user = getCurrentUser()
  if (!user) return
  saveDiary(user, props.dateStr, { ...diary.value })
}

// Auto-save on change (debounced)
let saveTimeout = null
function autoSave() {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(onSave, 400)
}

watch(() => props.dateStr, load)
watch(() => props.visible, (v) => { if (v) load() })
watch(diary, autoSave, { deep: true })
</script>

<style scoped>
.diary-panel {
  position: fixed;
  top: 50%;
  left: 24px;
  transform: translateY(-50%) scale(0.85);
  width: 280px;
  max-height: calc(100vh - 100px);
  z-index: 20;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  padding: 28px 24px 24px;
  gap: 18px;
  overflow-y: auto;
  border-radius: 16px;
}

.diary-panel.open {
  transform: translateY(-50%) scale(1);
  opacity: 1;
  pointer-events: auto;
}

/* Wood texture */
.diary-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background:
    linear-gradient(180deg, #d4a76a 0%, #c89650 2%, #d4a76a 5%, #b8844a 8%,
                           #d4a76a 12%, #c89650 18%, #d4a76a 25%, #b8844a 30%,
                           #d4a76a 35%, #c89650 42%, #d4a76a 50%, #b8844a 55%,
                           #d4a76a 60%, #c89650 68%, #d4a76a 75%, #b8844a 80%,
                           #d4a76a 85%, #c89650 90%, #d4a76a 95%, #b8844a 100%);
  border: 3px solid #8b6914;
  box-shadow: 6px 6px 24px rgba(0,0,0,0.25), inset 0 1px 3px rgba(255,255,255,0.15);
  z-index: -1;
  pointer-events: none;
}

.diary-date {
  font-family: "Noto Serif SC", serif;
  font-size: 17px;
  font-weight: 700;
  color: #4a2e10;
  text-align: center;
  letter-spacing: 2px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(0,0,0,0.15);
}

.diary-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diary-section label {
  font-size: 12px;
  font-weight: 600;
  color: #6b4a24;
  letter-spacing: 2px;
}

/* Weather */
.weather-row {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1.5px solid rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #5c3d1a;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.55);
}

.icon-btn.active {
  background: rgba(90,60,20,0.15);
  border-color: rgba(90,60,20,0.3);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.icon-btn :deep(svg) {
  width: 20px;
  height: 20px;
}

/* Mood */
.mood-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mood-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.1);
  background: rgba(255,255,255,0.3);
  cursor: pointer;
  font-size: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.mood-btn:hover {
  background: rgba(255,255,255,0.5);
  transform: scale(1.1);
}

.mood-btn.active {
  background: rgba(90,60,20,0.2);
  border-color: rgba(90,60,20,0.35);
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Textarea */
.diary-textarea {
  width: 100%;
  height: 100px;
  padding: 10px 12px;
  border: 1.5px solid rgba(0,0,0,0.12);
  border-radius: 10px;
  background: rgba(255,255,255,0.4);
  font-family: inherit;
  font-size: 14px;
  color: #4a2e10;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.diary-textarea::placeholder {
  color: #a08060;
}

.diary-textarea:focus {
  border-color: rgba(90,60,20,0.35);
}

</style>
