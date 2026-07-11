<template>
  <div class="calendar-wrapper">
    <div class="calendar-scene" @click.stop>
      <div class="calendar-body" :class="{ flipping: isFlipping }">
        <div class="flip-overlay"></div>

        <!-- Spiral Binding -->
        <div class="spiral-row">
          <div v-for="i in 24" :key="i" class="spiral-ring"></div>
        </div>

        <!-- Calendar Page -->
        <div class="calendar-page">
          <div class="calendar-header">
            <span class="month-title" v-if="!editing" @click="startEdit">{{ currentYear }} 年 {{ currentMonth + 1 }} 月</span>
            <span class="month-title edit-mode" v-else @focusout="onEditFocusout">
              <input
                ref="yearInput"
                v-model="editYear"
                class="title-input"
                @keydown.enter="confirmEdit"
                @keydown.escape="cancelEdit"
              /> 年
              <input
                v-model="editMonth"
                class="title-input"
                @keydown.enter="confirmEdit"
                @keydown.escape="cancelEdit"
              /> 月
            </span>
            <div class="month-nav">
              <button @click="flipMonth(-1)" aria-label="上个月">&#9666;</button>
              <button class="today-btn" @click="goToToday">今天</button>
              <button @click="flipMonth(1)" aria-label="下个月">&#9656;</button>
            </div>
          </div>

          <div class="weekday-row">
            <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
          </div>

          <div class="calendar-grid">
            <div
              v-for="cell in cells"
              :key="cell.key"
              class="calendar-cell"
              :class="cell.classes"
              @click.stop="selectDate(cell)"
            >
              <span class="cell-date">{{ cell.day }}</span>

              <!-- Crayon X for past dates (non-important, non-special) -->
              <svg v-if="cell.isPast && !cell.isImportant && !cell.isSpecial" class="crayon-x" viewBox="0 0 24 24" fill="none" style="overflow:visible">
                <path d="M5.5 4.5C7 6 8.5 7.5 10 9C11.5 10.5 12.5 12 12.5 13C12.5 14 13 15 14 16C15.5 17.5 17 18.5 19 20" stroke="#F44" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 3C6 5 7.5 7 9.5 9C11 10.5 12 12 12 13.5C12 15 13.5 16.5 15 17.5C17 18.5 18.5 19.5 20.5 21.5" stroke="#F44" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5.5 19.5C7 18 8.5 16.5 10 15C11.5 13.5 12.5 12 12.5 11C12.5 10 13 9 14 8C15.5 6.5 17 5.5 19 4" stroke="#F44" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 21C6 19 7.5 17 9.5 15C11 13.5 12 12 12 10.5C12 9 13.5 7.5 15 6.5C17 5.5 18.5 4.5 20.5 2.5" stroke="#F44" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 3.5C8.5 5 10 7.5 12.5 11.5C13.5 14 15 16 18.5 19.5" stroke="#F44" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>

              <!-- Crayon Heart for important days -->
              <svg v-if="cell.isImportant" class="crayon-heart" viewBox="0 0 24 24" fill="none" style="overflow:visible">
                <!-- Thick main outline — slightly irregular -->
                <path d="M12 20.5C12 20.5 4 14.5 4 9.5C4 6.8 5.5 5 8 5C9.5 5 11 5.8 12 7.2C13 5.8 14.5 5 16 5C18.5 5 20 6.8 20 9.5C20 14.5 12 20.5 12 20.5Z" stroke="#F44" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Thin accent — offset slightly -->
                <path d="M12 19.8C12 19.8 4.5 14 4.5 9.5C4.5 7 5.8 5.5 7.8 5.5C9.3 5.5 10.5 6.3 11.5 7.5" stroke="#F44" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 19.8C12 19.8 19.5 14 19.5 9.5C19.5 7 18.2 5.5 16.2 5.5C14.7 5.5 13.5 6.3 12.5 7.5" stroke="#F44" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Tiny texture strokes -->
                <path d="M7.5 7C8.5 6.2 9.5 7 10.5 8" stroke="#F44" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16.5 7C15.5 6.2 14.5 7 13.5 8" stroke="#F44" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11.5 10C11.5 9 12 8 12 7.5" stroke="#F44" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>

              <!-- Crayon Circle for special days -->
              <svg v-if="cell.isSpecial" class="crayon-circle" viewBox="0 0 24 24" fill="none" style="overflow:visible">
                <!-- Thick hand-drawn circle — made of arcs, not perfect circle -->
                <path d="M4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12C20 16.4 16.4 20 12 20C7.6 20 4 16.4 4 12Z" stroke="#4A90D9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Thin offset arc — partial -->
                <path d="M4.5 11.5C4.5 7.3 7.8 4.5 11.8 4.5C15.8 4.5 19.5 7.3 19.5 11.5" stroke="#4A90D9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19.5 12.5C19.5 16.7 16.2 19.5 12.2 19.5C8.2 19.5 4.5 16.7 4.5 12.5" stroke="#4A90D9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Scribble accent -->
                <path d="M7 8.5C9 7 11 6.5 13 7" stroke="#4A90D9" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 15.5C15 17 13 17.5 11 17" stroke="#4A90D9" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>

              <!-- Task dots placeholder -->
              <div v-if="cell.dots && cell.dots.length" class="cell-dots">
                <span v-for="(dot, di) in cell.dots.slice(0, 5)" :key="di" class="cell-dot" :class="dot"></span>
                <span v-if="cell.dots.length > 5" class="cell-dots-overflow">+{{ cell.dots.length - 5 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Base Stand -->
        <div class="calendar-stand"></div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  importantDays: { type: Array, default: () => [] },
  specialDays: { type: Array, default: () => [] },
  taskDatesMap: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['selectDate'])

const today = new Date()
const todayStr = fmtDate(today)

const currentMonth = ref(today.getMonth())
const currentYear = ref(today.getFullYear())
const selectedDate = ref(null)
const isFlipping = ref(false)

// Inline year/month editing
const editing = ref(false)
const editYear = ref(today.getFullYear())
const editMonth = ref(today.getMonth() + 1)
const yearInput = ref(null)
const minYear = today.getFullYear() - 50
const maxYear = today.getFullYear() + 100

function startEdit() {
  editYear.value = currentYear.value
  editMonth.value = currentMonth.value + 1
  editing.value = true
  requestAnimationFrame(() => yearInput.value?.select())
}

function cancelEdit() {
  editing.value = false
}

function onEditFocusout() {
  // Delay so click between the two inputs doesn't prematurely close edit mode
  setTimeout(() => {
    if (!editing.value) return
    const active = document.activeElement
    if (!active || !active.classList.contains('title-input')) {
      confirmEdit()
    }
  }, 100)
}

function confirmEdit() {
  if (!editing.value) return
  let y = parseInt(editYear.value, 10)
  let m = parseInt(editMonth.value, 10)

  if (isNaN(y) || isNaN(m) || m < 1 || m > 12 || y < minYear || y > maxYear) {
    editYear.value = currentYear.value
    editMonth.value = currentMonth.value + 1
    editing.value = false
    return
  }

  currentYear.value = y
  currentMonth.value = m - 1
  editing.value = false
}

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const cells = computed(() => {
  const result = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
  const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  const prevMonthDays = new Date(currentYear.value, currentMonth.value, 0).getDate()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let idx = 0

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    result.push({
      key: `prev-${i}`,
      day: prevMonthDays - i,
      classes: { 'other-month': true },
      isPast: false,
      dateStr: '',
      dots: [],
    })
    idx++
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = fmtDate(new Date(currentYear.value, currentMonth.value, day))
    const cellDate = new Date(currentYear.value, currentMonth.value, day)
    result.push({
      key: `curr-${day}`,
      day,
      dateStr,
      classes: {
        'today': dateStr === todayStr,
        'selected': dateStr === selectedDate.value,
        'past-date': cellDate < todayStart,
        'important': props.importantDays.includes(dateStr),
        'special': props.specialDays.includes(dateStr),
      },
      isPast: cellDate < todayStart,
      isImportant: props.importantDays.includes(dateStr),
      isSpecial: props.specialDays.includes(dateStr),
      dots: props.taskDatesMap[dateStr] || [],
    })
    idx++
  }

  // Next month padding
  const remaining = 42 - idx
  for (let day = 1; day <= remaining; day++) {
    result.push({
      key: `next-${day}`,
      day,
      classes: { 'other-month': true, 'empty': true },
      isPast: false,
      dateStr: '',
      dots: [],
    })
  }

  return result
})

