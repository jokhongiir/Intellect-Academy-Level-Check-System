<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import './AddBeginner.css'

const LEVEL = 'beginner'
const TABLE_NAME = 'beginner_tests'

/* =========================================
    QUESTION TYPE CATALOG
========================================= */

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '📝' },
  { value: 'reading', label: 'Reading Comprehension', icon: '📖' },
  { value: 'note_completion', label: 'Note Completion', icon: '🗒️' },
  { value: 'summary_completion', label: 'Summary Completion', icon: '📄' },
  { value: 'short_answer', label: 'Short Answer', icon: '✏️' },
  { value: 'writing', label: 'Writing Task', icon: '✍️' }
]

const formatSectionName = (type) => {
  const found = QUESTION_TYPES.find((t) => t.value === type)
  return found ? found.label : type
}

const iconForType = (type) => {
  const found = QUESTION_TYPES.find((t) => t.value === type)
  return found ? found.icon : '❓'
}

/* =========================================
    STATE MANAGEMENT
========================================= */

const tests = ref([])
const isModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedTest = ref(null)

const loading = ref(false)
const errorMsg = ref('')

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

/* =========================================
    DYNAMIC FORM STATE
========================================= */

const makeEmptyQuestion = (type) => ({
  id: crypto.randomUUID(),
  type,
  passage_text: '',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  max_words: 70
})

const questions = ref([])

/* =========================================
    TYPE PICKER
========================================= */

const typePicker = ref({
  open: false,
  insertIndex: null
})

const openTypePicker = (insertIndex = null) => {
  typePicker.value = { open: true, insertIndex }
}

const closeTypePicker = () => {
  typePicker.value.open = false
}

const chooseBlockType = (type) => {
  const newBlock = makeEmptyQuestion(type)
  const { insertIndex } = typePicker.value

  if (insertIndex === null || insertIndex === undefined) {
    questions.value.push(newBlock)
  } else {
    questions.value.splice(insertIndex + 1, 0, newBlock)
  }

  closeTypePicker()
}

const removeQuestionBlock = (index) => {
  questions.value.splice(index, 1)
}

/* =========================================
    READING GROUP HELPERS
========================================= */

const isReadingGroupStart = (index) => {
  const q = questions.value[index]
  if (!q || q.type !== 'reading') return false
  const prev = questions.value[index - 1]
  return !prev || prev.type !== 'reading'
}

const readingGroupOwnerIndex = (index) => {
  let i = index
  while (i > 0 && questions.value[i - 1]?.type === 'reading') i--
  return i
}

/* =========================================
    COMPUTED PROPERTIES
========================================= */

const filteredTests = computed(() =>
  tests.value.filter((test) => test.level === LEVEL)
)

const groupedTests = computed(() => {
  const result = []
  const readingGroups = new Map()

  filteredTests.value.forEach((test) => {
    if (test.section_type === 'reading') {
      const groupId = test.reading_group_id || `old-reading-${test.passage_text}`

      if (!readingGroups.has(groupId)) {
        readingGroups.set(groupId, {
          type: 'reading',
          id: groupId,
          passage_text: test.passage_text,
          questions: []
        })
        result.push(readingGroups.get(groupId))
      }

      readingGroups.get(groupId).questions.push(test)
    } else {
      result.push({
        type: 'single',
        id: test.id,
        test
      })
    }
  })

  return result
})

const isReadingGroup = computed(() => selectedTest.value?.type === 'reading')

/* =========================================
    MODAL HANDLERS
========================================= */

const openModal = () => {
  questions.value = []
  errorMsg.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  closeTypePicker()
}

const openDetailModal = (item) => {
  selectedTest.value = item
  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedTest.value = null
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

/* =========================================
    API ACTIONS (SUPABASE)
========================================= */

const fetchTests = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('level', LEVEL)
      .order('created_at', { ascending: false })

    if (error) throw error
    tests.value = data || []
  } catch (err) {
    console.error('Error fetching tests:', err.message)
    errorMsg.value = 'Failed to load tests: ' + err.message
  }
}

