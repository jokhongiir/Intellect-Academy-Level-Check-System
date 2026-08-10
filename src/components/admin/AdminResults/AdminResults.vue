<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import { OhVueIcon, addIcons } from 'oh-vue-icons'

import {
  RiSearchLine,
  RiRefreshLine,
  RiTrophyLine,
  RiUserLine,
  RiLoader4Line,
  RiCloseLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiErrorWarningLine
} from 'oh-vue-icons/icons'

import './AdminResutls.css'

addIcons(
  RiSearchLine,
  RiRefreshLine,
  RiTrophyLine,
  RiUserLine,
  RiLoader4Line,
  RiCloseLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiErrorWarningLine
)

/* =========================================================
   STATE
========================================================= */

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

/* =========================================================
   ALERT SYSTEM
========================================================= */

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

/* =========================================================
   NORMALIZE ANSWER
========================================================= */

const normalizeAnswer = (answer) => {
  if (
    answer === null ||
    answer === undefined ||
    String(answer).trim() === ''
  ) {
    return ''
  }

  return String(answer)
    .trim()
    .toUpperCase()
}

/* =========================================================
   FETCH RESULTS
========================================================= */

const fetchResults = async () => {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    results.value = data || []
  } catch (err) {
    console.error('Error fetching results:', err)

    showAlert(
      'Error',
      'An error occurred while loading data: ' + err.message,
      'danger'
    )
  } finally {
    loading.value = false
  }
}

/* =========================================================
   ON MOUNT
========================================================= */

onMounted(() => {
  fetchResults()
})

/* =========================================================
   DELETE RESULT
========================================================= */

const deleteResult = (id, studentName) => {
  showConfirm(
    'Delete Result',
    `Are you sure you want to delete the result for "${studentName}"? This action cannot be undone.`,
    async () => {
      try {
        const { error } = await supabase
          .from('results')
          .delete()
          .eq('id', id)

        if (error) {
          throw error
        }

        results.value = results.value.filter(
          item => item.id !== id
        )

        showAlert(
          'Successful',
          'Student result has been successfully deleted.',
          'success'
        )
      } catch (err) {
        console.error('Error deleting result:', err)

        showAlert(
          'Error',
          'Could not delete! Reason: ' + err.message,
          'danger'
        )
      }
    }
  )
}

/* =========================================================
   OPEN STUDENT DETAILS
========================================================= */

const openStudentDetails = async (item) => {
  selectedStudent.value = item
  showModal.value = true

  studentTests.value = []
  loadingTests.value = true

  try {
    /* ---------------------------------------------
       GET STUDENT ASSIGNED QUESTIONS & LEVEL
    --------------------------------------------- */

    const {
      data: studentData,
      error: studentError
    } = await supabase
      .from('students')
      .select('assigned_questions, level')
      .eq('id', item.student_id)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    const assignedIds = Array.isArray(studentData?.assigned_questions)
      ? studentData.assigned_questions
      : []

    /* ---------------------------------------------
       IF NO QUESTIONS
    --------------------------------------------- */

    if (assignedIds.length === 0) {
      studentTests.value = []
      return
    }

    /* ---------------------------------------------
       DETERMINE TABLE BASED ON LEVEL
    --------------------------------------------- */

    const studentLevel = (studentData?.level || item.level || 'beginner').toLowerCase()
    const tableName = studentLevel === 'elementary' ? 'elementary_tests' : 'beginner_tests'

    /* ---------------------------------------------
       GET TESTS
    --------------------------------------------- */

    const {
      data: testsData,
      error: testsError
    } = await supabase
      .from(tableName)
      .select('*')
      .in('id', assignedIds)

    if (testsError) {
      throw testsError
    }

    /* ---------------------------------------------
       STUDENT ANSWERS
    --------------------------------------------- */

    const studentAnswersMap =
      item.exam_result?.student_answers || {}

    /* ---------------------------------------------
       BUILD TEST LIST
    --------------------------------------------- */

    studentTests.value = assignedIds
      .map((id, index) => {
        const testObj = testsData?.find(
          test => String(test.id) === String(id)
        )

        if (!testObj) {
          return null
        }

        const studentAns = normalizeAnswer(
          studentAnswersMap[id]
        )

        const realAns = normalizeAnswer(
          testObj.correct_answer
        )

        const isAnswered = studentAns !== ''

        const isCorrect =
          isAnswered &&
          realAns !== '' &&
          studentAns === realAns

        return {
          id: testObj.id,

          number: index + 1,

          question:
            testObj.question ||
            'Question not available',

          section_type:
            testObj.section_type || '',

          options: {
            A: testObj.option_a || '',
            B: testObj.option_b || '',
            C: testObj.option_c || '',
            D: testObj.option_d || ''
          },

          selectedAnswer:
            studentAns || 'Not Answered',

          correctAnswer:
            realAns || 'N/A',

          isAnswered,

          isCorrect
        }
      })
      .filter(Boolean)
  } catch (err) {
    console.error(
      'Error loading test details:',
      err
    )

    showAlert(
      'Error',
      'An error occurred while loading test details.',
      'danger'
    )
  } finally {
    loadingTests.value = false
  }
}