function selectDate(cell) {
  if (!cell.dateStr) return
  selectedDate.value = cell.dateStr
  emit('selectDate', cell.dateStr)
}

function clearSelection() {
  selectedDate.value = null
}

defineExpose({ clearSelection })

function flipMonth(delta) {
  if (isFlipping.value) return
  isFlipping.value = true

  setTimeout(() => {
    currentMonth.value += delta
    if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++ }
    if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value-- }

    selectedDate.value = null

    setTimeout(() => {
      isFlipping.value = false
    }, 380)
  }, 200)
}

function goToToday() {
  if (currentMonth.value !== today.getMonth() || currentYear.value !== today.getFullYear()) {
    currentMonth.value = today.getMonth()
    currentYear.value = today.getFullYear()
  }
  selectedDate.value = todayStr
  emit('selectDate', todayStr)
}

function onKeyDown(e) {
  if (e.key === 'ArrowLeft') flipMonth(-1)
  if (e.key === 'ArrowRight') flipMonth(1)
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<style>
/* ===== Calendar-scoped theme variables ===== */
.calendar-wrapper {
  --cal-page-bg: #fffef9;
  --cal-page-bg-2: #fffdf5;
  --cal-page-glow: transparent;
  --cal-page-shadow: rgba(0,0,0,0.12);
  --cal-page-shadow-warm: rgba(0,0,0,0.08);
  --cal-text-color: #2c2418;
  --cal-text-light: #999;
  --cal-text-muted: #c0b8a8;
  --cal-cell-hover: #f5f0e8;
  --cal-today-ring: #4A90D9;
  --cal-selected-bg: #4A90D9;
  --cal-grid-border: #e8e0d4;
  --cal-stand-color: #c8b898;
  --cal-stand-color-2: #b8a888;
  --cal-coil-color: #b8b0a0;
  --cal-coil-highlight: #d5cebe;
  --cal-cat-study: #4A90D9;
  --cal-cat-life: #5CB85C;
  --cal-cat-work: #F5A623;
  --cal-cat-club: #9B59B6;
  --cal-overdue-dot: #e05555;
}

[data-theme="evening"] .calendar-wrapper {
  --cal-page-bg: #fff7ed;
  --cal-page-bg-2: #fff3e0;
  --cal-page-glow: linear-gradient(135deg, rgba(255,180,100,0.25) 0%, rgba(255,160,80,0.12) 35%, rgba(220,170,130,0.05) 60%, transparent 80%);
  --cal-page-shadow: rgba(180,120,60,0.2);
  --cal-page-shadow-warm: rgba(200,140,80,0.15);
  --cal-text-color: #4a3028;
  --cal-text-light: #a08878;
  --cal-text-muted: #c8b0a0;
  --cal-cell-hover: #fef0e0;
  --cal-today-ring: #d4956b;
  --cal-selected-bg: #d4956b;
  --cal-grid-border: #e8d8c8;
  --cal-stand-color: #c09870;
  --cal-stand-color-2: #a07850;
  --cal-coil-color: #c0a888;
  --cal-coil-highlight: #e0c8a0;
  --cal-cat-study: #5a9fd9;
  --cal-cat-life: #6cbf6c;
  --cal-cat-work: #f5a833;
  --cal-cat-club: #a56bc6;
}

[data-theme="night"] .calendar-wrapper {
  --cal-page-bg: #d8d6e0;
  --cal-page-bg-2: #d2d0db;
  --cal-page-glow: transparent;
  --cal-page-shadow: rgba(0,0,0,0.5);
  --cal-page-shadow-warm: rgba(0,0,0,0.35);
  --cal-text-color: #1e1e2e;
  --cal-text-light: #7a7a90;
  --cal-text-muted: #b0b0c0;
  --cal-cell-hover: #ccc9d6;
  --cal-today-ring: #6a8ec4;
  --cal-selected-bg: #6a8ec4;
  --cal-grid-border: #c8c6d2;
  --cal-stand-color: #8888a0;
  --cal-stand-color-2: #707088;
  --cal-coil-color: #9090a0;
  --cal-coil-highlight: #a0a0b0;
  --cal-cat-study: #5a9fe9;
  --cal-cat-life: #6cc86c;
  --cal-cat-work: #f5b633;
  --cal-cat-club: #ab6bc6;
}
</style>

<style scoped>
/* ===== 3D Scene ===== */
.calendar-scene {
  position: relative;
  z-index: 1;
  perspective: 1200px;
  perspective-origin: 50% 45%;
}

/* ===== Calendar Body (tilted) ===== */
.calendar-body {
  position: relative;
  transform: rotateX(15deg);
  transform-style: preserve-3d;
  transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

.calendar-body.flipping {
  transform: rotateX(80deg);
}

/* ===== Spiral Coils ===== */
.spiral-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: -6px;
  position: relative;
  z-index: 3;
  padding: 0 20px;
}

.spiral-ring {
  width: 14px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid var(--cal-coil-color);
  background: linear-gradient(180deg, var(--cal-coil-highlight) 0%, var(--cal-coil-color) 40%, var(--cal-coil-highlight) 100%);
  flex-shrink: 0;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== Calendar Page ===== */
.calendar-page {
  position: relative;
  width: 720px;
  background: linear-gradient(175deg, var(--cal-page-bg) 0%, var(--cal-page-bg-2) 100%);
  border-radius: 4px 4px 12px 12px;
  box-shadow:
    0 2px 4px rgba(0,0,0,0.06),
    0 8px 24px var(--cal-page-shadow),
    0 20px 50px var(--cal-page-shadow-warm);
  overflow: clip;
  transform-style: preserve-3d;
  transition: background 0.8s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Sunset glow overlay */
.calendar-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--cal-page-glow);
  pointer-events: none;
  z-index: 1;
  transition: background 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: inherit;
}

/* Tear-off perforation */
.calendar-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 6px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 4px,
    rgba(0,0,0,0.06) 4px,
    rgba(0,0,0,0.06) 6px
  );
  z-index: 3;
  pointer-events: none;
}

