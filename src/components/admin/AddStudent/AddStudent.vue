<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import './AddStudent.css'

const students = ref([])
const isModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedStudent = ref(null)
const studentTests = ref([])
const loading = ref(false)
const detailLoading = ref(false)
const errorMsg = ref('')

const fullName = ref('')
const level = ref('beginner')
const studentId = ref('')

// Filter state for table ('all', 'beginner', 'elementary')
const selectedFilterLevel = ref('all')

// States for Custom Modal Alerts and Confirms
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
  type: 'info' // 'success' or 'error'
})

// Filtered students computed property
const filteredStudents = computed(() => {
  if (selectedFilterLevel.value === 'all') {
    return students.value
  }
  return students.value.filter(student => student.level === selectedFilterLevel.value)
})

// Generate Unique Student ID and Verify via Database
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
      console.error("Error checking ID uniqueness:", error.message)
      break
    }

    if (!data) {
      isUnique = true
    }
  }
  return newId
}

const generateCredentials = async () => {
  studentId.value = await generateUniqueStudentId()
}

const openModal = async () => {
  loading.value = true
  fullName.value = ''
  level.value = 'beginner'
  errorMsg.value = ''
  
  await generateCredentials()
  isModalOpen.value = true
  loading.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

// Open Student Details & Fetch Assigned Tests from beginner_tests or elementary_tests
const openStudentDetailModal = async (student, event) => {
  if (event) event.stopPropagation()
  selectedStudent.value = student
  isDetailModalOpen.value = true
  studentTests.value = []
  
  if (student.assigned_questions && student.assigned_questions.length > 0) {
    detailLoading.value = true
    try {
      const tableName = student.level === 'elementary' ? 'elementary_tests' : 'beginner_tests'

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .in('id', student.assigned_questions)

      if (error) throw error
      
      const testMap = new Map(data.map(t => [t.id, t]))
      studentTests.value = student.assigned_questions.map(id => testMap.get(id)).filter(Boolean)
    } catch (err) {
      console.error("Error fetching assigned tests:", err.message)
    } finally {
      detailLoading.value = false
    }
  }
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedStudent.value = null
  studentTests.value = []
}

const fetchStudents = async () => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    students.value = data || []
  } catch (err) {
    console.error("Error fetching students:", err.message)
  }
}

onMounted(() => {
  fetchStudents()
})

/**
 * Fisher-Yates Perfect Shuffle Algorithm
 * Ensures 100% true random distribution for tests.
 */
const shuffleArray = (array) => {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Professional algorithm to structure tests strictly by section types:
 * 1. First 30 questions (Multiple Choice & Note Completion)
 * 2. Followed by Reading
 * 3. Ending with Writing Task
 */
const handleCreateStudent = async () => {
  errorMsg.value = ''
  loading.value = true

  try {
    const tableName = level.value === 'elementary' ? 'elementary_tests' : 'beginner_tests'

    const { data: levelTests, error: qError } = await supabase
      .from(tableName)
      .select('*')
      .eq('level', level.value)

    if (qError) throw qError

    if (!levelTests || levelTests.length === 0) {
      throw new Error(`No tests available in "${tableName}" for the "${level.value}" level! Please add questions first.`)
    }

    // Group tests safely by section_type
    const sections = {
      writing: levelTests.filter(t => t.section_type === 'writing'),
      reading: levelTests.filter(t => t.section_type === 'reading'),
      multiple_choice: levelTests.filter(t => t.section_type === 'multiple_choice'),
      note_completion: levelTests.filter(t => t.section_type === 'note_completion'),
      summary_completion: levelTests.filter(t => t.section_type === 'summary_completion'),
      short_answer: levelTests.filter(t => t.section_type === 'short_answer')
    }

    // Apply Fisher-Yates shuffle and strict limits per section type
    const selectedMultiples = shuffleArray(sections.multiple_choice).slice(0, 24)
    const selectedNotes = shuffleArray(sections.note_completion).slice(0, 10) // Jami 30 ta savol
    const selectedReadings = shuffleArray(sections.reading).slice(0, 5)     // 30 savoldan keyin Reading
    const selectedWritings = shuffleArray(sections.writing).slice(0, 1)     // Eng oxirida Writing

    // Structured sequence: First 30 questions -> Reading -> Writing
    const structuredTests = [
      ...selectedMultiples,
      ...selectedNotes,
      ...selectedReadings,
      ...selectedWritings
    ]

    if (structuredTests.length === 0) {
      throw new Error("Could not construct a test package. Please check if section types match properly in your database.")
    }

    const shuffledIds = structuredTests.map(test => test.id)

    const { error: insertError } = await supabase.from('students').insert([
      {
        student_id: studentId.value,
        full_name: fullName.value.trim(),
        level: level.value,
        assigned_questions: shuffledIds
      }
    ])

    if (insertError) throw insertError

    await fetchStudents()
    isModalOpen.value = false
    
    showAlert('Success!', 'New student has been successfully added with structured tests.', 'success')
  } catch (err) {
    errorMsg.value = 'Error: ' + err.message
  } finally {
    loading.value = false
  }
}

const deleteStudent = (id, event) => {
  if (event) event.stopPropagation()
  confirmModal.value = {
    isOpen: true,
    title: 'Delete Student',
    message: 'Are you sure you want to delete this student from the database? This action cannot be undone.',
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('students').delete().eq('id', id)
        if (error) throw error
        await fetchStudents()
        closeConfirmModal()
        showAlert('Deleted', 'Student has been successfully removed.', 'success')
      } catch (err) {
        closeConfirmModal()
        showAlert('Error', 'Deletion failed: ' + err.message, 'error')
      }
    }
  }
}