/* =========================================================
   DOWNLOAD STUDENT HTML REPORT
========================================================= */

const downloadStudentHTML = () => {
  if (!selectedStudent.value) {
    return
  }

  const student = selectedStudent.value
  const tests = studentTests.value

  const escapeHTML = (value) => {
    if (value === null || value === undefined) {
      return ''
    }

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  let testsHtml = tests
    .map(test => {
      const optionsHtml = ['A', 'B', 'C', 'D']
        .map(opt => {
          if (!test.options[opt]) {
            return ''
          }

          let extraClass = 'ia-option-card'

          if (
            test.correctAnswer === opt &&
            test.selectedAnswer === opt
          ) {
            extraClass += ' correct-option selected-correct-option'
          } else if (
            test.correctAnswer === opt
          ) {
            extraClass += ' correct-option'
          } else if (
            test.selectedAnswer === opt &&
            test.selectedAnswer !== test.correctAnswer
          ) {
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

              <span class="q-number">
                #${test.number}
              </span>

              <p class="q-text">
                ${escapeHTML(test.question)}
              </p>

            </div>

            <div class="q-status-icon">

              <span
                style="
                  color: ${test.isCorrect ? '#22c55e' : '#ef4444'};
                  font-size: 1.3rem;
                  font-weight: bold;
                "
              >
                ${test.isCorrect ? '✓' : '✕'}
              </span>

            </div>

          </div>

          <div class="ia-options-grid">
            ${optionsHtml}
          </div>

          <div class="q-answers-row">

            <span>
              Student's Answer:
              <b
                style="
                  color: ${
                    test.isCorrect
                      ? '#166534'
                      : '#991b1b'
                  };
                "
              >
                ${escapeHTML(test.selectedAnswer)}
              </b>
            </span>

            <span>
              Correct Answer:
              <b style="color:#166534;">
                ${escapeHTML(test.correctAnswer)}
              </b>
            </span>

          </div>

        </div>
      `
    })
    .join('')

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exam Report - ${escapeHTML(student.student_name)}</title>
<style>
* { box-sizing: border-box; }
body { font-family: Inter, sans-serif; background: #f8fafc; color: #1e293b; padding: 30px; margin: 0; }
.ia-report-container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 18px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,.05); }
.ia-modal-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
.ia-modal-header h2 { margin: 0 0 7px; font-size: 25px; color: #0f172a; }
.ia-modal-header p { margin: 0; color: #64748b; font-size: 14px; }
.ia-modal-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
.stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 12px; text-align: center; }
.stat-box span { display: block; font-size: 12px; color: #64748b; margin-bottom: 5px; text-transform: uppercase; font-weight: 700; }
.stat-box strong { font-size: 22px; color: #0f172a; }
.stat-box.success { background: #dcfce7; border-color: #bbf7d0; }
.stat-box.success span, .stat-box.success strong { color: #166534; }
.stat-box.danger { background: #fee2e2; border-color: #fecaca; }
.stat-box.danger span, .stat-box.danger strong { color: #991b1b; }
.ia-tests-title { font-size: 18px; margin: 0 0 18px; color: #0f172a; }
.ia-questions-list { display: flex; flex-direction: column; gap: 16px; }
.ia-question-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
.ia-question-item.is-correct { border-left: 4px solid #22c55e; }
.ia-question-item.is-wrong { border-left: 4px solid #ef4444; }
.ia-question-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.ia-question-title-wrap { display: flex; gap: 12px; align-items: flex-start; }
.q-number { min-width: 28px; font-weight: 700; color: #64748b; }
.q-text { margin: 0; font-weight: 600; color: #1e293b; line-height: 1.5; }
.ia-options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-left: 40px; margin-bottom: 15px; }
.ia-option-card { padding: 11px 14px; border-radius: 9px; font-size: 14px; display: flex; align-items: center; gap: 10px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; }
.ia-option-badge { width: 27px; height: 27px; min-width: 27px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: #e2e8f0; color: #475569; }
.ia-option-card.correct-option { background: #dcfce7 !important; border-color: #22c55e !important; color: #166534 !important; }
.ia-option-card.correct-option .ia-option-badge { background: #22c55e !important; color: #ffffff !important; }
.ia-option-card.wrong-selected-option { background: #fee2e2 !important; border-color: #ef4444 !important; color: #991b1b !important; }
.ia-option-card.wrong-selected-option .ia-option-badge { background: #ef4444 !important; color: #ffffff !important; }
.q-answers-row { margin-left: 40px; border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; gap: 25px; font-size: 14px; color: #475569; }
</style>
</head>
<body>
<div class="ia-report-container">
  <div class="ia-modal-header">
    <h2>${escapeHTML(student.student_name)}</h2>
    <p>ID: <b>${escapeHTML(student.student_code)}</b> &nbsp; • &nbsp; Level: <b>${escapeHTML(student.level)}</b> &nbsp; • &nbsp; Date: ${new Date().toLocaleDateString()}</p>
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
</html>
`

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${student.student_name || 'student'}_result_report.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showAlert('Successful', 'Student report downloaded in HTML format.', 'success')
}

/* =========================================================
   DOWNLOAD ALL RESULTS
========================================================= */

const downloadAllTableHTML = () => {
  const items = filteredResults.value

  if (items.length === 0) {
    showAlert('Attention', 'No data available to download!', 'danger')
    return
  }

  const escapeHTML = (value) => {
    if (value === null || value === undefined) return ''
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const rowsHtml = items
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(item.student_name || 'N/A')}</strong></td>
        <td><code>${escapeHTML(item.student_code || 'N/A')}</code></td>
        <td><strong>${item.score ?? 0} / 100</strong></td>
        <td><span class="correct">${item.correct_answers ?? 0} Correct</span></td>
        <td><span class="wrong">${item.wrong_answers ?? 0} Wrong</span></td>
        <td>${escapeHTML(item.level || 'Beginner')}</td>
      </tr>
    `)
    .join('')

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Students Assessment Results</title>
<style>
* { box-sizing: border-box; }
body { font-family: Inter, sans-serif; background: #f8fafc; color: #1e293b; padding: 30px; margin: 0; }
.container { max-width: 1100px; margin: 0 auto; background: white; padding: 40px; border-radius: 18px; border: 1px solid #e2e8f0; }
.header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
.header h2 { margin: 0 0 7px; color: #0f172a; }
.header p { margin: 0; color: #64748b; }
table { width: 100%; border-collapse: collapse; }
th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; padding: 14px; text-align: left; border-bottom: 2px solid #cbd5e1; }
td { padding: 14px; border-bottom: 1px solid #f1f5f9; }
code { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; color: #4f46e5; }
.correct { background: #dcfce7; color: #166534; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.wrong { background: #fee2e2; color: #991b1b; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h2>Students Assessment Results</h2>
    <p>Date: <b>${new Date().toLocaleDateString()}</b> &nbsp; • &nbsp; Total Students: <b>${items.length}</b></p>
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
</html>
`

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'All_Students_Results_Report.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showAlert('Successful', 'All results report downloaded in HTML format.', 'success')
}

/* =========================================================
   CLOSE MODAL
========================================================= */

const closeModal = () => {
  showModal.value = false
  selectedStudent.value = null
  studentTests.value = []
}

/* =========================================================
   FILTER RESULTS
========================================================= */

const filteredResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return results.value.filter(item => {
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
  <div class="ia-admin-results-container">
    <div class="ia-results-header">
      <div>
        <h2>Students Assessment Results</h2>
        <p>Monitor all submitted exam results. Click on any student to view their test details.</p>
      </div>

      <div class="ia-header-actions">
        <button @click="downloadAllTableHTML" class="ia-refresh-btn ia-btn-primary" title="Download All Results HTML">
          <OhVueIcon name="ri-download-line" />
          <span>Download All Report</span>
        </button>

        <button @click="fetchResults" class="ia-refresh-btn" title="Refresh Data">
          <OhVueIcon name="ri-refresh-line" :class="{ 'ia-spin': loading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div class="ia-filters-bar">
      <div class="ia-search-box">
        <OhVueIcon name="ri-search-line" class="ia-search-icon" />
        <input type="text" v-model="searchQuery" placeholder="Search by name or student ID..." />
      </div>

      <div class="ia-level-filter">
        <select v-model="selectedLevel">
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="elementary">Elementary</option>
          <option value="intermediate">Intermediate</option>
          <option value="upper-intermediate">Upper-Intermediate</option>
        </select>
      </div>
    </div>

    <div class="ia-table-wrapper">
      <div v-if="loading" class="ia-loading-state">
        <OhVueIcon name="ri-loader-4-line" class="ia-spinner" />
        <p>Loading results...</p>
      </div>

      <div v-else-if="filteredResults.length === 0" class="ia-empty-state">
        <OhVueIcon name="ri-trophy-line" class="ia-empty-icon" />
        <p>No student results found.</p>
      </div>

      <table v-else class="ia-results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Student Name</th>
            <th>Student ID</th>
            <th>Score</th>
            <th>Correct / Wrong</th>
            <th>Level</th>
            <th style="text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in filteredResults"
            :key="item.id"
            @click="openStudentDetails(item)"
            class="ia-table-row"
            title="Click to view test details"
          >
            <td>{{ index + 1 }}</td>
            <td>
              <div class="ia-table-student-info">
                <div class="ia-table-avatar">
                  <OhVueIcon name="ri-user-line" />
                </div>
                <span class="ia-table-name">{{ item.student_name || 'N/A' }}</span>
              </div>
            </td>
            <td><code class="ia-student-code">{{ item.student_code || 'N/A' }}</code></td>
            <td><strong>{{ item.score ?? 0 }} / 100</strong></td>
            <td>
              <span class="ia-badge success">{{ item.correct_answers ?? 0 }} Correct</span>
              <span class="ia-badge danger">{{ item.wrong_answers ?? 0 }} Wrong</span>
            </td>
            <td>
              <span class="ia-level-pill" :class="(item.level || 'beginner').toLowerCase()">
                {{ item.level || 'Beginner' }}
              </span>
            </td>
            <td style="text-align:center;" @click.stop>
              <button @click="deleteResult(item.id, item.student_name)" class="ia-delete-action-btn" title="Delete Result">
                <OhVueIcon name="ri-delete-bin-line" style="font-size:1.1rem;" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="ia-modal-backdrop" @click.self="closeModal">
      <div class="ia-modal-content">
        <div class="ia-modal-header">
          <div>
            <h3>{{ selectedStudent?.student_name }}</h3>
            <p>ID: <code class="ia-student-code">{{ selectedStudent?.student_code }}</code> | Level: <strong>{{ selectedStudent?.level }}</strong></p>
          </div>
          <div class="ia-modal-header-actions">
            <button @click="downloadStudentHTML" class="ia-download-html-btn" title="Download HTML Report">
              <OhVueIcon name="ri-download-line" />
              <span>Download HTML</span>
            </button>
            <button @click="closeModal" class="ia-modal-close-btn">
              <OhVueIcon name="ri-close-line" />
            </button>
          </div>
        </div>

        <div class="ia-modal-body">
          <div class="ia-modal-stats">
            <div class="stat-box"><span>Total Score</span><strong>{{ selectedStudent?.score ?? 0 }} / 100</strong></div>
            <div class="stat-box success"><span>Correct</span><strong>{{ selectedStudent?.correct_answers ?? 0 }}</strong></div>
            <div class="stat-box danger"><span>Wrong</span><strong>{{ selectedStudent?.wrong_answers ?? 0 }}</strong></div>
          </div>

          <h4 class="ia-tests-title">Student test answers and all options:</h4>

          <div v-if="loadingTests" class="ia-loading-state" style="padding:30px;">
            <OhVueIcon name="ri-loader-4-line" class="ia-spinner" />
            <p>Loading tests...</p>
          </div>

          <div v-else-if="studentTests.length > 0" class="ia-questions-list">
            <div
              v-for="test in studentTests"
              :key="test.id || test.number"
              class="ia-question-item"
              :class="{
                'is-correct': test.isCorrect,
                'is-wrong': test.isAnswered && !test.isCorrect
              }"
            >
              <div class="ia-question-header">
                <div class="ia-question-title-wrap">
                  <span class="q-number">#{{ test.number }}</span>
                  <p class="q-text">{{ test.question }}</p>
                </div>
                <div class="q-status-icon">
                  <OhVueIcon v-if="test.isCorrect" name="ri-check-line" class="icon-success" />
                  <OhVueIcon v-else name="ri-close-circle-line" class="icon-danger" />
                </div>
              </div>

              <div v-if="test.options.A || test.options.B || test.options.C || test.options.D" class="ia-options-grid">
                <div
                  v-for="opt in ['A', 'B', 'C', 'D']"
                  :key="opt"
                  v-show="test.options[opt]"
                  class="ia-option-card"
                  :class="{
                    'correct-option': test.correctAnswer === opt && test.selectedAnswer === opt,
                    'correct-option': test.correctAnswer === opt && test.selectedAnswer !== opt,
                    'wrong-selected-option': test.selectedAnswer === opt && test.selectedAnswer !== test.correctAnswer
                  }"
                >
                  <span class="ia-option-badge">{{ opt }}</span>
                  <span>{{ test.options[opt] }}</span>
                </div>
              </div>

              <div class="q-answers-row">
                <span>Student's Answer: <b :style="{ color: test.isCorrect ? '#166534' : '#991b1b' }">{{ test.selectedAnswer }}</b></span>
                <span>Correct Answer: <b style="color:#166534;">{{ test.correctAnswer }}</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Alert Modal -->
    <div v-if="customAlert.show" class="ia-modal-backdrop" @click.self="closeCustomAlert">
      <div class="ia-modal-card">
        <h3>{{ customAlert.title }}</h3>
        <p>{{ customAlert.message }}</p>
        <div class="ia-modal-actions">
          <button v-if="customAlert.isConfirm" @click="closeCustomAlert" class="ia-modal-btn cancel">Cancel</button>
          <button 
            @click="customAlert.isConfirm ? (customAlert.onConfirm(), closeCustomAlert()) : closeCustomAlert()" 
            class="ia-modal-btn confirm"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>