/* ===== Month Header ===== */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 32px 14px;
  user-select: none;
  position: relative;
  z-index: 2;
}

.month-title {
  font-family: "Noto Serif SC", serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--cal-text-color);
  letter-spacing: 3px;
  transition: color 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  white-space: nowrap;
}

.month-title:hover {
  opacity: 0.7;
}

.month-title.edit-mode {
  cursor: default;
  opacity: 1;
}

.title-input {
  width: 72px;
  padding: 2px 6px;
  font-family: "Noto Serif SC", serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--cal-text-color);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--cal-selected-bg);
  border-radius: 0;
  outline: none;
  text-align: center;
  letter-spacing: 3px;
  transition: border-color 0.2s ease;
  -moz-appearance: textfield;
}

.title-input::-webkit-outer-spin-button,
.title-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.month-nav {
  display: flex;
  gap: 4px;
}

.month-nav button {
  width: 34px;
  height: 34px;
  border: 1.5px solid var(--cal-grid-border);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  color: var(--cal-text-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.month-nav button:hover {
  background: var(--cal-cell-hover);
  border-color: var(--cal-text-light);
}

.month-nav button:active {
  transform: scale(0.92);
}

.today-btn {
  width: auto !important;
  padding: 0 14px;
  border-radius: 17px !important;
  font-size: 12px !important;
  font-family: inherit;
  letter-spacing: 1px;
}

/* ===== Weekday Row ===== */
.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--cal-text-light);
  letter-spacing: 1px;
  margin-bottom: 4px;
  transition: color 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 2;
}

