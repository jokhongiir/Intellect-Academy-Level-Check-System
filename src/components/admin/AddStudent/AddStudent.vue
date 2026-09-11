<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  UserIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/outline'
import './AddStudent.css'

/* ===================== STATE ===================== */
const students = ref([])
const loading = ref(false)
const detailLoading = ref(false)
const errorMsg = ref('')

const isModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedStudent = ref(null)
const studentTests = ref([])

const fullName = ref('')
const level = ref('beginner')
const studentId = ref('')

const selectedFilterLevel = ref('all')
const searchQuery = ref('')

/* Confirm & Alert Modals */
const confirmModal = ref({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null
})

const alertModal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'info'
})

/* ===================== COMPUTED ===================== */
const filteredStudents = computed(() => {
  let list = students.value

  if (selectedFilterLevel.value !== 'all') {
    list = list.filter(s => s.level === selectedFilterLevel.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(
      s =>
        s.full_name?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase().includes(q)
    )
  }

  return list
})

/* ===================== HELPERS ===================== */
const shuffleArray = (array) => {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const formatSectionName = (type) => {
  const names = {
    multiple_choice: 'Multiple Choice',
    note_completion: 'Note Completion',
    summary_completion: 'Summary Completion',
    short_answer: 'Short Answer',
    reading: 'Reading Comprehension',
    writing: 'Writing Task'
  }
  return names[type] || type
}

const getTableNameByLevel = (level) => {
  const normalized = String(level || 'beginner').toLowerCase()
  if (normalized === 'elementary') return 'elementary_tests'
  if (normalized === 'intermediate') return 'intermediate_tests'
  return 'beginner_tests'
}

const showAlert = (title, message, type = 'info') => {
  alertModal.value = { isOpen: true, title, message, type }
}

const closeAlertModal = () => {
  alertModal.value.isOpen = false
}

const closeConfirmModal = () => {
  confirmModal.value.isOpen = false
}

/* ===================== STUDENT ID ===================== */
const generateUniqueStudentId = async () => {
  let isUnique = false
  let newId = ''

  while (!isUnique) {
    newId = 'IA-' + Math.floor(1000 + Math.random() * 9000)

    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', newId)
      .maybeSingle()

    if (error) {
      console.error('ID uniqueness check failed:', error.message)
      break
    }

    if (!data) isUnique = true
  }

  return newId
}

/* ===================== CRUD ===================== */
const fetchStudents = async () => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    students.value = data || []
  } catch (err) {
    console.error('Fetch students error:', err.message)
  }
}