onMounted(() => {
  fetchTests()
})

const handleCreateTest = async () => {
  errorMsg.value = ''

  if (questions.value.length === 0) {
    errorMsg.value = 'Error: Kamida bitta savol bloki qo\'shing.'
    return
  }

  loading.value = true

  try {
    const payloads = []
    let i = 0

    while (i < questions.value.length) {
      const q = questions.value[i]

      if (q.type === 'reading') {
        const passage = (q.passage_text || '').trim()
        if (!passage) {
          throw new Error(`Reading passage matni kiritilishi shart (${i + 1}-savol).`)
        }

        const groupId = crypto.randomUUID()
        let j = i

        while (j < questions.value.length && questions.value[j].type === 'reading') {
          const rq = questions.value[j]
          if (!rq.question?.trim()) {
            throw new Error(`Savol matni kiritilishi shart (${j + 1}-savol).`)
          }

          payloads.push({
            level: LEVEL,
            section_type: 'reading',
            passage_text: passage,
            reading_group_id: groupId,
            question: rq.question.trim(),
            option_a: rq.option_a.trim(),
            option_b: rq.option_b.trim(),
            option_c: rq.option_c.trim(),
            option_d: rq.option_d.trim(),
            correct_answer: rq.correct_answer
          })

          j++
        }

        i = j
      } else {
        if (!q.question?.trim()) {
          throw new Error(`Savol matni kiritilishi shart (${i + 1}-savol).`)
        }

        const payload = {
          level: LEVEL,
          section_type: q.type,
          passage_text: ['summary_completion', 'note_completion', 'writing'].includes(q.type)
            ? (q.passage_text || '').trim()
            : null,
          question: (q.question || '').trim(),
          correct_answer: q.correct_answer || 'N/A'
        }

        if (q.type === 'multiple_choice') {
          payload.option_a = q.option_a.trim()
          payload.option_b = q.option_b.trim()
          payload.option_c = q.option_c.trim()
          payload.option_d = q.option_d.trim()
        }

        if (q.type === 'writing') {
          payload.max_words = q.max_words
        }

        payloads.push(payload)
        i++
      }
    }

    const { error } = await supabase.from(TABLE_NAME).insert(payloads)
    if (error) throw error

    await fetchTests()
    closeModal()
    showAlert('Success!', 'Yangi savol bloklari muvaffaqiyatli qo\'shildi.', 'success')
  } catch (err) {
    console.error(err)
    errorMsg.value = 'Error: ' + err.message
  } finally {
    loading.value = false
  }
}

const deleteSingleTest = (id, event) => {
  if (event) event.stopPropagation()

  confirmModal.value = {
    isOpen: true,
    title: 'Delete Question',
    message: 'Are you sure you want to delete this question? This action cannot be undone.',
    onConfirm: async () => {
      try {
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)
        if (error) throw error

        await fetchTests()
        closeConfirmModal()
        showAlert('Deleted', 'Question has been deleted successfully.', 'success')
      } catch (err) {
        closeConfirmModal()
        showAlert('Error', 'Failed to delete: ' + err.message, 'error')
      }
    }
  }
}

const deleteReadingBlock = (groupId, event) => {
  if (event) event.stopPropagation()

  confirmModal.value = {
    isOpen: true,
    title: 'Delete Reading Passage',
    message: 'This will delete the entire Reading passage and all its questions. Are you sure?',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('reading_group_id', groupId)

        if (error) throw error

        await fetchTests()
        closeConfirmModal()
        showAlert('Deleted', 'Reading passage and all its questions have been deleted.', 'success')
      } catch (err) {
        closeConfirmModal()
        showAlert('Error', 'Failed to delete Reading block: ' + err.message, 'error')
      }
    }
  }
}
</script>