.weekday-row span:first-child,
.weekday-row span:last-child {
  color: #d4956b;
}

/* ===== Calendar Grid ===== */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 20px 20px;
  gap: 2px;
}

/* ===== Cell ===== */
.calendar-cell {
  position: relative;
  aspect-ratio: 1 / 0.85;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 2px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s ease;
  user-select: none;
  min-height: 68px;
  transform-style: preserve-3d;
}

.calendar-cell:hover {
  background: var(--cal-cell-hover);
}

.calendar-cell.empty {
  cursor: default;
  pointer-events: none;
}

.cell-date {
  font-size: 14px;
  font-weight: 500;
  color: var(--cal-text-color);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  position: relative;
  z-index: 3;
  flex-shrink: 0;
}

/* Today */
.calendar-cell.today .cell-date {
  color: var(--cal-today-ring);
  font-weight: 700;
  box-shadow: inset 0 0 0 2px var(--cal-today-ring);
}

/* Selected */
.calendar-cell.selected .cell-date {
  background: var(--cal-selected-bg);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(74,144,217,0.35);
}

/* Other-month */
.calendar-cell.other-month .cell-date {
  color: var(--cal-text-muted);
  font-weight: 400;
}

/* Overdue mark */
.calendar-cell.has-overdue::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cal-overdue-dot);
  z-index: 2;
}