const openModal = async () => {
  loading.value = true
  fullName.value = ''
  level.value = 'beginner'
  errorMsg.value = ''

  studentId.value = await generateUniqueStudentId()
  isModalOpen.value = true
  loading.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleCreateStudent = async () => {
  errorMsg.value = ''
  loading.value = true

  try {
    if (!fullName.value.trim()) {
      throw new Error('Full name is required')
    }

    const tableName = getTableNameByLevel(level.value)

    const { data: levelTests, error: qError } = await supabase
      .from(tableName)
      .select('*')
      .eq('level', level.value)

    if (qError) throw qError

    if (!levelTests?.length) {
      throw new Error(
        `"${level.value}" darajasi uchun testlar topilmadi. Avval savollar qo‘shing.`
      )
    }

    // Group by section
    const sections = {
      writing: levelTests.filter(t => t.section_type === 'writing'),
      reading: levelTests.filter(t => t.section_type === 'reading'),
      multiple_choice: levelTests.filter(t => t.section_type === 'multiple_choice'),
      note_completion: levelTests.filter(t => t.section_type === 'note_completion'),
      summary_completion: levelTests.filter(t => t.section_type === 'summary_completion'),
      short_answer: levelTests.filter(t => t.section_type === 'short_answer')
    }

    // Strict structure: 24 MC + 6 Note → Reading → Writing
    const selectedMultiples = shuffleArray(sections.multiple_choice).slice(0, 24)
    const selectedNotes = shuffleArray(sections.note_completion).slice(0, 6)
    const selectedReadings = shuffleArray(sections.reading).slice(0, 5)
    const selectedWritings = shuffleArray(sections.writing).slice(0, 1)

    const structuredTests = [
      ...selectedMultiples,
      ...selectedNotes,
      ...selectedReadings,
      ...selectedWritings
    ]

    if (!structuredTests.length) {
      throw new Error('Test paketini yig‘ib bo‘lmadi. Section typelarini tekshiring.')
    }

    const assignedIds = structuredTests.map(t => t.id)

    const { error: insertError } = await supabase.from('students').insert([
      {
        student_id: studentId.value,
        full_name: fullName.value.trim(),
        level: level.value,
        assigned_questions: assignedIds
      }
    ])

    if (insertError) throw insertError

    await fetchStudents()
    isModalOpen.value = false
    showAlert('Success', 'Yangi student muvaffaqiyatli qo‘shildi.', 'success')
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

const deleteStudent = (id, event) => {
  if (event) event.stopPropagation()

  confirmModal.value = {
    isOpen: true,
    title: 'Delete Student',
    message:
      'Ushbu studentni o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.',
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('students').delete().eq('id', id)
        if (error) throw error

        await fetchStudents()
        closeConfirmModal()
        showAlert('Deleted', 'Student muvaffaqiyatli o‘chirildi.', 'success')
      } catch (err) {
        closeConfirmModal()
        showAlert('Error', 'O‘chirishda xatolik: ' + err.message, 'error')
      }
    }
  }
}

/* ===================== DETAIL MODAL ===================== */
const openStudentDetailModal = async (student, event) => {
  if (event) event.stopPropagation()

  selectedStudent.value = student
  isDetailModalOpen.value = true
  studentTests.value = []

  if (!student.assigned_questions?.length) return

  detailLoading.value = true
  try {
    const tableName = getTableNameByLevel(student.level)

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .in('id', student.assigned_questions)

    if (error) throw error

    // Preserve original order
    const testMap = new Map(data.map(t => [t.id, t]))
    studentTests.value = student.assigned_questions
      .map(id => testMap.get(id))
      .filter(Boolean)
  } catch (err) {
    console.error('Fetch assigned tests error:', err.message)
  } finally {
    detailLoading.value = false
  }
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedStudent.value = null
  studentTests.value = []
}

/* ===================== UTILS ===================== */
const copyToClipboard = (text, type, event) => {
  if (event) event.stopPropagation()
  navigator.clipboard.writeText(text)
  showAlert('Copied', `${type} nusxa olindi: ${text}`, 'success')
}

onMounted(() => {
  fetchStudents()
})

</script>

<template>
  <div class="students-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>Students Management</h2>
        <p>Studentlarni boshqaring va ularga testlar biriktiring</p>
      </div>
      <button class="btn-primary" @click="openModal">
        <PlusIcon class="btn-icon" />
        Add New Student
      </button>
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
        <button
          class="filter-btn"
          :class="{ active: selectedFilterLevel === 'all' }"
          @click="selectedFilterLevel = 'all'"
        >
          All
        </button>
        <button
          class="filter-btn"
          :class="{ active: selectedFilterLevel === 'beginner' }"
          @click="selectedFilterLevel = 'beginner'"
        >
          Beginner
        </button>
        <button
          class="filter-btn"
          :class="{ active: selectedFilterLevel === 'elementary' }"
          @click="selectedFilterLevel = 'elementary'"
        >
          Elementary
        </button>
        <button
          class="filter-btn"
          :class="{ active: selectedFilterLevel === 'intermediate' }"
          @click="selectedFilterLevel = 'intermediate'"
        >
          Intermediate
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" class="error-banner">
      {{ errorMsg }}
    </div>

    <!-- Table -->
    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Full Name</th>
              <th>Student ID</th>
              <th>Level</th>
              <th>Assigned Tests</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="6" class="empty-cell">
                <div class="empty-state">
                  <UserIcon class="empty-icon" />
                  <p>Student topilmadi</p>
                </div>
              </td>
            </tr>

            <tr
              v-for="(student, index) in filteredStudents"
              :key="student.id"
            >
              <td>{{ index + 1 }}</td>

              <td>
                <div class="student-cell">
                  <div class="avatar">
                    {{ student.full_name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <span class="name">{{ student.full_name }}</span>
                </div>
              </td>

              <td>
                <button
                  class="id-badge"
                  title="Copy ID"
                  @click="copyToClipboard(student.student_id, 'Student ID', $event)"
                >
                  {{ student.student_id }}
                  <ClipboardDocumentIcon class="copy-icon" />
                </button>
              </td>

              <td>
                <span class="level-badge" :class="student.level">
                  {{ student.level }}
                </span>
              </td>

              <td>
                <button
                  class="questions-badge"
                  title="View assigned tests"
                  @click="openStudentDetailModal(student, $event)"
                >
                  {{ student.assigned_questions?.length || 0 }} questions
                </button>
              </td>

              <td class="text-right">
                <button
                  class="delete-btn"
                  title="Delete"
                  @click="deleteStudent(student.id, $event)"
                >
                  <TrashIcon class="action-icon" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===================== ADD STUDENT MODAL ===================== -->
    <div
      v-if="isModalOpen"
      class="modal-backdrop"
      @click.self="closeModal"
    >
      <div class="modal-card">
        <div class="modal-header">
          <h3>Add New Student</h3>
          <button class="close-btn" @click="closeModal">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <form class="modal-body" @submit.prevent="handleCreateStudent">
          <div class="field">
            <label>Full Name</label>
            <input
              v-model="fullName"
              type="text"
              required
              placeholder="Masalan: Alisher Valiyev"
            />
          </div>

          <div class="field">
            <label>Proficiency Level</label>
            <select v-model="level" required>
              <option value="beginner">Beginner</option>
              <option value="elementary">Elementary</option>
              <option value="intermediate">Intermediate</option>
            </select>
          </div>

          <div class="field">
            <label>Auto-Generated Student ID</label>
            <input
              v-model="studentId"
              type="text"
              readonly
              class="readonly-input"
            />
          </div>

          <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save Student' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===================== DETAIL MODAL ===================== -->
    <div
      v-if="isDetailModalOpen"
      class="modal-backdrop"
      @click.self="closeDetailModal"
    >
      <div class="modal-card detail-modal">
        <div class="modal-header">
          <div>
            <h3>Student Details & Tests</h3>
            <p v-if="selectedStudent" class="subtitle">
              {{ selectedStudent.full_name }}
              · ID: <strong>{{ selectedStudent.student_id }}</strong>
            </p>
          </div>
          <button class="close-btn" @click="closeDetailModal">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="modal-body detail-body">
          <div v-if="detailLoading" class="loading-state">
            Loading assigned tests...
          </div>

          <div v-else-if="!studentTests.length" class="empty-state">
            Bu studentga test biriktirilmagan.
          </div>

          <div v-else class="tests-list">
            <div class="tests-count">
              Jami: <strong>{{ studentTests.length }}</strong> ta savol
            </div>

            <div
              v-for="(test, idx) in studentTests"
              :key="test.id"
              class="test-card"
            >
              <div class="test-header">
                <span class="test-number">
                  #{{ idx + 1 }} — {{ formatSectionName(test.section_type) }}
                </span>
                <span class="level-badge small" :class="test.level">
                  {{ test.level }}
                </span>
              </div>

              <div v-if="test.passage_text" class="passage">
                <strong>Passage:</strong> {{ test.passage_text }}
              </div>

              <div class="question-text">{{ test.question }}</div>

              <div v-if="test.option_a" class="options-grid">
                <div
                  class="option"
                  :class="{ correct: test.correct_answer === 'A' }"
                >
                  <strong>A:</strong> {{ test.option_a }}
                </div>
                <div
                  class="option"
                  :class="{ correct: test.correct_answer === 'B' }"
                >
                  <strong>B:</strong> {{ test.option_b }}
                </div>
                <div
                  class="option"
                  :class="{ correct: test.correct_answer === 'C' }"
                >
                  <strong>C:</strong> {{ test.option_c }}
                </div>
                <div
                  class="option"
                  :class="{ correct: test.correct_answer === 'D' }"
                >
                  <strong>D:</strong> {{ test.option_d }}
                </div>
              </div>

              <div class="correct-answer">
                Correct Answer: <strong>{{ test.correct_answer }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeDetailModal">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== CONFIRM MODAL ===================== -->
    <div
      v-if="confirmModal.isOpen"
      class="modal-backdrop"
      @click.self="closeConfirmModal"
    >
      <div class="modal-card small-modal">
        <div class="modal-header centered">
          <h3 class="danger-title">{{ confirmModal.title }}</h3>
          <button class="close-btn absolute" @click="closeConfirmModal">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="modal-body centered">
          <p>{{ confirmModal.message }}</p>
        </div>

        <div class="modal-footer centered">
          <button class="btn-secondary" @click="closeConfirmModal">
            Cancel
          </button>
          <button class="btn-danger" @click="confirmModal.onConfirm">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== ALERT MODAL ===================== -->
    <div
      v-if="alertModal.isOpen"
      class="modal-backdrop"
      @click.self="closeAlertModal"
    >
      <div class="modal-card small-modal">
        <div class="modal-header centered">
          <h3
            :class="
              alertModal.type === 'success' ? 'success-title' : 'danger-title'
            "
          >
            {{ alertModal.title }}
          </h3>
          <button class="close-btn absolute" @click="closeAlertModal">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="modal-body centered">
          <p>{{ alertModal.message }}</p>
        </div>

        <div class="modal-footer centered">
          <button class="btn-primary" @click="closeAlertModal">
            Got it
          </button>
        </div>
      </div>
    </div>
  </div>
</template>