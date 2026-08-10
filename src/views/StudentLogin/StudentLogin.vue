<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../api/supabaseClient'
import logo from '../../assets/logo.png'
import { OhVueIcon, addIcons } from "oh-vue-icons"
import { 
  RiUserLine, 
  RiArrowRightLine, 
  RiErrorWarningLine,
  RiLoader4Line 
} from "oh-vue-icons/icons"
import './StudentLogin.css'

addIcons(
  RiUserLine, 
  RiArrowRightLine, 
  RiErrorWarningLine,
  RiLoader4Line
)

const router = useRouter()
const studentIdNumber = ref('') // Faqat raqamlar qismi uchun
const error = ref('')
const loading = ref(false)

const canvasRef = ref(null)
let animationFrameId = null

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  
  let width = canvas.width = window.innerWidth
  let height = canvas.height = window.innerHeight

  const handleResize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', handleResize)

  // Kursor koordinatalari va ta'sir doirasi
  const mouse = {
    x: null,
    y: null,
    radius: 170
  }

  const handleMouseMove = (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  }

  const handleMouseOut = () => {
    mouse.x = null
    mouse.y = null
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseout', handleMouseOut)

  // Logotip ranglari palitrasi
  const particleColors = ['#343c98', '#f97316', '#4f46e5', '#fb923c', '#2563eb', '#ea580c']
  const particlesArray = []
  
  const numberOfParticles = Math.floor((width * height) / 4500)

  class Particle {
    constructor() {
      this.x = Math.random() * width
      this.y = Math.random() * height
      this.size = Math.random() * 2.5 + 1
      this.baseX = this.x
      this.baseY = this.y
      this.density = (Math.random() * 30) + 5
      this.vx = (Math.random() - 0.5) * 0.8
      this.vy = (Math.random() - 0.5) * 0.8
      this.color = particleColors[Math.floor(Math.random() * particleColors.length)]
    }

    draw() {
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
    }

    update() {
      this.x += this.vx
      this.y += this.vy

      if (this.x < 0 || this.x > width) this.vx = -this.vx
      if (this.y < 0 || this.y > height) this.vy = -this.vy

      if (mouse.x !== null && mouse.y !== null) {
        let dx = mouse.x - this.x
        let dy = mouse.y - this.y
        let distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < mouse.radius) {
          let force = (mouse.radius - distance) / mouse.radius
          let angle = Math.atan2(dy, dx)
          this.x -= Math.cos(angle) * force * (this.density * 0.5)
          this.y -= Math.sin(angle) * force * (this.density * 0.5)
        }
      }
    }
  }

  for (let i = 0; i < numberOfParticles; i++) {
    particlesArray.push(new Particle())
  }

  const connect = () => {
    for (let a = 0; a < particlesArray.length; a++) {
      for (let b = a + 1; b < particlesArray.length; b++) {
        let dx = particlesArray[a].x - particlesArray[b].x
        let dy = particlesArray[a].y - particlesArray[b].y
        let distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 110) {
          let opacityValue = 1 - (distance / 110)
          ctx.strokeStyle = `rgba(52, 60, 152, ${opacityValue * 0.15})`
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
          ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
          ctx.stroke()
        }
      }

      if (mouse.x !== null && mouse.y !== null) {
        let mDx = mouse.x - particlesArray[a].x
        let mDy = mouse.y - particlesArray[a].y
        let mDistance = Math.sqrt(mDx * mDx + mDy * mDy)

        if (mDistance < 150) {
          let mOpacity = 1 - (mDistance / 150)
          ctx.strokeStyle = `rgba(249, 115, 22, ${mOpacity * 0.3})`
          ctx.lineWidth = 0.9
          ctx.beginPath()
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
      }
    }
  }

  const animate = () => {
    ctx.clearRect(0, 0, width, height)
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update()
      particlesArray[i].draw()
    }
    connect()
    animationFrameId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseout', handleMouseOut)
    cancelAnimationFrame(animationFrameId)
  })
})

// Faqat raqam kiritilishini ta'minlash
const handleInput = (e) => {
  studentIdNumber.value = e.target.value.replace(/\D/g, '')
}

const handleStudentLogin = async () => {
  error.value = ''
  
  if (!studentIdNumber.value.trim()) {
    error.value = "Please enter your Student ID number."
    return
  }

  const fullStudentId = `IA-${studentIdNumber.value.trim()}`
  loading.value = true

  try {
    const { data: student, error: dbError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', fullStudentId)
      .single()

    if (dbError || !student) {
      throw new Error("Student ID not found. Please check and try again.")
    }

    localStorage.setItem('currentStudent', JSON.stringify(student))
    router.push('/student-dashboard')

  } catch (err) {
    error.value = err.message || "An error occurred during sign in. Please try again."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="ia-login-wrapper">
    <!-- Particles Canvas -->
    <canvas ref="canvasRef" class="ia-particles-canvas"></canvas>

    <div class="ia-login-bg-shape shape-1"></div>
    <div class="ia-login-bg-shape shape-2"></div>

    <div class="ia-login-card-container">
      <form @submit.prevent="handleStudentLogin" class="ia-login-card">
        
        <!-- Brand Header -->
        <div class="ia-login-header">
          <div class="ia-login-logo-box">
            <img :src="logo" alt="Intellect Academy Logo" class="ia-login-logo-img" />
          </div>
          <h1>Intellect Academy</h1>
          <p>Level Assessment Portal</p>
        </div>

        <!-- Error Alert -->
        <transition name="ia-fade-down">
          <div v-if="error" class="ia-error-alert">
            <OhVueIcon name="ri-error-warning-line" class="ia-error-icon" />
            <span>{{ error }}</span>
          </div>
        </transition>

        <!-- Form Fields -->
        <div class="ia-form-fields">
          <div class="ia-form-group">
            <label for="studentId">Student ID</label>
            <div class="ia-input-wrapper ia-id-input-box">
              <OhVueIcon name="ri-user-line" class="ia-field-icon" />
              <div class="ia-id-prefix-wrapper">
                <span class="ia-id-prefix">IA-</span>
                <input 
                  id="studentId"
                  type="text" 
                  inputmode="numeric"
                  :value="studentIdNumber"
                  @input="handleInput"
                  required 
                  placeholder="1234" 
                  autocomplete="username"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button type="submit" class="ia-submit-btn" :disabled="loading">
          <template v-if="loading">
            <OhVueIcon name="ri-loader-4-line" class="ia-spinner-icon" />
            <span>Verifying ID...</span>
          </template>
          <template v-else>
            <span>Sign In</span>
            <OhVueIcon name="ri-arrow-right-line" class="ia-btn-arrow" />
          </template>
        </button>

        <!-- Footer Help -->
        <div class="ia-login-footer-note">
          <p>Having trouble signing in? Contact your administrator.</p>
        </div>

      </form>
    </div>
  </div>
</template>