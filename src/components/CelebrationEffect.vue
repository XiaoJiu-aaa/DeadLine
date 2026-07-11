<template>
  <canvas class="celebration-canvas" ref="canvasRef" :width="w" :height="h"></canvas>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  trigger: { type: Number, default: 0 },
})
const emit = defineEmits(['done'])

const canvasRef = ref(null)
const w = ref(window.innerWidth)
const h = ref(window.innerHeight)

let particles = []
let raf = null

function resize() {
  w.value = window.innerWidth
  h.value = window.innerHeight
}

function getTheme() {
  return document.body.getAttribute('data-theme') || 'day'
}

const COLORS = [
  '#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d',
  '#43aa8b', '#577590', '#277da1', '#f9844a', '#e63946',
  '#ffb703', '#8ecae6', '#219ebc', '#fb8500', '#ff006e',
  '#8338ec', '#3a86ff', '#ffbe0b', '#06d6a0', '#ef476f',
]
const FIREWORK_COLORS = ['#ff6b6b','#ffd93d','#ff8c42','#ffda77','#ff4757','#ffa502','#ff6348','#eccc68','#ff9a76','#f6d365']

function rnd(min, max) { return Math.random() * (max - min) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function spawnConfettiBurst(cx, cy, spreadAngle, count) {
  for (let i = 0; i < count; i++) {
    const angle = spreadAngle + rnd(-0.8, 0.8)
    const speed = rnd(6, 22)
    particles.push({
      type: 'confetti',
      x: cx + rnd(-15, 15),
      y: cy + rnd(-15, 15),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: rnd(8, 18),
      h: rnd(5, 12),
      color: pick(COLORS),
      rotation: rnd(0, Math.PI * 2),
      rotSpeed: rnd(-0.2, 0.2),
      opacity: 1,
      gravity: 0.12,
      fadeStart: false,
    })
  }
}

function spawnFirework() {
  const cx = rnd(w.value * 0.12, w.value * 0.88)
  const cy = rnd(h.value * 0.1, h.value * 0.45)
  const color = pick(FIREWORK_COLORS)
  const count = Math.floor(rnd(120, 200))

  // Central flash — large, brief glow
  particles.push({
    type: 'flash',
    x: cx, y: cy,
    color,
    radius: rnd(30, 55),
    life: 1,
    decay: 0.04,
  })

  for (let i = 0; i < count; i++) {
    const angle = rnd(0, Math.PI * 2)
    const speed = rnd(2, 14)
    particles.push({
      type: 'firework',
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: Math.random() < 0.3 ? '#fff' : color,
      radius: rnd(2, 6),
      life: 1,
      decay: rnd(0.005, 0.015),
      gravity: 0.06,
      trail: [],
    })
  }
}

function animate() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w.value, h.value)

  particles = particles.filter(p => {
    if (p.type === 'confetti') return p.opacity > 0
    return (p.life !== undefined && p.life > 0)
  })

  for (const p of particles) {
    if (p.type === 'confetti') {
      p.vy += p.gravity
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.997
      p.rotation += p.rotSpeed

      // Fade out when near bottom or off-screen
      if (p.y > h.value - 40 && !p.fadeStart) p.fadeStart = true
      if (p.fadeStart) p.opacity -= 0.012
      if (p.y > h.value + 50 || p.x < -50 || p.x > w.value + 50) p.opacity = 0

      ctx.save()
      ctx.globalAlpha = Math.max(0, p.opacity)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      // Draw with a slight shadow for pop
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    } else if (p.type === 'firework') {
      p.vx *= 0.985
      p.vy += p.gravity
      p.x += p.vx
      p.y += p.vy
      p.life -= p.decay
      p.trail.push({ x: p.x, y: p.y, life: p.life })
      if (p.trail.length > 14) p.trail.shift()

      // Glow under particle
      ctx.globalAlpha = Math.max(0, p.life * 0.25)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()

      // Trail
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i]
        const alpha = (i / p.trail.length) * p.life * 0.6
        if (alpha <= 0) continue
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(t.x, t.y, p.radius * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }

      // Core particle
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
    } else if (p.type === 'flash') {
      p.life -= p.decay
      if (p.life <= 0) continue
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
      gradient.addColorStop(0, p.color)
      gradient.addColorStop(0.4, p.color + 'cc')
      gradient.addColorStop(1, 'transparent')
      ctx.globalAlpha = Math.max(0, p.life * 0.7)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }
  }

  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  if (particles.length > 0) {
    raf = requestAnimationFrame(animate)
  } else {
    ctx.clearRect(0, 0, w.value, h.value)
  }
}

function start() {
  if (raf) cancelAnimationFrame(raf)
  particles = []
  const theme = getTheme()

  if (theme === 'night') {
    spawnFirework()
    setTimeout(() => spawnFirework(), 180)
    setTimeout(() => spawnFirework(), 360)
    setTimeout(() => { spawnFirework(); spawnFirework() }, 550)
    setTimeout(() => spawnFirework(), 750)
    setTimeout(() => spawnFirework(), 950)
    setTimeout(() => { spawnFirework(); spawnFirework() }, 1200)
    setTimeout(() => spawnFirework(), 1500)
  } else {
    // Confetti cannons: multiple bursts from bottom area firing upward
    const cx = w.value / 2
    const by = h.value - 60
    // Left cannon
    spawnConfettiBurst(cx - 160, by, -Math.PI * 0.55, 60)
    // Right cannon
    spawnConfettiBurst(cx + 160, by, -Math.PI * 0.45, 60)
    // Center cannon (delayed)
    setTimeout(() => spawnConfettiBurst(cx, by - 40, -Math.PI * 0.5, 60), 150)
    // Side cannons (more delayed)
    setTimeout(() => spawnConfettiBurst(cx - 300, by - 20, -Math.PI * 0.6, 40), 350)
    setTimeout(() => spawnConfettiBurst(cx + 300, by - 20, -Math.PI * 0.4, 40), 350)
    // Third wave
    setTimeout(() => spawnConfettiBurst(cx, by - 60, -Math.PI * 0.5, 80), 600)
  }

  raf = requestAnimationFrame(animate)
  const duration = theme === 'night' ? 7000 : 6000
  setTimeout(() => {
    if (raf) cancelAnimationFrame(raf)
    raf = null
    particles = []
    const canvas = canvasRef.value
    if (canvas) canvas.getContext('2d').clearRect(0, 0, w.value, h.value)
    emit('done')
  }, duration)
}

watch(() => props.trigger, (v) => {
  if (v > 0) start()
})

window.addEventListener('resize', resize)
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<style scoped>
.celebration-canvas {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}
</style>
