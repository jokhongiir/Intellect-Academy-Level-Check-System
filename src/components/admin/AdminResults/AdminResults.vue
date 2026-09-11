<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TrophyIcon,
  UserIcon,
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import './AdminResutls.css'

/* ===================== STATE ===================== */
const results = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedLevel = ref('all')

const showModal = ref(false)
const selectedStudent = ref(null)
const studentTests = ref([])
const loadingTests = ref(false)

const customAlert = ref({
  show: false,
  title: '',
  message: '',
  type: 'info',
  isConfirm: false,
  onConfirm: null
})

/* ===================== ALERT ===================== */
const showAlert = (title, message, type = 'info') => {
  customAlert.value = {
    show: true,
    title,
    message,
    type,
    isConfirm: false,
    onConfirm: null
  }
}

const showConfirm = (title, message, onConfirmCallback) => {
  customAlert.value = {
    show: true,
    title,
    message,
    type: 'danger',
    isConfirm: true,
    onConfirm: onConfirmCallback
  }
}

const closeCustomAlert = () => {
  customAlert.value.show = false
}

/* ===================== HELPERS ===================== */
const normalizeAnswer = (answer) => {
  if (answer === null || answer === undefined || String(answer).trim() === '') {
    return ''
  }
  return String(answer).trim().toUpperCase()
}

const getTableNameByLevel = (level) => {
  const normalized = String(level || 'beginner').toLowerCase()
  if (normalized === 'elementary') return 'elementary_tests'
  if (normalized === 'intermediate') return 'intermediate_tests'
  return 'beginner_tests'
}

/* ===================== FETCH ===================== */
const fetchResults = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    results.value = data || []
  } catch (err) {
    console.error('Error fetching results:', err)
    showAlert('Error', 'Ma’lumotlarni yuklashda xatolik: ' + err.message, 'danger')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchResults()
})

/* ===================== DELETE ===================== */
const deleteResult = (id, studentName) => {
  showConfirm(
    'Delete Result',
    `"${studentName}" natijasini o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.`,
    async () => {
      try {
        const { error } = await supabase.from('results').delete().eq('id', id)
        if (error) throw error

        results.value = results.value.filter((item) => item.id !== id)
        showAlert('Successful', 'Student natijasi muvaffaqiyatli o‘chirildi.', 'success')
      } catch (err) {
        console.error('Error deleting result:', err)
        showAlert('Error', 'O‘chirib bo‘lmadi: ' + err.message, 'danger')
      }
    }
  )
}