<template>
  <div class="ia-wrapper">
    <!-- HEADER -->
    <div class="ia-header-box">
      <div>
        <h2>Beginner — Tests & Questions</h2>
        <p>Create and manage assessments for the Beginner level</p>
      </div>

      <button type="button" @click="openModal" class="ia-primary-btn">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Add New Question</span>
      </button>
    </div>

    <!-- ERROR BANNER -->
    <div v-if="errorMsg" class="ia-alert-banner">
      {{ errorMsg }}
    </div>

    <!-- TABLE CONTAINER -->
    <div class="ia-container-card">
      <div class="ia-scroll-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Question Type</th>
              <th>Question / Passage Details</th>
              <th class="ia-align-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="groupedTests.length === 0">
              <td colspan="4" class="ia-no-data">
                <div class="ia-no-data-box">
                  <div style="font-size: 38px;">📝</div>
                  <p>No questions available yet</p>
                </div>
              </td>
            </tr>

            <template v-for="(item, index) in groupedTests" :key="item.id">
              <tr
                v-if="item.type === 'reading'"
                class="ia-reading-table-row"
                @click="openDetailModal(item)"
              >
                <td>{{ index + 1 }}</td>
                <td>
                  <span class="ia-badge-type reading">📖 Reading</span>
                </td>
                <td>
                  <div class="ia-reading-table-content">
                    <strong>{{ item.passage_text }}</strong>
                    <span class="ia-sub-txt">{{ item.questions.length }} questions in this passage</span>
                  </div>
                </td>
                <td class="ia-align-end">
                  <button
                    type="button"
                    class="ia-delete-icon-btn"
                    title="Delete Reading Block"
                    @click.stop="deleteReadingBlock(item.id, $event)"
                  >
                    🗑
                  </button>
                </td>
              </tr>

              <tr v-else @click="openDetailModal(item.test)" style="cursor: pointer;">
                <td>{{ index + 1 }}</td>
                <td>
                  <span class="ia-badge-type" :class="item.test.section_type">
                    {{ formatSectionName(item.test.section_type) }}
                  </span>
                </td>
                <td>
                  <div class="ia-q-cell">
                    <!-- Barcha turlar, jumladan writing uchun ham savol matni chiqariladi -->
                    <strong>{{ item.test.question || item.test.passage_text }}</strong>
                    <span v-if="item.test.section_type === 'writing'" class="ia-sub-txt">
                      Limit: {{ item.test.max_words }} words
                    </span>
                  </div>
                </td>
                <td class="ia-align-end">
                  <button
                    type="button"
                    @click="deleteSingleTest(item.test.id, $event)"
                    class="ia-delete-icon-btn"
                    title="Delete"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- DETAIL MODAL -->
    <div v-if="isDetailModalOpen" class="ia-modal-overlay" @click.self="closeDetailModal">
      <div class="ia-popup-box ia-popup-lg ia-anim">
        <div class="ia-popup-top">
          <h3>{{ isReadingGroup ? 'Reading Passage' : 'Question Details' }}</h3>
          <button type="button" @click="closeDetailModal" class="ia-close-btn">&times;</button>
        </div>

        <div class="ia-popup-body" v-if="selectedTest">
          <template v-if="selectedTest.type === 'reading'">
            <div class="ia-reading-detail-header">
              <div class="ia-reading-icon">📖</div>
              <div>
                <h4>Reading Comprehension</h4>
                <span>{{ selectedTest.questions.length }} Questions</span>
              </div>
            </div>

            <div class="ia-box-block ia-passage-detail">
              <strong>Reading Passage</strong>
              <p>{{ selectedTest.passage_text }}</p>
            </div>

            <div class="ia-reading-detail-list">
              <div
                v-for="(q, qIndex) in selectedTest.questions"
                :key="q.id"
                class="ia-detail-question"
              >
                <div class="ia-detail-question-number">{{ qIndex + 1 }}</div>
                <div class="ia-detail-question-content">
                  <strong>{{ q.question }}</strong>
                  <div class="ia-detail-options">
                    <div
                      v-for="opt in ['A', 'B', 'C', 'D']"
                      :key="opt"
                      class="ia-detail-option"
                      :class="{ correct: q.correct_answer?.toUpperCase() === opt }"
                    >
                      <span>{{ opt }}</span>
                      {{ q['option_' + opt.toLowerCase()] }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="ia-info-badges">
              <div>
                <strong>Level:</strong>
                <span class="ia-badge-level">{{ selectedTest.level }}</span>
              </div>
              <div>
                <strong>Type:</strong>
                <span class="ia-badge-type" :class="selectedTest.section_type">
                  {{ formatSectionName(selectedTest.section_type) }}
                </span>
              </div>
            </div>

            <!-- Writing va boshqa turlar uchun Question matni -->
            <div v-if="selectedTest.question" class="ia-box-block">
              <strong>Question Text:</strong>
              <p>{{ selectedTest.question }}</p>
            </div>

            <div v-if="selectedTest.passage_text" class="ia-box-block">
              <strong>Passage / Prompt Text:</strong>
              <p>{{ selectedTest.passage_text }}</p>
            </div>

            <div v-if="selectedTest.section_type === 'multiple_choice'" class="ia-options-grid">
              <div
                v-for="opt in ['A', 'B', 'C', 'D']"
                :key="opt"
                v-show="selectedTest['option_' + opt.toLowerCase()]"
                class="ia-option-row"
                :class="{
                  'ia-is-correct': selectedTest.correct_answer?.trim().toUpperCase() === opt
                }"
              >
                <span class="ia-opt-circle">{{ opt }}</span>
                <span class="ia-opt-value">{{ selectedTest['option_' + opt.toLowerCase()] }}</span>
              </div>
            </div>

            <div v-if="selectedTest.section_type === 'writing'" class="ia-box-block">
              <strong>Word Limit:</strong>
              <span>{{ selectedTest.max_words }} words</span>
            </div>
          </template>
        </div>

        <div class="ia-popup-bottom">
          <button type="button" @click="closeDetailModal" class="ia-sec-btn">Close</button>
        </div>
      </div>
    </div>

    <!-- CREATE MODAL -->
    <div v-if="isModalOpen" class="ia-modal-overlay" @click.self="closeModal">
      <div class="ia-popup-box ia-popup-lg">
        <div class="ia-popup-top">
          <h3>Add New Question — Beginner</h3>
          <button type="button" @click="closeModal" class="ia-close-btn">&times;</button>
        </div>

        <div class="ia-popup-body">
          <form @submit.prevent="handleCreateTest" id="createTestForm" class="ia-form-container">
            <div class="reading-builder">
              <div class="reading-builder-header">
                <div class="reading-builder-title">
                  <div class="reading-builder-icon">🧩</div>
                  <div>
                    <h4>Test Questions</h4>
                    <p>Xohlagan tartibda turli xil savol turlarini qo'shishingiz mumkin</p>
                  </div>
                </div>
                <div class="reading-question-count">{{ questions.length }} Blocks</div>
              </div>

              <div v-if="questions.length === 0" class="ia-no-data-box" style="padding: 30px 0;">
                <div style="font-size: 34px;">🧩</div>
                <p>Hali savol bloki qo'shilmagan</p>
              </div>

              <div class="reading-question-list">
                <div
                  v-for="(q, qIndex) in questions"
                  :key="q.id"
                  class="reading-question-builder"
                >
                  <div class="reading-question-builder-top">
                    <div class="reading-q-number">
                      <span>{{ qIndex + 1 }}</span>
                      <strong>Question {{ qIndex + 1 }}</strong>
                    </div>

                    <div class="reading-block-actions" style="display: flex; gap: 8px; align-items: center;">
                      <span class="ia-block-type-chip">
                        {{ iconForType(q.type) }} {{ formatSectionName(q.type) }}
                      </span>

                      <button
                        type="button"
                        @click="removeQuestionBlock(qIndex)"
                        class="reading-remove-btn"
                        title="Remove this question block"
                      >
                        − Remove
                      </button>

                      <button
                        type="button"
                        @click="openTypePicker(qIndex)"
                        class="reading-add-btn"
                        style="padding: 4px 10px; font-size: 12px; margin: 0;"
                        title="Add new question after this"
                      >
                        <span>+</span> Add New Question
                      </button>
                    </div>
                  </div>

                  <!-- READING TYPE -->
                  <template v-if="q.type === 'reading'">
                    <div class="ia-input-group" v-if="isReadingGroupStart(qIndex)">
                      <label>Reading Passage</label>
                      <textarea
                        v-model="q.passage_text"
                        rows="5"
                        required
                        placeholder="Write or paste the complete reading passage here..."
                      ></textarea>
                    </div>
                    <div class="ia-input-group" v-else>
                      <label>Reading Passage</label>
                      <p class="ia-sub-txt">
                        📎 {{ readingGroupOwnerIndex(qIndex) + 1 }}-savoldagi passage bilan bo'lishiladi
                      </p>
                    </div>

                    <div class="ia-input-group">
                      <label>Question Text</label>
                      <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                    </div>

                    <div class="reading-options-grid">
                      <div class="reading-option-input">
                        <span>A</span>
                        <input type="text" v-model="q.option_a" required placeholder="Option A" />
                      </div>
                      <div class="reading-option-input">
                        <span>B</span>
                        <input type="text" v-model="q.option_b" required placeholder="Option B" />
                      </div>
                      <div class="reading-option-input">
                        <span>C</span>
                        <input type="text" v-model="q.option_c" required placeholder="Option C" />
                      </div>
                      <div class="reading-option-input">
                        <span>D</span>
                        <input type="text" v-model="q.option_d" required placeholder="Option D" />
                      </div>
                    </div>

                    <div class="reading-correct-row">
                      <label>Correct Answer</label>
                      <select v-model="q.correct_answer" required>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </template>

                  <!-- MULTIPLE CHOICE TYPE -->
                  <template v-else-if="q.type === 'multiple_choice'">
                    <div class="ia-input-group">
                      <label>Question Text</label>
                      <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                    </div>

                    <div class="reading-options-grid">
                      <div class="reading-option-input">
                        <span>A</span>
                        <input type="text" v-model="q.option_a" required placeholder="Option A" />
                      </div>
                      <div class="reading-option-input">
                        <span>B</span>
                        <input type="text" v-model="q.option_b" required placeholder="Option B" />
                      </div>
                      <div class="reading-option-input">
                        <span>C</span>
                        <input type="text" v-model="q.option_c" required placeholder="Option C" />
                      </div>
                      <div class="reading-option-input">
                        <span>D</span>
                        <input type="text" v-model="q.option_d" required placeholder="Option D" />
                      </div>
                    </div>

                    <div class="reading-correct-row">
                      <label>Correct Answer</label>
                      <select v-model="q.correct_answer" required>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </template>

                  <!-- NOTE / SUMMARY COMPLETION -->
                  <template v-else-if="q.type === 'note_completion' || q.type === 'summary_completion'">
                    <div class="ia-input-group">
                      <label>Passage Text / Prompt</label>
                      <textarea
                        v-model="q.passage_text"
                        rows="3"
                        required
                        placeholder="Example: The capital of Uzbekistan is ___."
                      ></textarea>
                    </div>

                    <div class="ia-input-group">
                      <label>Question Text</label>
                      <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                    </div>

                    <div class="ia-input-group">
                      <label>Correct Answer</label>
                      <input
                        type="text"
                        v-model="q.correct_answer"
                        required
                        placeholder="Enter the correct answer word or phrase..."
                      />
                    </div>
                  </template>

                  <!-- SHORT ANSWER -->
                  <template v-else-if="q.type === 'short_answer'">
                    <div class="ia-input-group">
                      <label>Question Text</label>
                      <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                    </div>

                    <div class="ia-input-group">
                      <label>Correct Answer</label>
                      <input
                        type="text"
                        v-model="q.correct_answer"
                        required
                        placeholder="Enter the correct answer word or phrase..."
                      />
                    </div>
                  </template>

                  <!-- WRITING TASK -->
                  <template v-else-if="q.type === 'writing'">
                    <div class="ia-input-group">
                      <label>Question Text</label>
                      <textarea
                        v-model="q.question"
                        rows="2"
                        required
                        placeholder="Enter the writing question or task title..."
                      ></textarea>
                    </div>

                    <div class="ia-input-group">
                      <label>Writing Prompt / Description</label>
                      <textarea
                        v-model="q.passage_text"
                        rows="4"
                        required
                        placeholder="Enter the detailed writing instructions..."
                      ></textarea>
                    </div>

                    <div class="ia-input-group">
                      <label>Word Limit</label>
                      <input type="number" v-model="q.max_words" min="1" required />
                    </div>
                  </template>
                </div>
              </div>

              <button
                type="button"
                @click="openTypePicker(null)"
                class="reading-add-btn"
                style="margin-top: 15px; width: 100%; justify-content: center;"
              >
                <span>+</span> Add New Block
              </button>
            </div>
          </form>
        </div>

        <div class="ia-popup-bottom">
          <button type="button" @click="closeModal" class="ia-sec-btn">Cancel</button>
          <button type="submit" form="createTestForm" :disabled="loading" class="ia-primary-btn">
            {{ loading ? 'Saving...' : 'Save Questions' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TYPE PICKER -->
    <div v-if="typePicker.open" class="ia-modal-overlay ia-type-picker-overlay" @click.self="closeTypePicker">
      <div class="ia-popup-box ia-type-picker-box ia-anim">
        <div class="ia-popup-top">
          <h3>Savol turini tanlang</h3>
          <button type="button" @click="closeTypePicker" class="ia-close-btn">&times;</button>
        </div>
        <div class="ia-popup-body">
          <div class="ia-type-picker-grid">
            <button
              v-for="t in QUESTION_TYPES"
              :key="t.value"
              type="button"
              class="ia-type-picker-item"
              @click="chooseBlockType(t.value)"
            >
              <span class="ia-type-picker-icon">{{ t.icon }}</span>
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ALERT MODAL -->
    <div v-if="alertModal.isOpen" class="ia-modal-overlay" @click.self="closeAlertModal">
      <div class="ia-popup-box ia-anim">
        <div class="ia-popup-top">
          <h3>{{ alertModal.title }}</h3>
          <button type="button" @click="closeAlertModal" class="ia-close-btn">&times;</button>
        </div>
        <div class="ia-popup-body">
          <p>{{ alertModal.message }}</p>
        </div>
        <div class="ia-popup-bottom">
          <button type="button" @click="closeAlertModal" class="ia-primary-btn">OK</button>
        </div>
      </div>
    </div>

    <!-- CONFIRM MODAL -->
    <div v-if="confirmModal.isOpen" class="ia-modal-overlay" @click.self="closeConfirmModal">
      <div class="ia-popup-box ia-anim">
        <div class="ia-popup-top">
          <h3>{{ confirmModal.title }}</h3>
          <button type="button" @click="closeConfirmModal" class="ia-close-btn">&times;</button>
        </div>
        <div class="ia-popup-body">
          <p>{{ confirmModal.message }}</p>
        </div>
        <div class="ia-popup-bottom">
          <button type="button" @click="closeConfirmModal" class="ia-sec-btn">Cancel</button>
          <button type="button" @click="confirmModal.onConfirm" class="ia-primary-btn" style="background-color: #ef4444;">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ia-type-picker-overlay {
  z-index: 9999;
}

.ia-type-picker-box {
  max-width: 480px;
  width: 100%;
}

.ia-type-picker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.ia-type-picker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  transition: all 0.15s ease;
  text-align: center;
}

.ia-type-picker-item:hover {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4338ca;
  transform: translateY(-1px);
}

.ia-type-picker-icon {
  font-size: 22px;
}

.ia-block-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.4;
}
</style>