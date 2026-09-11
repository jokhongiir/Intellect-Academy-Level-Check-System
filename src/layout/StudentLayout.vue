<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StudentNavbar from '../components/student/StudentNavbar/StudentNavbar.vue'
import StudentDashboard from '../views/StudentDashboard/StudentDashboard.vue'

const router = useRouter()
const currentStudent = ref(null)
const examTimeLeft = ref(null)

onMounted(() => {
  const stored = localStorage.getItem('currentStudent')

  if (!stored) {
    router.push('/student-login')
    return
  }

  try {
    currentStudent.value = JSON.parse(stored)
  } catch (err) {
    console.error('Student data parse error:', err)
    localStorage.removeItem('currentStudent')
    router.push('/student-login')
  }
})

const handleLogout = () => {
  localStorage.removeItem('currentStudent')
  router.push('/student-login')
}

const handleTimeUpdate = (newTime) => {
  examTimeLeft.value = newTime
}
</script>

<template>
  <div class="student-layout-container" v-if="currentStudent">
    <StudentNavbar
      :studentName="currentStudent.full_name"
      :level="currentStudent.level"
      :timeLeft="examTimeLeft"
      :onLogout="handleLogout"
    />

    <div class="student-body">
      <main class="student-content">
        <StudentDashboard @update:timeLeft="handleTimeUpdate" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.student-layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8fafc;
  overflow: hidden;
}

.student-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  justify-content: center;
}

.student-content {
  flex: 1;
  max-width: 900px;
  width: 100%;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
}
</style>