const closeConfirmModal = () => {
  confirmModal.value.isOpen = false
}

const showAlert = (title, message, type = 'info') => {
  alertModal.value = {
    isOpen: true,
    title,
    message,
    type
  }
}

const closeAlertModal = () => {
  alertModal.value.isOpen = false
}

const copyToClipboard = (text, type, event) => {
  if (event) event.stopPropagation()
  navigator.clipboard.writeText(text)
  showAlert('Copied', `${type} successfully copied to clipboard: ${text}`, 'success')
}

const formatSectionName = (type) => {
  const names = {
    multiple_choice: 'Multiple Choice',
    note_completion: 'Note Completion',
    summary_completion: 'Summary Completion',
    short_answer: 'Short Answer Questions',
    reading: 'Reading Comprehension',
    writing: 'Writing Task'
  }
  return names[type] || type
}
</script>

<template>
  <div class="students-management">
    <div class="page-header">
      <div>
        <h2>Students Management</h2>
        <p>Click on the assigned questions count badge to view tests</p>
      </div>
      <button @click="openModal" class="add-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add New Student
      </button>
    </div>

    <!-- LEVEL FILTER BAR -->
    <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
      <span style="font-size: 0.9rem; font-weight: 600; color: #475569;">Filter by Level:</span>
      <button 
        @click="selectedFilterLevel = 'all'" 
        :style="{ background: selectedFilterLevel === 'all' ? '#2563eb' : '#ffffff', color: selectedFilterLevel === 'all' ? '#ffffff' : '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }">
        All
      </button>
      <button 
        @click="selectedFilterLevel = 'beginner'" 
        :style="{ background: selectedFilterLevel === 'beginner' ? '#2563eb' : '#ffffff', color: selectedFilterLevel === 'beginner' ? '#ffffff' : '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }">
        Beginner
      </button>
      <button 
        @click="selectedFilterLevel = 'elementary'" 
        :style="{ background: selectedFilterLevel === 'elementary' ? '#2563eb' : '#ffffff', color: selectedFilterLevel === 'elementary' ? '#ffffff' : '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }">
        Elementary
      </button>
    </div>

    <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

    <div class="table-card">
      <div class="table-responsive">
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
              <td colspan="6" class="empty-state">
                <div class="empty-content">
                  <p>No students available for this filter</p>
                </div>
              </td>
            </tr>
            <tr v-for="(student, index) in filteredStudents" :key="student.id">
              <td>{{ index + 1 }}</td>
              <td>
                <div class="student-name-cell">
                  <div class="avatar">{{ student.full_name.charAt(0).toUpperCase() }}</div>
                  <strong>{{ student.full_name }}</strong>
                </div>
              </td>
              <td>
                <span class="code-badge id-badge" @click="copyToClipboard(student.student_id, 'Student ID', $event)" title="Click to copy" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                  {{ student.student_id }}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </span>
              </td>
              <td>
                <span class="level-badge" :class="student.level">
                  {{ student.level }}
                </span>
              </td>
              <td>
                <span @click="openStudentDetailModal(student, $event)" title="Click to view tests" style="font-weight: 600; color: #2563eb; background: #eff6ff; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #bfdbfe;">
                  {{ student.assigned_questions?.length || 0 }} questions
                </span>
              </td>
              <td class="text-right">
                <button @click="deleteStudent(student.id, $event)" class="action-delete-btn" title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- STUDENT DETAILS & ASSIGNED TESTS MODAL -->
    <div v-if="isDetailModalOpen" class="modal-backdrop" @click.self="closeDetailModal">
      <div class="modal-card animate-scale" style="max-width: 800px; width: 90%; max-height: 85vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <h3 style="margin: 0; font-size: 1.25rem;">Student Details & Tests</h3>
            <p v-if="selectedStudent" style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9rem;">
              {{ selectedStudent.full_name }} (ID: <strong>{{ selectedStudent.student_id }}</strong>)
            </p>
          </div>
          <button @click="closeDetailModal" class="close-icon" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">
          <div v-if="detailLoading" style="text-align: center; padding: 2rem; color: #64748b;">
            Loading assigned tests...
          </div>
          
          <div v-else-if="studentTests.length === 0" style="text-align: center; padding: 2rem; color: #64748b;">
            No questions found for this student.
          </div>

          <div v-else style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
              Assigned Questions List (Total: {{ studentTests.length }})
            </div>

            <div v-for="(test, idx) in studentTests" :key="test.id" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.85rem; font-weight: bold; color: #2563eb;">#{{ idx + 1 }} - {{ formatSectionName(test.section_type) }}</span>
                <span class="level-badge" :class="test.level" style="font-size: 0.75rem; padding: 2px 8px;">{{ test.level }}</span>
              </div>

              <div v-if="test.passage_text" style="font-size: 0.9rem; color: #334155; margin-bottom: 0.5rem; background: #fff; padding: 8px; border-radius: 4px; border: 1px dashed #cbd5e1;">
                <strong>Passage:</strong> {{ test.passage_text }}
              </div>

              <div style="font-weight: 500; color: #0f172a; margin-bottom: 0.5rem; font-size: 0.95rem;">
                {{ test.question }}
              </div>

              <div v-if="test.option_a" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 0.5rem; font-size: 0.85rem;">
                <div :style="{ background: test.correct_answer === 'A' ? '#dcfce7' : '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }"><strong>A:</strong> {{ test.option_a }}</div>
                <div :style="{ background: test.correct_answer === 'B' ? '#dcfce7' : '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }"><strong>B:</strong> {{ test.option_b }}</div>
                <div :style="{ background: test.correct_answer === 'C' ? '#dcfce7' : '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }"><strong>C:</strong> {{ test.option_c }}</div>
                <div :style="{ background: test.correct_answer === 'D' ? '#dcfce7' : '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }"><strong>D:</strong> {{ test.option_d }}</div>
              </div>

              <div style="font-size: 0.85rem; color: #166534; background: #f0fdf4; padding: 6px 10px; border-radius: 4px; display: inline-block;">
                <strong>Correct Answer:</strong> {{ test.correct_answer }}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
          <button type="button" @click="closeDetailModal" class="cancel-btn">Close</button>
        </div>
      </div>
    </div>

    <!-- Add Student Modal -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card animate-scale">
        <div class="modal-header">
          <h3>Add New Student</h3>
          <button @click="closeModal" class="close-icon" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form @submit.prevent="handleCreateStudent" class="modal-form">
          <div class="field">
            <label>Full Name.</label>
            <input type="text" v-model="fullName" required placeholder="e.g. Alisher Valiyev" />
          </div>

          <div class="field">
            <label>Proficiency Level</label>
            <select v-model="level" required>
              <option value="beginner">Beginner</option>
              <option value="elementary">Elementary</option>
            </select>
          </div>

          <div class="field">
            <label>Auto-Generated Student ID</label>
            <input type="text" v-model="studentId" required readonly style="background-color: #f9f9f9; font-weight: bold; font-size: 16px; letter-spacing: 1px;" />
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-modal-btn" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save Student' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmModal.isOpen" class="modal-backdrop" @click.self="closeConfirmModal">
      <div class="modal-card animate-scale" style="max-width: 400px; text-align: center;">
        <div class="modal-header" style="justify-content: center; position: relative;">
          <h3 style="color: #ef4444;">{{ confirmModal.title }}</h3>
          <button @click="closeConfirmModal" class="close-icon" style="position: absolute; right: 1rem;" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div style="padding: 1.5rem;">
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">{{ confirmModal.message }}</p>
        </div>
        <div class="modal-actions" style="justify-content: center; padding-bottom: 1rem;">
          <button type="button" @click="closeConfirmModal" class="cancel-btn">Cancel</button>
          <button type="button" @click="confirmModal.onConfirm" class="submit-modal-btn" style="background-color: #ef4444;">Delete</button>
        </div>
      </div>
    </div>

    <!-- Alert Modal -->
    <div v-if="alertModal.isOpen" class="modal-backdrop" @click.self="closeAlertModal">
      <div class="modal-card animate-scale" style="max-width: 400px; text-align: center;">
        <div class="modal-header" style="justify-content: center; position: relative;">
          <h3 :style="{ color: alertModal.type === 'success' ? '#10b981' : '#ef4444' }">{{ alertModal.title }}</h3>
          <button @click="closeAlertModal" class="close-icon" style="position: absolute; right: 1rem;" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div style="padding: 1.5rem;">
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">{{ alertModal.message }}</p>
        </div>
        <div class="modal-actions" style="justify-content: center; padding-bottom: 1rem;">
          <button type="button" @click="closeAlertModal" class="submit-modal-btn">Got it</button>
        </div>
      </div>
    </div>
  </div>
</template>