/* ===================== DETAIL ===================== */
const openStudentDetails = async (item) => {
  selectedStudent.value = item
  showModal.value = true
  studentTests.value = []
  loadingTests.value = true

  try {
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('assigned_questions, level')
      .eq('id', item.student_id)
      .maybeSingle()

    if (studentError) throw studentError

    const assignedIds = Array.isArray(studentData?.assigned_questions)
      ? studentData.assigned_questions
      : []

    if (assignedIds.length === 0) {
      studentTests.value = []
      return
    }

    const studentLevel = (studentData?.level || item.level || 'beginner').toLowerCase()
    const tableName = getTableNameByLevel(studentLevel)

    const { data: testsData, error: testsError } = await supabase
      .from(tableName)
      .select('*')
      .in('id', assignedIds)

    if (testsError) throw testsError

    const studentAnswersMap = item.exam_result?.student_answers || {}

    studentTests.value = assignedIds
      .map((id, index) => {
        const testObj = testsData?.find((t) => String(t.id) === String(id))
        if (!testObj) return null

        const studentAns = normalizeAnswer(studentAnswersMap[id])
        const realAns = normalizeAnswer(testObj.correct_answer)
        const isAnswered = studentAns !== ''
        const isCorrect = isAnswered && realAns !== '' && studentAns === realAns

        return {
          id: testObj.id,
          number: index + 1,
          question: testObj.question || 'Question not available',
          section_type: testObj.section_type || '',
          options: {
            A: testObj.option_a || '',
            B: testObj.option_b || '',
            C: testObj.option_c || '',
            D: testObj.option_d || ''
          },
          selectedAnswer: studentAns || 'Not Answered',
          correctAnswer: realAns || 'N/A',
          isAnswered,
          isCorrect
        }
      })
      .filter(Boolean)
  } catch (err) {
    console.error('Error loading test details:', err)
    showAlert('Error', 'Test tafsilotlarini yuklashda xatolik yuz berdi.', 'danger')
  } finally {
    loadingTests.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  selectedStudent.value = null
  studentTests.value = []
}

/* ===================== DOWNLOAD ===================== */
const escapeHTML = (value) => {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const downloadStudentHTML = () => {
  if (!selectedStudent.value) return

  const student = selectedStudent.value
  const tests = studentTests.value

  const testsHtml = tests
    .map((test) => {
      const optionsHtml = ['A', 'B', 'C', 'D']
        .map((opt) => {
          if (!test.options[opt]) return ''

          let extraClass = 'ia-option-card'
          if (test.correctAnswer === opt && test.selectedAnswer === opt) {
            extraClass += ' correct-option selected-correct-option'
          } else if (test.correctAnswer === opt) {
            extraClass += ' correct-option'
          } else if (test.selectedAnswer === opt && test.selectedAnswer !== test.correctAnswer) {
            extraClass += ' wrong-selected-option'
          }

          return `
            <div class="${extraClass}">
              <span class="ia-option-badge">${opt}</span>
              <span>${escapeHTML(test.options[opt])}</span>
            </div>
          `
        })
        .join('')

      const itemClass = test.isCorrect
        ? 'ia-question-item is-correct'
        : 'ia-question-item is-wrong'

      return `
        <div class="${itemClass}">
          <div class="ia-question-header">
            <div class="ia-question-title-wrap">
              <span class="q-number">#${test.number}</span>
              <p class="q-text">${escapeHTML(test.question)}</p>
            </div>
            <div class="q-status-icon">
              <span style="color:${test.isCorrect ? '#22c55e' : '#ef4444'};font-size:1.3rem;font-weight:bold;">
                ${test.isCorrect ? '✓' : '✕'}
              </span>
            </div>
          </div>
          <div class="ia-options-grid">${optionsHtml}</div>
          <div class="q-answers-row">
            <span>Student's Answer: <b style="color:${test.isCorrect ? '#166534' : '#991b1b'};">${escapeHTML(test.selectedAnswer)}</b></span>
            <span>Correct Answer: <b style="color:#166534;">${escapeHTML(test.correctAnswer)}</b></span>
          </div>
        </div>
      `
    })
    .join('')

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exam Report - ${escapeHTML(student.student_name)}</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,sans-serif;background:#f8fafc;color:#1e293b;padding:30px;margin:0}
.ia-report-container{max-width:900px;margin:0 auto;background:#fff;padding:40px;border-radius:18px;border:1px solid #e2e8f0;box-shadow:0 10px 25px rgba(0,0,0,.05)}
.ia-modal-header{border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:25px}
.ia-modal-header h2{margin:0 0 7px;font-size:25px;color:#0f172a}
.ia-modal-header p{margin:0;color:#64748b;font-size:14px}
.ia-modal-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}
.stat-box{background:#f8fafc;border:1px solid #e2e8f0;padding:18px;border-radius:12px;text-align:center}
.stat-box span{display:block;font-size:12px;color:#64748b;margin-bottom:5px;text-transform:uppercase;font-weight:700}
.stat-box strong{font-size:22px;color:#0f172a}
.stat-box.success{background:#dcfce7;border-color:#bbf7d0}
.stat-box.success span,.stat-box.success strong{color:#166534}
.stat-box.danger{background:#fee2e2;border-color:#fecaca}
.stat-box.danger span,.stat-box.danger strong{color:#991b1b}
.ia-tests-title{font-size:18px;margin:0 0 18px;color:#0f172a}
.ia-questions-list{display:flex;flex-direction:column;gap:16px}
.ia-question-item{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px}
.ia-question-item.is-correct{border-left:4px solid #22c55e}
.ia-question-item.is-wrong{border-left:4px solid #ef4444}
.ia-question-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.ia-question-title-wrap{display:flex;gap:12px;align-items:flex-start}
.q-number{min-width:28px;font-weight:700;color:#64748b}
.q-text{margin:0;font-weight:600;color:#1e293b;line-height:1.5}
.ia-options-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-left:40px;margin-bottom:15px}
.ia-option-card{padding:11px 14px;border-radius:9px;font-size:14px;display:flex;align-items:center;gap:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155}
.ia-option-badge{width:27px;height:27px;min-width:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;background:#e2e8f0;color:#475569}
.ia-option-card.correct-option{background:#dcfce7!important;border-color:#22c55e!important;color:#166534!important}
.ia-option-card.correct-option .ia-option-badge{background:#22c55e!important;color:#fff!important}
.ia-option-card.wrong-selected-option{background:#fee2e2!important;border-color:#ef4444!important;color:#991b1b!important}
.ia-option-card.wrong-selected-option .ia-option-badge{background:#ef4444!important;color:#fff!important}
.q-answers-row{margin-left:40px;border-top:1px dashed #cbd5e1;padding-top:12px;display:flex;gap:25px;font-size:14px;color:#475569}
</style>
</head>
<body>
<div class="ia-report-container">
  <div class="ia-modal-header">
    <h2>${escapeHTML(student.student_name)}</h2>
    <p>ID: <b>${escapeHTML(student.student_code)}</b> · Level: <b>${escapeHTML(student.level)}</b> · Date: ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="ia-modal-stats">
    <div class="stat-box"><span>Total Score</span><strong>${student.score ?? 0} / 100</strong></div>
    <div class="stat-box success"><span>Correct Answers</span><strong>${student.correct_answers ?? 0}</strong></div>
    <div class="stat-box danger"><span>Wrong Answers</span><strong>${student.wrong_answers ?? 0}</strong></div>
  </div>
  <h3 class="ia-tests-title">Test Analysis and Full Details</h3>
  <div class="ia-questions-list">${testsHtml}</div>
</div>
</body>
</html>`

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${student.student_name || 'student'}_result_report.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showAlert('Successful', 'Student hisoboti HTML formatda yuklab olindi.', 'success')
}

const downloadAllTableHTML = () => {
  const items = filteredResults.value

  if (items.length === 0) {
    showAlert('Attention', 'Yuklab olish uchun ma’lumot yo‘q!', 'danger')
    return
  }

  const rowsHtml = items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(item.student_name || 'N/A')}</strong></td>
        <td><code>${escapeHTML(item.student_code || 'N/A')}</code></td>
        <td><strong>${item.score ?? 0} / 100</strong></td>
        <td><span class="correct">${item.correct_answers ?? 0} Correct</span></td>
        <td><span class="wrong">${item.wrong_answers ?? 0} Wrong</span></td>
        <td>${escapeHTML(item.level || 'Beginner')}</td>
      </tr>
    `
    )
    .join('')

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Students Assessment Results</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,sans-serif;background:#f8fafc;color:#1e293b;padding:30px;margin:0}
.container{max-width:1100px;margin:0 auto;background:#fff;padding:40px;border-radius:18px;border:1px solid #e2e8f0}
.header{border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:25px}
.header h2{margin:0 0 7px;color:#0f172a}
.header p{margin:0;color:#64748b}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;padding:14px;text-align:left;border-bottom:2px solid #cbd5e1}
td{padding:14px;border-bottom:1px solid #f1f5f9}
code{background:#f1f5f9;padding:4px 8px;border-radius:6px;color:#4f46e5}
.correct{background:#dcfce7;color:#166534;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600}
.wrong{background:#fee2e2;color:#991b1b;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h2>Students Assessment Results</h2>
    <p>Date: <b>${new Date().toLocaleDateString()}</b> · Total Students: <b>${items.length}</b></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student Name</th>
        <th>Student ID</th>
        <th>Score</th>
        <th>Correct</th>
        <th>Wrong</th>
        <th>Level</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</div>
</body>
</html>`

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'All_Students_Results_Report.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showAlert('Successful', 'Barcha natijalar hisoboti yuklab olindi.', 'success')
}

/* ===================== FILTER ===================== */
const filteredResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return results.value.filter((item) => {
    const studentName = String(item.student_name || '').toLowerCase()
    const studentCode = String(item.student_code || '').toLowerCase()
    const matchesSearch = studentName.includes(query) || studentCode.includes(query)

    const matchesLevel =
      selectedLevel.value === 'all' ||
      String(item.level || '').toLowerCase() === selectedLevel.value.toLowerCase()

    return matchesSearch && matchesLevel
  })
})
</script>

<template>
  <div class="results-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>Students Assessment Results</h2>
        <p>Barcha topshirilgan imtihon natijalarini kuzating. Tafsilotlar uchun qator ustiga bosing.</p>
      </div>

      <div class="header-actions">
        <button class="btn-primary" title="Download All Results" @click="downloadAllTableHTML">
          <ArrowDownTrayIcon class="btn-icon" />
          Download All
        </button>
        <button class="btn-secondary" title="Refresh" @click="fetchResults">
          <ArrowPathIcon class="btn-icon" :class="{ spinning: loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <MagnifyingGlassIcon class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Ism yoki Student ID bo‘yicha qidirish..."
        />
      </div>

      <div class="filter-group">
        <select v-model="selectedLevel" class="level-select">
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="elementary">Elementary</option>
          <option value="intermediate">Intermediate</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      <div class="table-wrapper">
        <!-- Loading -->
        <div v-if="loading" class="state-box">
          <ArrowPathIcon class="state-icon spinning" />
          <p>Natijalar yuklanmoqda...</p>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredResults.length === 0" class="state-box">
          <TrophyIcon class="state-icon empty" />
          <p>Natija topilmadi</p>
        </div>

        <!-- Table -->
        <table v-else>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Score</th>
              <th>Correct / Wrong</th>
              <th>Level</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in filteredResults"
              :key="item.id"
              class="clickable-row"
              title="Click to view details"
              @click="openStudentDetails(item)"
            >
              <td>{{ index + 1 }}</td>
              <td>
                <div class="student-cell">
                  <div class="avatar">
                    <UserIcon class="avatar-icon" />
                  </div>
                  <span class="name">{{ item.student_name || 'N/A' }}</span>
                </div>
              </td>
              <td>
                <code class="id-code">{{ item.student_code || 'N/A' }}</code>
              </td>
              <td>
                <strong>{{ item.score ?? 0 }} / 100</strong>
              </td>
              <td>
                <span class="badge success">{{ item.correct_answers ?? 0 }} Correct</span>
                <span class="badge danger">{{ item.wrong_answers ?? 0 }} Wrong</span>
              </td>
              <td>
                <span class="level-badge" :class="(item.level || 'beginner').toLowerCase()">
                  {{ item.level || 'Beginner' }}
                </span>
              </td>
              <td class="text-center" @click.stop>
                <button
                  class="delete-btn"
                  title="Delete Result"
                  @click="deleteResult(item.id, item.student_name)"
                >
                  <TrashIcon class="action-icon" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===================== DETAIL MODAL ===================== -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card detail-modal">
        <div class="modal-header">
          <div>
            <h3>{{ selectedStudent?.student_name }}</h3>
            <p class="subtitle">
              ID: <code>{{ selectedStudent?.student_code }}</code>
              · Level: <strong>{{ selectedStudent?.level }}</strong>
            </p>
          </div>
          <div class="header-actions">
            <button class="btn-primary small" @click="downloadStudentHTML">
              <ArrowDownTrayIcon class="btn-icon" />
              Download HTML
            </button>
            <button class="close-btn" @click="closeModal">
              <XMarkIcon class="close-icon" />
            </button>
          </div>
        </div>

        <div class="modal-body detail-body">
          <!-- Stats -->
          <div class="stats-grid">
            <div class="stat-box">
              <span>Total Score</span>
              <strong>{{ selectedStudent?.score ?? 0 }} / 100</strong>
            </div>
            <div class="stat-box success">
              <span>Correct</span>
              <strong>{{ selectedStudent?.correct_answers ?? 0 }}</strong>
            </div>
            <div class="stat-box danger">
              <span>Wrong</span>
              <strong>{{ selectedStudent?.wrong_answers ?? 0 }}</strong>
            </div>
          </div>

          <h4 class="section-title">Student test answers and all options</h4>

          <div v-if="loadingTests" class="state-box compact">
            <ArrowPathIcon class="state-icon spinning" />
            <p>Testlar yuklanmoqda...</p>
          </div>

          <div v-else-if="studentTests.length > 0" class="questions-list">
            <div
              v-for="test in studentTests"
              :key="test.id || test.number"
              class="question-item"
              :class="{
                'is-correct': test.isCorrect,
                'is-wrong': test.isAnswered && !test.isCorrect
              }"
            >
              <div class="question-header">
                <div class="question-title">
                  <span class="q-number">#{{ test.number }}</span>
                  <p class="q-text">{{ test.question }}</p>
                </div>
                <div class="q-status">
                  <CheckIcon v-if="test.isCorrect" class="icon-success" />
                  <XCircleIcon v-else class="icon-danger" />
                </div>
              </div>

              <div
                v-if="test.options.A || test.options.B || test.options.C || test.options.D"
                class="options-grid"
              >
                <div
                  v-for="opt in ['A', 'B', 'C', 'D']"
                  :key="opt"
                  v-show="test.options[opt]"
                  class="option-card"
                  :class="{
                    'correct-option': test.correctAnswer === opt,
                    'wrong-selected':
                      test.selectedAnswer === opt && test.selectedAnswer !== test.correctAnswer
                  }"
                >
                  <span class="option-badge">{{ opt }}</span>
                  <span>{{ test.options[opt] }}</span>
                </div>
              </div>

              <div class="answers-row">
                <span>
                  Student's Answer:
                  <b :style="{ color: test.isCorrect ? '#166534' : '#991b1b' }">
                    {{ test.selectedAnswer }}
                  </b>
                </span>
                <span>
                  Correct Answer:
                  <b style="color: #166534">{{ test.correctAnswer }}</b>
                </span>
              </div>
            </div>
          </div>

          <div v-else class="state-box compact">
            <p>Bu student uchun test ma’lumotlari topilmadi.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== ALERT / CONFIRM ===================== -->
    <div v-if="customAlert.show" class="modal-backdrop" @click.self="closeCustomAlert">
      <div class="modal-card small-modal">
        <div class="modal-header centered">
          <h3 :class="customAlert.type === 'success' ? 'success-title' : 'danger-title'">
            {{ customAlert.title }}
          </h3>
          <button class="close-btn absolute" @click="closeCustomAlert">
            <XMarkIcon class="close-icon" />
          </button>
        </div>
        <div class="modal-body centered">
          <p>{{ customAlert.message }}</p>
        </div>
        <div class="modal-footer centered">
          <button
            v-if="customAlert.isConfirm"
            class="btn-secondary"
            @click="closeCustomAlert"
          >
            Cancel
          </button>
          <button
            class="btn-primary"
            :class="{ 'btn-danger': customAlert.isConfirm }"
            @click="
              customAlert.isConfirm
                ? (customAlert.onConfirm(), closeCustomAlert())
                : closeCustomAlert()
            "
          >
            {{ customAlert.isConfirm ? 'Delete' : 'OK' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>