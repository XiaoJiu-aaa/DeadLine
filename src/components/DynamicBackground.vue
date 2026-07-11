<template>
  <div class="dynamic-bg">
    <!-- Theme Slider -->
    <div v-if="props.showThemeSlider" class="theme-slider" ref="themeSlider">
      <div class="slider-thumb" ref="sliderThumb"></div>
      <button
        v-for="opt in themes"
        :key="opt.key"
        class="slider-option"
        @click="setTheme(opt.key)"
        :aria-label="opt.label"
        v-html="opt.icon"
      ></button>
    </div>

    <!-- Light Beams (day/evening) -->
    <div class="beams-container" :style="{ opacity: beamOpacity }">
      <div class="beam beam-1"></div>
      <div class="beam beam-2"></div>
      <div class="beam beam-3"></div>
    </div>

    <!-- Particles Canvas -->
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  showThemeSlider: { type: Boolean, default: true },
})

const canvas = ref(null)
const sliderThumb = ref(null)

const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
const sunsetIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42 1.42"/><path d="M7 18h10"/></svg>`
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`

const themes = [
  { key: 'day', icon: sunIcon, label: '白天' },
  { key: 'evening', icon: sunsetIcon, label: '傍晚' },
  { key: 'night', icon: moonIcon, label: '夜晚' },
]

const currentTheme = ref('day')
const beamOpacity = ref(1)
let particles = []
let animationId = null
let ctx = null

const thumbPositions = { day: 4, evening: 44, night: 84 }

function getAutoTheme() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'evening'
  return 'night'
}

function resizeCanvas() {
  const c = canvas.value
  if (!c) return
  const dpr = window.devicePixelRatio || 1
  c.width = window.innerWidth * dpr
  c.height = window.innerHeight * dpr
  c.style.width = window.innerWidth + 'px'
  c.style.height = window.innerHeight + 'px'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
}

function createParticles() {
  particles = []
  const w = window.innerWidth
  const h = window.innerHeight

  if (currentTheme.value === 'day') {
    for (let i = 0; i < 90; i++) {
      const bright = Math.random() < 0.15
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: bright ? Math.random() * 3.5 + 2 : Math.random() * 3 + 1.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -Math.random() * 0.5 - 0.15,
        opacity: bright ? Math.random() * 0.3 + 0.7 : Math.random() * 0.45 + 0.35,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2,
        color: bright
          ? `rgba(255, 235, 180, OPACITY)`
          : Math.random() < 0.7
            ? `rgba(235, 200, 150, OPACITY)`
            : `rgba(255, 225, 175, OPACITY)`,
      })
    }
  } else if (currentTheme.value === 'night') {
    for (let i = 0; i < 150; i++) {
      const bright = Math.random() < 0.08
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: bright ? Math.random() * 1.8 + 1.2 : Math.random() * 1.2 + 0.3,
        speedX: 0,
        speedY: 0,
        opacity: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.03 + 0.008,
        pulseOffset: Math.random() * Math.PI * 2,
        bright,
        color: bright
          ? `rgba(220, 230, 255, OPACITY)`
          : `rgba(180, 200, 240, OPACITY)`,
        rotationAngle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.00015,
        orbitRadius: Math.random() * 0.3 + 0.05,
      })
    }
  } else {
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 0.6,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: -Math.random() * 0.3 - 0.05,
        opacity: Math.random() * 0.35 + 0.1,
        pulseSpeed: Math.random() * 0.015 + 0.004,
        pulseOffset: Math.random() * Math.PI * 2,
        color: `rgba(200, 170, 180, OPACITY)`,
      })
    }
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1 + 0.3,
        speedX: 0,
        speedY: 0,
        opacity: Math.random() * 0.4 + 0.15,
        pulseSpeed: Math.random() * 0.02 + 0.006,
        pulseOffset: Math.random() * Math.PI * 2,
        bright: false,
        color: `rgba(170, 180, 220, OPACITY)`,
        rotationAngle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.00012,
        orbitRadius: Math.random() * 0.2 + 0.03,
      })
    }
  }
}

function updateParticles() {
  const w = window.innerWidth
  const h = window.innerHeight
  const now = Date.now()

  for (const p of particles) {
    if (currentTheme.value === 'day') {
      p.x += p.speedX + Math.sin(now * 0.0005 + p.pulseOffset) * 0.15
      p.y += p.speedY
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
      if (p.x < -10) p.x = w + 10
      if (p.x > w + 10) p.x = -10
    } else if (currentTheme.value === 'night') {
      p.rotationAngle += p.rotationSpeed
      p.x += Math.cos(p.rotationAngle) * p.orbitRadius
      p.y += Math.sin(p.rotationAngle) * p.orbitRadius
      if (p.x < -10) p.x = w + 10
      if (p.x > w + 10) p.x = -10
      if (p.y < -10) p.y = h + 10
      if (p.y > h + 10) p.y = -10
    } else {
      if (p.speedY) {
        p.x += p.speedX
        p.y += p.speedY
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
      } else {
        p.rotationAngle += p.rotationSpeed
        p.x += Math.cos(p.rotationAngle) * p.orbitRadius
        p.y += Math.sin(p.rotationAngle) * p.orbitRadius
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
      }
    }
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  const now = Date.now()

  for (const p of particles) {
    const pulse = Math.sin(now * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7
    const alpha = p.opacity * pulse
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = p.color.replace('OPACITY', alpha.toFixed(3))

    if (p.bright) {
      ctx.shadowColor = p.color.replace('OPACITY', '0.8')
      ctx.shadowBlur = 6
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }
    ctx.fill()
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

function animate() {
  updateParticles()
  drawParticles()
  animationId = requestAnimationFrame(animate)
}

function setTheme(theme) {
  currentTheme.value = theme
  document.body.setAttribute('data-theme', theme)
  beamOpacity.value = theme === 'night' ? 0 : theme === 'evening' ? 'var(--beam-opacity)' : ''
  createParticles()
  if (sliderThumb.value) {
    sliderThumb.value.style.left = thumbPositions[theme] + 'px'
  }
}

onMounted(() => {
  const c = canvas.value
  ctx = c.getContext('2d')
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Auto-detect theme from system time on first entry
  setTheme(getAutoTheme())

  createParticles()
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
/* ===== Theme Variables - mirrored from login.html ===== */
.dynamic-bg {
  --bg-from: #FFF5E6;
  --bg-to: #FFE0B2;
  --beam-color-1: rgba(255, 200, 120, 0.35);
  --beam-color-2: rgba(255, 180, 80, 0.25);
  --beam-color-3: rgba(255, 220, 150, 0.2);
  --card-bg: rgba(255, 255, 255, 0.72);
  --card-border: rgba(255, 255, 255, 0.5);
  --text-color: #3d2e1c;
  --text-secondary: #8a7560;
  --input-bg: rgba(255, 255, 255, 0.65);
  --input-border: rgba(180, 160, 140, 0.35);
  --input-focus-border: #e8a850;
  --btn-bg: linear-gradient(135deg, #e8a850, #d4893a);
  --btn-hover-bg: linear-gradient(135deg, #f0b860, #e09848);
  --accent: #e8a850;
  --accent-glow: rgba(232, 168, 80, 0.3);
  --error-color: #e05555;
  --shadow: 0 2px 24px rgba(0, 0, 0, 0.1);
  --particle-color: rgba(200, 160, 100, 0.7);
  --star-opacity: 0;
  --dust-opacity: 1;
  --transition-speed: 1.2s;
  --btn-text: #3d2e1c;
  --btn-circle: #f5d5a0;
  --btn-ring: rgba(255,255,255,0.8);
  --btn-active-ring: #f0c060;
}

[data-theme="evening"] .dynamic-bg {
  --bg-from: #e8c38a;
  --bg-to: #5b4a8a;
  --beam-color-1: rgba(255, 180, 120, 0.18);
  --beam-color-2: rgba(255, 160, 100, 0.12);
  --beam-color-3: rgba(200, 140, 200, 0.1);
  --card-bg: rgba(255, 255, 255, 0.68);
  --card-border: rgba(255, 255, 255, 0.4);
  --text-color: #3a2e40;
  --text-secondary: #7a6e80;
  --input-bg: rgba(255, 255, 255, 0.6);
  --input-border: rgba(160, 140, 170, 0.35);
  --input-focus-border: #9b7ec4;
  --btn-bg: linear-gradient(135deg, #9b7ec4, #7c5ea8);
  --btn-hover-bg: linear-gradient(135deg, #ab8ed4, #8c6eb8);
  --accent: #9b7ec4;
  --accent-glow: rgba(155, 126, 196, 0.3);
  --shadow: 0 2px 24px rgba(0, 0, 0, 0.12);
  --particle-color: rgba(180, 150, 180, 0.5);
  --star-opacity: 0.4;
  --dust-opacity: 0.5;
  --btn-text: #3a2e40;
  --btn-circle: #d5c0e8;
  --btn-ring: rgba(255,255,255,0.7);
  --btn-active-ring: #c9a0dc;
}

[data-theme="night"] .dynamic-bg {
  --bg-from: #08081a;
  --bg-to: #151535;
  --beam-color-1: transparent;
  --beam-color-2: transparent;
  --beam-color-3: transparent;
  --card-bg: rgba(255, 255, 255, 0.08);
  --card-border: rgba(255, 255, 255, 0.15);
  --text-color: #e0e0f0;
  --text-secondary: #9090b0;
  --input-bg: rgba(255, 255, 255, 0.08);
  --input-border: rgba(255, 255, 255, 0.15);
  --input-focus-border: #7b9ed4;
  --btn-bg: linear-gradient(135deg, #4a7ec4, #3a5e9a);
  --btn-hover-bg: linear-gradient(135deg, #5a8ed4, #4a6eaa);
  --accent: #7b9ed4;
  --accent-glow: rgba(123, 158, 212, 0.3);
  --shadow: 0 2px 32px rgba(0, 0, 0, 0.4);
  --particle-color: rgba(200, 210, 240, 0.8);
  --star-opacity: 1;
  --dust-opacity: 0;
  --btn-text: #e0e0f0;
  --btn-circle: #3a5e8a;
  --btn-ring: rgba(255,255,255,0.25);
  --btn-active-ring: #5a8ed4;
}

/* ===== Theme Slider ===== */
.theme-slider {
  position: fixed;
  top: 28px;
  right: 32px;
  z-index: 10;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 28px;
  padding: 4px;
  transition: background var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.slider-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  z-index: 0;
}

.slider-option {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  font-size: 15px;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
}

.slider-option:hover { transform: scale(1.15); }
.slider-option:active { transform: scale(0.9); }

.slider-option :deep(svg) {
  width: 18px;
  height: 18px;
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
  background: var(--card-bg);
  backdrop-filter: blur(8px);
  padding: 3px 10px;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  letter-spacing: 0.5px;
}

.slider-option:hover .tooltip { opacity: 1; }

/* ===== Light Beams ===== */
.beams-container {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  transition: opacity var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.beam {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  transition: opacity var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
              background var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

.beam-1 {
  width: 900px; height: 700px;
  top: -300px; left: -200px;
  background: var(--beam-color-1);
  animation: beamFloat1 12s ease-in-out infinite;
}

.beam-2 {
  width: 700px; height: 800px;
  top: -200px; right: -150px;
  background: var(--beam-color-2);
  animation: beamFloat2 15s ease-in-out infinite;
}

.beam-3 {
  width: 600px; height: 500px;
  bottom: -200px; left: 30%;
  background: var(--beam-color-3);
  animation: beamFloat3 10s ease-in-out infinite;
}

@keyframes beamFloat1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  33% { transform: translate(40px, -30px) rotate(3deg) scale(1.05); }
  66% { transform: translate(-20px, 20px) rotate(-2deg) scale(0.95); }
}

@keyframes beamFloat2 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  33% { transform: translate(-50px, 20px) rotate(-4deg) scale(1.08); }
  66% { transform: translate(30px, -40px) rotate(2deg) scale(0.93); }
}

@keyframes beamFloat3 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  50% { transform: translate(20px, -25px) rotate(3deg) scale(1.06); }
}

/* ===== Particle Canvas ===== */
canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
