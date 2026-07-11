<template>
  <div class="diary-group" :class="{ open: visible }" @click.stop>
    <div class="diary-panel">
    <!-- Date -->
    <div class="diary-date">{{ displayDate }}</div>

    <!-- Weather -->
    <div class="diary-section">
      <label>天气</label>
      <!-- Editable (today): multi-select buttons -->
      <div v-if="!readonly" class="weather-row">
        <button
          v-for="w in weathers"
          :key="w.key"
          class="icon-btn"
          :class="{ active: diary.weather.includes(w.key) }"
          @click="toggleWeather(w.key)"
          :title="w.label"
          v-html="w.icon"
        ></button>
      </div>
      <!-- Readonly (past): display chips -->
      <div v-else class="weather-row display">
        <template v-if="selectedWeathers.length">
          <span v-for="w in selectedWeathers" :key="w.key" class="display-chip" :title="w.label" v-html="w.icon"></span>
        </template>
        <span v-else class="empty-hint">—</span>
      </div>
    </div>

    <!-- Mood -->
    <div class="diary-section">
      <label>心情</label>
      <div v-if="!readonly" class="mood-row">
        <button
          v-for="m in moods"
          :key="m.key"
          class="mood-btn"
          :class="{ active: diary.mood.includes(m.key) }"
          :title="m.label"
          @click="toggleMood(m.key)"
          v-html="m.icon"
        ></button>
      </div>
      <div v-else class="mood-row display">
        <template v-if="selectedMoods.length">
          <span v-for="m in selectedMoods" :key="m.key" class="display-chip mood-chip" :title="m.label" v-html="m.icon"></span>
        </template>
        <span v-else class="empty-hint">—</span>
      </div>
    </div>

    <!-- Message -->
    <div class="diary-section">
      <label>留言</label>
      <textarea
        v-model="diary.message"
        class="diary-textarea"
        :class="{ readonly }"
        :disabled="readonly"
        placeholder="写点什么..."
        maxlength="500"
      ></textarea>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCurrentUser } from '../utils/storage.js'
import { getDiary, saveDiary } from '../utils/storage.js'
import { formatDate } from '../utils/helpers.js'

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

const empty = () => ({ weather: [], mood: [], message: '' })
const diary = ref(empty())

const todayStr = computed(() => formatDate(new Date()))
const readonly = computed(() => props.dateStr < todayStr.value)

