<script setup>
import { ref, onMounted, computed, onUnmounted, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../api/supabaseClient'
import QuestionCard from '../../components/student/QuestionCard/QuestionCard.vue'
import { OhVueIcon, addIcons } from "oh-vue-icons"
import { 
  RiLockPasswordLine, 
  RiLoader4Line, 
  RiErrorWarningLine, 
  RiArrowLeftLine, 
  RiArrowRightLine, 
  RiSendPlaneLine, 
  RiBookOpenLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiCloseCircleLine,
  RiQuestionMark,
  RiPlayCircleLine,
  RiShieldCheckLine
} from "oh-vue-icons/icons"
import './StudentDashboard.css'

addIcons(
  RiLockPasswordLine, 
  RiLoader4Line, 
  RiErrorWarningLine, 
  RiArrowLeftLine, 
  RiArrowRightLine, 
  RiSendPlaneLine, 
  RiBookOpenLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiCloseCircleLine,
  RiQuestionMark,
  RiPlayCircleLine,
  RiShieldCheckLine
)

const emit = defineEmits(['update:timeLeft'])
const router = useRouter()
const student = ref(null)
const tests = ref([])
const loading = ref(true)
const errorMsg = ref('')

const isStarted = ref(false)
const currentIndex = ref(0)
const answers = ref({})
const timeLeftSeconds = ref(45 * 60)
const timerInterval = ref(null)
const isSubmitted = ref(false)

const showConfirmModal = ref(false)

const notification = ref({
  show: false,
  message: '',
  type: 'info'
})

const showNotification = (message, type = 'info') => {
  notification.value = { show: true, message, type }
  setTimeout(() => {
    notification.value.show = false
  }, 4000)
}

onMounted(async () => {
  const storedStudent = localStorage.getItem('currentStudent')
  if (!storedStudent) {
    router.push('/student-login')
    return
  }
  
  student.value = JSON.parse(storedStudent)

  try {
    const { data: freshStudent, error } = await supabase
      .from('students')
      .select('id, is_submitted, level, assigned_questions, full_name, student_id')
      .eq('id', student.value.id)
      .maybeSingle()

    if (!error && freshStudent) {
      student.value = freshStudent
      localStorage.setItem('currentStudent', JSON.stringify(student.value))
    }
  } catch (err) {
    console.error("Error updating student status:", err)
  }

  if (student.value.is_submitted) {
    isSubmitted.value = true
    loading.value = false
    return
  }

  await fetchAssignedTests()
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

const startExam = () => {
  isStarted.value = true
  startTimer()
  showNotification("Exam successfully started! Good luck.", "success")
}

const fetchAssignedTests = async () => {
  try {
    loading.value = true
    
    const assignedIds = student.value.assigned_questions

    if (!assignedIds || assignedIds.length === 0) {
      throw new Error("Sizga hali savollar biriktirilmagan! Administratorga murojaat qiling.")
    }

    // Determine correct table based on student level
    const tableName = student.value.level === 'elementary' ? 'elementary_tests' : 'beginner_tests'

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .in('id', assignedIds)

    if (error) throw error

    if (!data || data.length === 0) {
      throw new Error("Biriktirilgan savollar bazadan topilmadi.")
    }

    tests.value = assignedIds.map(id => data.find(q => q.id === id)).filter(Boolean)

  } catch (err) {
    errorMsg.value = "Failed to load questions: " + err.message
    showNotification("Could not load questions.", "error")
  } finally {
    loading.value = false
  }
}

const startTimer = () => {
  emit('update:timeLeft', formattedTime.value)

  timerInterval.value = setInterval(() => {
    if (timeLeftSeconds.value > 0) {
      timeLeftSeconds.value--
      emit('update:timeLeft', formattedTime.value)
    } else {
      clearInterval(timerInterval.value)
      executeAutoSubmit("Time's up! Exam automatically saved and submitted.")
    }
  }, 1000)
}

const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeftSeconds.value / 60)
  const seconds = timeLeftSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const currentQuestion = computed(() => {
  return tests.value[currentIndex.value] || null
})

const nextQuestion = () => {
  if (currentIndex.value < tests.value.length - 1) {
    currentIndex.value++
  }
}

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const submitTest = () => {
  if (isSubmitted.value) return
  showConfirmModal.value = true
}

const confirmSubmission = () => {
  showConfirmModal.value = false
  executeAutoSubmit("Exam successfully submitted!")
}

const cancelSubmission = () => {
  showConfirmModal.value = false
}

const executeAutoSubmit = async (alertMessage) => {
  if (isSubmitted.value) return

  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  emit('update:timeLeft', null)

  let correctCount = 0
  let wrongCount = 0
  let totalChecked = 0

  tests.value.forEach(test => {
    if (test.correct_answer) {
      totalChecked++
      const studentAns = answers.value[test.id] ? String(answers.value[test.id]).trim().toLowerCase() : ''
      const realAns = String(test.correct_answer).trim().toLowerCase()
      
      if (studentAns === realAns) {
        correctCount++
      } else {
        wrongCount++
      }
    }
  })

  const finalScore = totalChecked > 0 ? Math.round((correctCount / totalChecked) * 100) : 0

  const resultPayload = {
    total: totalChecked,
    correct: correctCount,
    wrong: wrongCount,
    percentage: finalScore,
    student_answers: answers.value
  }

  isSubmitted.value = true

  try {
    await supabase
      .from('students')
      .update({ is_submitted: true })
      .eq('id', student.value.id)

    const { error: resultError } = await supabase
      .from('results')
      .upsert([
        {
          student_id: student.value.id,
          student_name: student.value.full_name || 'Nomaʼlum',
          student_code: student.value.student_id || 'N/A',
          level: student.value.level || 'beginner',
          score: finalScore,
          correct_answers: correctCount,
          wrong_answers: wrongCount,
          exam_result: resultPayload
        }
      ], { onConflict: 'student_id' })

    if (resultError) throw resultError

    student.value.is_submitted = true
    localStorage.setItem('currentStudent', JSON.stringify(student.value))
    
    if (alertMessage) {
      showNotification(alertMessage, "success")
    }

  } catch (err) {
    console.error("Error saving result to results table:", err.message)
    showNotification("Exam completed, but failed to save results.", "error")
  }
}

const handleLogout = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  localStorage.removeItem('currentStudent')
  router.push('/student-login')
}
</script>

<template>
  <div class="ia-student-dashboard">
    <transition name="toast">
      <div v-if="notification.show" class="ia-toast-notification" :class="notification.type">
        <OhVueIcon v-if="notification.type === 'success'" name="ri-checkbox-circle-line" class="ia-toast-icon success" />
        <OhVueIcon v-else-if="notification.type === 'error'" name="ri-close-circle-line" class="ia-toast-icon error" />
        <OhVueIcon v-else name="ri-information-line" class="ia-toast-icon info" />
        <span>{{ notification.message }}</span>
      </div>
    </transition>

    <transition name="modal-fade">
      <div v-if="showConfirmModal" class="ia-modal-backdrop">
        <div class="ia-modal-card">
          <div class="ia-modal-icon-wrapper">
            <OhVueIcon name="ri-question-mark" scale="1.8" />
          </div>
          <h3>Finish the Exam?</h3>
          <p>Are you sure you want to submit your answers? Once confirmed, you will not be able to change them.</p>
          <div class="ia-modal-actions">
            <button @click="cancelSubmission" class="ia-modal-btn cancel">Continue Exam</button>
            <button @click="confirmSubmission" class="ia-modal-btn confirm">Yes, Submit</button>
          </div>
        </div>
      </div>
    </transition>

    <main class="ia-dashboard-main">
      <div v-if="isSubmitted" class="ia-result-card">
        <div class="ia-lock-icon-wrapper">
          <OhVueIcon name="ri-lock-password-line" scale="2" class="ia-lock-icon" />
        </div>
        <h2>Exam Completed!</h2>
        <p class="ia-result-subtitle">
          You have successfully completed this exam. For security reasons, the session is now closed and your results have been sent to your instructor.
        </p>
        <button @click="handleLogout" class="ia-logout-btn">Log Out</button>
      </div>

      <div v-else-if="loading" class="ia-state-container">
        <OhVueIcon name="ri-loader-4-line" scale="2" class="ia-spinner" />
        <p>Loading exam session...</p>
      </div>

      <div v-else-if="errorMsg" class="ia-state-container error">
        <OhVueIcon name="ri-error-warning-line" scale="2" class="ia-error-icon" />
        <p>{{ errorMsg }}</p>
      </div>

      <div v-else-if="tests.length === 0" class="ia-state-container">
        <OhVueIcon name="ri-error-warning-line" scale="2" class="ia-error-icon" />
        <p>No questions are currently available for your profile.</p>
      </div>

      <div v-else-if="!isStarted" class="ia-rules-card">
        <div class="ia-rules-icon-wrapper">
          <OhVueIcon name="ri-book-open-line" scale="1.6" class="ia-rules-icon" />
        </div>
        <h2>Exam Rules & Guidelines</h2>
        <p class="ia-rules-desc">Please review the following guidelines before starting the test:</p>
        
        <ul class="ia-rules-list">
          <li>
            <OhVueIcon name="ri-shield-check-line" class="ia-rule-check" /> 
            <span><strong>Time Limit:</strong> You have 45 minutes to complete the exam.</span>
          </li>
          <li>
            <OhVueIcon name="ri-shield-check-line" class="ia-rule-check" /> 
            <span><strong>Auto-Submit:</strong> Once the timer expires, your answers will be automatically submitted.</span>
          </li>
          <li>
            <OhVueIcon name="ri-shield-check-line" class="ia-rule-check" /> 
            <span><strong>Single Attempt:</strong> Re-entering or modifying answers after submission is restricted.</span>
          </li>
          <li>
            <OhVueIcon name="ri-shield-check-line" class="ia-rule-check" /> 
            <span><strong>Navigation:</strong> You can freely move back and forth between questions.</span>
          </li>
        </ul>

        <button @click="startExam" class="ia-start-exam-btn">
          <span>Got it, Start Exam</span>
          <OhVueIcon name="ri-play-circle-line" scale="1.1" />
        </button>
      </div>

      <div v-else class="ia-exam-container">
        <div class="ia-exam-header-info">
          <div class="ia-progress-meta">
            <span>Question <strong>{{ currentIndex + 1 }}</strong> / {{ tests.length }}</span>
            <span class="ia-progress-percentage">{{ Math.round(((currentIndex + 1) / tests.length) * 100) }}%</span>
          </div>
          <div class="ia-progress-track">
            <div 
              class="ia-progress-fill" 
              :style="{ width: `${((currentIndex + 1) / tests.length) * 100}%` }"
            ></div>
          </div>
        </div>

        <div class="ia-question-wrapper">
          <QuestionCard 
            v-if="currentQuestion"
            :questionData="currentQuestion"
            :questionNumber="currentIndex + 1"
            v-model="answers[currentQuestion.id]"
          />
        </div>

        <div class="ia-exam-navigation">
          <button @click="prevQuestion" :disabled="currentIndex === 0" class="ia-nav-btn secondary">
            <OhVueIcon name="ri-arrow-left-line" /> Previous
          </button>

          <button v-if="currentIndex < tests.length - 1" @click="nextQuestion" class="ia-nav-btn primary">
            Next <OhVueIcon name="ri-arrow-right-line" />
          </button>

          <button v-else @click="submitTest" class="ia-nav-btn success">
            Submit <OhVueIcon name="ri-send-plane-line" />
          </button>
        </div>
      </div>
    </main>
  </div>
</template>