/* Crayon X */
.calendar-cell .crayon-x {
  position: absolute;
  inset: 5px;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  pointer-events: none;
  z-index: 2;
  opacity: 0.85;
}

/* Crayon Heart */
.calendar-cell .crayon-heart {
  position: absolute;
  inset: 5px;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  pointer-events: none;
  z-index: 2;
  opacity: 0.85;
}

/* Crayon Circle */
.calendar-cell .crayon-circle {
  position: absolute;
  inset: 5px;
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  pointer-events: none;
  z-index: 2;
  opacity: 0.85;
}

/* Color Dots */
.cell-dots {
  display: flex;
  gap: 3px;
  margin-top: 2px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 60px;
}

.cell-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cell-dot.study { background: var(--cal-cat-study); }
.cell-dot.life  { background: var(--cal-cat-life); }
.cell-dot.work  { background: var(--cal-cat-work); }
.cell-dot.club  { background: var(--cal-cat-club); }

.cell-dots-overflow {
  font-size: 9px;
  color: var(--cal-text-light);
  font-weight: 600;
  letter-spacing: 0;
}

/* Flip overlay */
.flip-overlay {
  position: absolute;
  inset: 0;
  background: var(--cal-page-bg);
  border-radius: inherit;
  pointer-events: none;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.calendar-body.flipping .flip-overlay {
  opacity: 1;
}

/* ===== Base Stand ===== */
.calendar-stand {
  position: relative;
  margin: -4px auto 0;
  width: 640px;
  height: 32px;
  transform: rotateX(-8deg);
  transform-origin: top center;
  background: linear-gradient(180deg, var(--cal-stand-color) 0%, var(--cal-stand-color-2) 100%);
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.calendar-stand::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 8px;
  background: rgba(0,0,0,0.15);
  border-radius: 50%;
  filter: blur(6px);
  transition: background 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

</style>