const weathers = [
  { key: 'sunny', label: '晴', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34l-1.41 1.41M19.07 19.07l-1.41-1.41"/></svg>' },
  { key: 'cloudy', label: '多云', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>' },
  { key: 'rainy', label: '雨', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/></svg>' },
  { key: 'snowy', label: '雪', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="12" y1="16" x2="12" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/><line x1="8" y1="20" x2="8" y2="20.01"/><line x1="12" y1="20" x2="12" y2="20.01"/><line x1="16" y1="20" x2="16" y2="20.01"/></svg>' },
  { key: 'windy', label: '风', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>' },
]

const moods = [
  { key: 'happy', label: '开心', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M8 15c1.5 2 3.5 2.5 4 2.5s2.5-.5 4-2.5"/></svg>' },
  { key: 'excited', label: '兴奋', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M8 14c1 1.5 2.5 2.5 4 2.5s3-1 4-2.5"/><path d="M7 7l1.5 1M17 7l-1.5 1"/></svg>' },
  { key: 'calm', label: '平静', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8 15h8"/></svg>' },
  { key: 'tired', label: '疲惫', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 10c1-1 2-1.5 2-1.5M11 10c1-1 2-1.5 2-1.5"/><path d="M12 15v1"/><path d="M16 6l2-1M18 4l-1 2"/></svg>' },
  { key: 'sad', label: '难过', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M9 16c1-1 2.5-2 3-2s2 1 3 2"/></svg>' },
  { key: 'angry', label: '生气', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 9l2 2M10 9l-2 2M14 9l2 2M16 9l-2 2"/><path d="M8 16h8"/></svg>' },
]

const selectedWeathers = computed(() => weathers.filter(w => diary.value.weather.includes(w.key)))
const selectedMoods = computed(() => moods.filter(m => diary.value.mood.includes(m.key)))

function toggleWeather(key) {
  const arr = diary.value.weather
  const idx = arr.indexOf(key)
  if (idx === -1) { arr.push(key) } else { arr.splice(idx, 1) }
}

function toggleMood(key) {
  const arr = diary.value.mood
  const idx = arr.indexOf(key)
  if (idx === -1) { arr.push(key) } else { arr.splice(idx, 1) }
}

function load() {
  if (!props.dateStr) {
    diary.value = empty()
    return
  }
  const user = getCurrentUser()
  if (!user) return
  const saved = getDiary(user, props.dateStr)
  if (saved) {
    const d = { ...empty(), ...saved }
    if (typeof d.weather === 'string') d.weather = d.weather ? [d.weather] : []
    if (typeof d.mood === 'string') d.mood = d.mood ? [d.mood] : []
    diary.value = d
  } else {
    diary.value = empty()
  }
}

function onSave() {
  if (!props.dateStr) return
  const user = getCurrentUser()
  if (!user) return
  saveDiary(user, props.dateStr, { ...diary.value })
}

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
/* ===== Diary Group ===== */
.diary-group {
  position: fixed;
  top: 50%;
  left: 24px;
  transform: translateY(-50%) scale(0.85);
  z-index: 20;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.3s ease;
}

.diary-group.open {
  transform: translateY(-50%) scale(1);
  opacity: 1;
  pointer-events: auto;
}

.diary-panel {
  position: relative;
  width: 360px;
  max-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  padding: 32px 28px 28px;
  gap: 22px;
  overflow-y: auto;
  border-radius: 16px;
}

/* Wood texture — base */
.diary-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background:
    repeating-linear-gradient(
      180deg,
      transparent 0px,
      transparent 3px,
      rgba(139, 90, 43, 0.06) 3px,
      rgba(139, 90, 43, 0.06) 4px,
      transparent 4px,
      transparent 7px,
      rgba(139, 90, 43, 0.03) 7px,
      rgba(139, 90, 43, 0.03) 8px
    ),
    repeating-linear-gradient(
      180deg,
      transparent 0px,
      transparent 12px,
      rgba(180, 130, 80, 0.08) 12px,
      rgba(180, 130, 80, 0.08) 14px
    ),
    radial-gradient(ellipse 40px 30px at 82% 28%, rgba(100, 60, 20, 0.25) 0%, transparent 70%),
    radial-gradient(ellipse 30px 20px at 18% 72%, rgba(100, 60, 20, 0.18) 0%, transparent 65%),
    linear-gradient(175deg, #deb887 0%, #d2a36a 15%, #c89650 30%, #d4a85a 50%, #c09048 70%, #d2a36a 100%);
  border: 3px solid #8b6914;
  box-shadow:
    6px 6px 24px rgba(0,0,0,0.22),
    1px 1px 0 rgba(255,255,255,0.1) inset,
    -1px -1px 0 rgba(0,0,0,0.05) inset;
  z-index: -1;
  pointer-events: none;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.diary-date {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 700;
  color: #4a2e10;
  text-align: center;
  letter-spacing: 2px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0,0,0,0.15);
}

.diary-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diary-section label {
  font-size: 13px;
  font-weight: 600;
  color: #6b4a24;
  letter-spacing: 2px;
}

/* Weather */
.weather-row {
  display: flex;
  gap: 10px;
}

.weather-row.display {
  gap: 6px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
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
  background: rgba(90,60,20,0.2);
  border-color: #8b6914;
  box-shadow: 0 0 0 2px rgba(139,105,20,0.35), inset 0 0 6px rgba(139,105,20,0.15);
  transform: scale(1.08);
  color: #4a2e10;
}

.icon-btn :deep(svg) {
  width: 24px;
  height: 24px;
  pointer-events: none;
}

/* Mood */
.mood-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-row.display {
  gap: 8px;
}

.mood-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.1);
  background: rgba(255,255,255,0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #5c3d1a;
}

.mood-btn :deep(svg) {
  width: 24px;
  height: 24px;
  pointer-events: none;
}

.mood-btn:hover {
  background: rgba(255,255,255,0.5);
  transform: scale(1.1);
}

.mood-btn.active {
  background: rgba(90,60,20,0.22);
  border-color: #8b6914;
  transform: scale(1.15);
  box-shadow: 0 0 0 2px rgba(139,105,20,0.35), 0 2px 10px rgba(0,0,0,0.15);
}

/* Display chips (readonly past dates) */
.display-chip {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255,255,255,0.3);
  border: 1px solid rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5c3d1a;
}

.display-chip :deep(svg) {
  width: 22px;
  height: 22px;
}

.mood-chip {
  border-radius: 50%;
}

.mood-chip :deep(svg) {
  width: 22px;
  height: 22px;
}

.empty-hint {
  font-size: 14px;
  color: #a08060;
}

/* Textarea */
.diary-textarea {
  width: 100%;
  height: 160px;
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
  scrollbar-width: none;
}

.diary-textarea::-webkit-scrollbar {
  display: none;
}

.diary-textarea::placeholder {
  color: #a08060;
}

.diary-textarea:focus {
  border-color: rgba(90,60,20,0.35);
}

.diary-textarea.readonly {
  opacity: 0.7;
  cursor: default;
}
</style>

<style>
/* Theme-aware wood tones */
[data-theme="day"] .diary-panel::before {
  background:
    repeating-linear-gradient(180deg, transparent 0px, transparent 3px, rgba(139,90,43,0.06) 3px, rgba(139,90,43,0.06) 4px, transparent 4px, transparent 7px, rgba(139,90,43,0.03) 7px, rgba(139,90,43,0.03) 8px),
    repeating-linear-gradient(180deg, transparent 0px, transparent 12px, rgba(180,130,80,0.08) 12px, rgba(180,130,80,0.08) 14px),
    radial-gradient(ellipse 40px 30px at 82% 28%, rgba(100,60,20,0.25) 0%, transparent 70%),
    radial-gradient(ellipse 30px 20px at 18% 72%, rgba(100,60,20,0.18) 0%, transparent 65%),
    linear-gradient(175deg, #deb887 0%, #d2a36a 15%, #c89650 30%, #d4a85a 50%, #c09048 70%, #d2a36a 100%);
  border-color: #8b6914;
}

[data-theme="evening"] .diary-panel::before {
  background:
    repeating-linear-gradient(180deg, transparent 0px, transparent 3px, rgba(100,70,40,0.07) 3px, rgba(100,70,40,0.07) 4px, transparent 4px, transparent 7px, rgba(100,70,40,0.04) 7px, rgba(100,70,40,0.04) 8px),
    repeating-linear-gradient(180deg, transparent 0px, transparent 13px, rgba(160,100,60,0.1) 13px, rgba(160,100,60,0.1) 15px),
    radial-gradient(ellipse 40px 30px at 82% 28%, rgba(80,45,15,0.3) 0%, transparent 70%),
    radial-gradient(ellipse 30px 20px at 18% 72%, rgba(80,45,15,0.22) 0%, transparent 65%),
    linear-gradient(175deg, #c8946a 0%, #b87a48 15%, #a66b38 30%, #b88040 50%, #a06830 70%, #b87a48 100%);
  border-color: #7a5c22;
}

[data-theme="night"] .diary-panel::before {
  background:
    repeating-linear-gradient(180deg, transparent 0px, transparent 3px, rgba(60,40,25,0.1) 3px, rgba(60,40,25,0.1) 4px, transparent 4px, transparent 7px, rgba(60,40,25,0.06) 7px, rgba(60,40,25,0.06) 8px),
    repeating-linear-gradient(180deg, transparent 0px, transparent 14px, rgba(90,60,35,0.12) 14px, rgba(90,60,35,0.12) 16px),
    radial-gradient(ellipse 40px 30px at 82% 28%, rgba(50,30,10,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 30px 20px at 18% 72%, rgba(50,30,10,0.25) 0%, transparent 65%),
    linear-gradient(175deg, #6b4c3a 0%, #5a3a28 15%, #4d3020 30%, #5a3a28 50%, #453020 70%, #5a3a28 100%);
  border-color: #4a3520;
}

/* Night theme — light text */
[data-theme="night"] .diary-date { color: #e8dcc8; border-bottom-color: rgba(255,255,255,0.15); }
[data-theme="night"] .diary-section label { color: #c8b898; }
[data-theme="night"] .icon-btn { color: #d8c8a8; border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); }
[data-theme="night"] .icon-btn:hover { background: rgba(255,255,255,0.15); }
[data-theme="night"] .icon-btn.active { background: rgba(255,255,255,0.18); border-color: #c8a860; box-shadow: 0 0 0 2px rgba(200,168,96,0.4), inset 0 0 6px rgba(200,168,96,0.2); transform: scale(1.08); color: #f0e0c0; }
[data-theme="night"] .mood-btn { color: #d8c8a8; border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); }
[data-theme="night"] .mood-btn:hover { background: rgba(255,255,255,0.14); }
[data-theme="night"] .mood-btn.active { color: #f0e0c0; background: rgba(255,255,255,0.2); border-color: #c8a860; box-shadow: 0 0 0 2px rgba(200,168,96,0.4), 0 2px 10px rgba(0,0,0,0.3); }
[data-theme="night"] .display-chip { color: #d8c8a8; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.12); }
[data-theme="night"] .empty-hint { color: #8a7a6a; }
[data-theme="night"] .diary-textarea { color: #e0d6c8; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); }
[data-theme="night"] .diary-textarea::placeholder { color: #8a7a6a; }
[data-theme="night"] .diary-textarea:focus { border-color: rgba(255,255,255,0.25); }
</style>
