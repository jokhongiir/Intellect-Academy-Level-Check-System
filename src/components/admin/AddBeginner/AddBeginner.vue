<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/outline'
import './AddBeginner.css'

const LEVEL = 'beginner'
const TABLE_NAME = 'beginner_tests'

/* ===================== QUESTION TYPES ===================== */
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

/* ===================== STATE ===================== */
const tests = ref([])
const loading = ref(false)
const errorMsg = ref('')
const searchQuery = ref('')

const isModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedTest = ref(null)

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

/* ===================== DYNAMIC FORM ===================== */
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

/* ===================== READING HELPERS ===================== */
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

/* ===================== COMPUTED ===================== */
const filteredTests = computed(() => {
  let list = tests.value.filter((t) => t.level === LEVEL)

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(
      (t) =>
        t.question?.toLowerCase().includes(q) ||
        t.passage_text?.toLowerCase().includes(q) ||
        t.section_type?.toLowerCase().includes(q)
    )
  }
  return list
})

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

/* ===================== MODALS ===================== */
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

/* ===================== API ===================== */
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
    console.error('Fetch tests error:', err.message)
    errorMsg.value = 'Testlarni yuklashda xatolik: ' + err.message
  }
}

onMounted(() => {
  fetchTests()
})

const handleCreateTest = async () => {
  errorMsg.value = ''

  if (questions.value.length === 0) {
    errorMsg.value = 'Kamida bitta savol bloki qo‘shing.'
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
    showAlert('Success', 'Yangi savol bloklari muvaffaqiyatli qo‘shildi.', 'success')
  } catch (err) {
    console.error(err)
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

const deleteSingleTest = (id, event) => {
  if (event) event.stopPropagation()

  confirmModal.value = {
    isOpen: true,
    title: 'Delete Question',
    message: 'Ushbu savolni o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.',
    onConfirm: async () => {
      try {
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)
        if (error) throw error
        await fetchTests()
        closeConfirmModal()
        showAlert('Deleted', 'Savol muvaffaqiyatli o‘chirildi.', 'success')
      } catch (err) {
        closeConfirmModal()
        showAlert('Error', 'O‘chirishda xatolik: ' + err.message, 'error')
      }
    }
  }
}

const deleteReadingBlock = (groupId, event) => {
  if (event) event.stopPropagation()

  confirmModal.value = {
    isOpen: true,
    title: 'Delete Reading Passage',
    message: 'Bu Reading passage va uning barcha savollarini o‘chiradi. Davom etasizmi?',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('reading_group_id', groupId)

        if (error) throw error
        await fetchTests()
        closeConfirmModal()
        showAlert('Deleted', 'Reading block muvaffaqiyatli o‘chirildi.', 'success')
      } catch (err) {
        closeConfirmModal()
        showAlert('Error', 'O‘chirishda xatolik: ' + err.message, 'error')
      }
    }
  }
}
</script>

<template>
  <div class="tests-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>Beginner — Tests & Questions</h2>
        <p>Beginner darajasi uchun test va savollarni boshqaring</p>
      </div>
      <button class="btn-primary" @click="openModal">
        <PlusIcon class="btn-icon" />
        Add New Question
      </button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <MagnifyingGlassIcon class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Savol yoki passage bo‘yicha qidirish..."
        />
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
              <th>Question Type</th>
              <th>Question / Passage</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="groupedTests.length === 0">
              <td colspan="4" class="empty-cell">
                <div class="empty-state">
                  <DocumentTextIcon class="empty-icon" />
                  <p>Hali savol qo‘shilmagan</p>
                </div>
              </td>
            </tr>

            <template v-for="(item, index) in groupedTests" :key="item.id">
              <!-- Reading Group -->
              <tr
                v-if="item.type === 'reading'"
                class="clickable-row"
                @click="openDetailModal(item)"
              >
                <td>{{ index + 1 }}</td>
                <td>
                  <span class="type-badge reading">📖 Reading</span>
                </td>
                <td>
                  <div class="q-cell">
                    <strong class="passage-preview">{{ item.passage_text }}</strong>
                    <span class="sub-text">{{ item.questions.length }} questions in this passage</span>
                  </div>
                </td>
                <td class="text-right">
                  <button
                    class="delete-btn"
                    title="Delete Reading Block"
                    @click.stop="deleteReadingBlock(item.id, $event)"
                  >
                    <TrashIcon class="action-icon" />
                  </button>
                </td>
              </tr>

              <!-- Single Question -->
              <tr
                v-else
                class="clickable-row"
                @click="openDetailModal(item.test)"
              >
                <td>{{ index + 1 }}</td>
                <td>
                  <span class="type-badge" :class="item.test.section_type">
                    {{ formatSectionName(item.test.section_type) }}
                  </span>
                </td>
                <td>
                  <div class="q-cell">
                    <strong>{{ item.test.question || item.test.passage_text }}</strong>
                    <span v-if="item.test.section_type === 'writing'" class="sub-text">
                      Limit: {{ item.test.max_words }} words
                    </span>
                  </div>
                </td>
                <td class="text-right">
                  <button
                    class="delete-btn"
                    title="Delete"
                    @click.stop="deleteSingleTest(item.test.id, $event)"
                  >
                    <TrashIcon class="action-icon" />
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
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
          <h3>{{ isReadingGroup ? 'Reading Passage' : 'Question Details' }}</h3>
          <button class="close-btn" @click="closeDetailModal">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="modal-body detail-body" v-if="selectedTest">
          <!-- Reading Group Detail -->
          <template v-if="selectedTest.type === 'reading'">
            <div class="reading-header">
              <div class="reading-icon">📖</div>
              <div>
                <h4>Reading Comprehension</h4>
                <span>{{ selectedTest.questions.length }} Questions</span>
              </div>
            </div>

            <div class="info-block">
              <strong>Reading Passage</strong>
              <p>{{ selectedTest.passage_text }}</p>
            </div>

            <div class="questions-list">
              <div
                v-for="(q, qIndex) in selectedTest.questions"
                :key="q.id"
                class="detail-question"
              >
                <div class="q-number">{{ qIndex + 1 }}</div>
                <div class="q-content">
                  <strong>{{ q.question }}</strong>
                  <div class="options-grid">
                    <div
                      v-for="opt in ['A', 'B', 'C', 'D']"
                      :key="opt"
                      class="option"
                      :class="{ correct: q.correct_answer?.toUpperCase() === opt }"
                    >
                      <strong>{{ opt }}:</strong>
                      {{ q['option_' + opt.toLowerCase()] }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Single Question Detail -->
          <template v-else>
            <div class="info-badges">
              <div>
                <span class="label">Level:</span>
                <span class="level-badge beginner">{{ selectedTest.level }}</span>
              </div>
              <div>
                <span class="label">Type:</span>
                <span class="type-badge" :class="selectedTest.section_type">
                  {{ formatSectionName(selectedTest.section_type) }}
                </span>
              </div>
            </div>

            <div v-if="selectedTest.question" class="info-block">
              <strong>Question Text</strong>
              <p>{{ selectedTest.question }}</p>
            </div>

            <div v-if="selectedTest.passage_text" class="info-block">
              <strong>Passage / Prompt</strong>
              <p>{{ selectedTest.passage_text }}</p>
            </div>

            <div
              v-if="selectedTest.section_type === 'multiple_choice'"
              class="options-grid"
            >
              <div
                v-for="opt in ['A', 'B', 'C', 'D']"
                :key="opt"
                v-show="selectedTest['option_' + opt.toLowerCase()]"
                class="option"
                :class="{
                  correct: selectedTest.correct_answer?.trim().toUpperCase() === opt
                }"
              >
                <strong>{{ opt }}:</strong>
                {{ selectedTest['option_' + opt.toLowerCase()] }}
              </div>
            </div>

            <div v-if="selectedTest.section_type === 'writing'" class="info-block">
              <strong>Word Limit</strong>
              <p>{{ selectedTest.max_words }} words</p>
            </div>
          </template>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeDetailModal">Close</button>
        </div>
      </div>
    </div>

    <!-- ===================== CREATE MODAL ===================== -->
    <div
      v-if="isModalOpen"
      class="modal-backdrop"
      @click.self="closeModal"
    >
      <div class="modal-card create-modal">
        <div class="modal-header">
          <h3>Add New Question — Beginner</h3>
          <button class="close-btn" @click="closeModal">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <div class="modal-body create-body">
          <form id="createTestForm" @submit.prevent="handleCreateTest">
            <div class="builder-header">
              <div class="builder-title">
                <div class="builder-icon">🧩</div>
                <div>
                  <h4>Test Questions</h4>
                  <p>Xohlagan tartibda turli xil savol turlarini qo‘shing</p>
                </div>
              </div>
              <div class="block-count">{{ questions.length }} Blocks</div>
            </div>

            <div v-if="questions.length === 0" class="empty-builder">
              <div class="empty-emoji">🧩</div>
              <p>Hali savol bloki qo‘shilmagan</p>
            </div>

            <div class="blocks-list">
              <div
                v-for="(q, qIndex) in questions"
                :key="q.id"
                class="question-block"
              >
                <div class="block-top">
                  <div class="block-number">
                    <span>{{ qIndex + 1 }}</span>
                    <strong>Question {{ qIndex + 1 }}</strong>
                  </div>

                  <div class="block-actions">
                    <span class="type-chip">
                      {{ iconForType(q.type) }} {{ formatSectionName(q.type) }}
                    </span>
                    <button
                      type="button"
                      class="btn-remove"
                      @click="removeQuestionBlock(qIndex)"
                    >
                      − Remove
                    </button>
                    <button
                      type="button"
                      class="btn-add-small"
                      @click="openTypePicker(qIndex)"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <!-- READING -->
                <template v-if="q.type === 'reading'">
                  <div class="field" v-if="isReadingGroupStart(qIndex)">
                    <label>Reading Passage</label>
                    <textarea
                      v-model="q.passage_text"
                      rows="4"
                      required
                      placeholder="Write or paste the complete reading passage..."
                    ></textarea>
                  </div>
                  <div class="field" v-else>
                    <label>Reading Passage</label>
                    <p class="shared-note">
                      📎 {{ readingGroupOwnerIndex(qIndex) + 1 }}-savoldagi passage bilan bo‘lishiladi
                    </p>
                  </div>

                  <div class="field">
                    <label>Question Text</label>
                    <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                  </div>

                  <div class="options-inputs">
                    <div class="option-input" v-for="opt in ['a','b','c','d']" :key="opt">
                      <span>{{ opt.toUpperCase() }}</span>
                      <input
                        type="text"
                        v-model="q['option_' + opt]"
                        required
                        :placeholder="`Option ${opt.toUpperCase()}`"
                      />
                    </div>
                  </div>

                  <div class="field inline">
                    <label>Correct Answer</label>
                    <select v-model="q.correct_answer" required>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </template>

                <!-- MULTIPLE CHOICE -->
                <template v-else-if="q.type === 'multiple_choice'">
                  <div class="field">
                    <label>Question Text</label>
                    <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                  </div>

                  <div class="options-inputs">
                    <div class="option-input" v-for="opt in ['a','b','c','d']" :key="opt">
                      <span>{{ opt.toUpperCase() }}</span>
                      <input
                        type="text"
                        v-model="q['option_' + opt]"
                        required
                        :placeholder="`Option ${opt.toUpperCase()}`"
                      />
                    </div>
                  </div>

                  <div class="field inline">
                    <label>Correct Answer</label>
                    <select v-model="q.correct_answer" required>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </template>

                <!-- NOTE / SUMMARY -->
                <template v-else-if="q.type === 'note_completion' || q.type === 'summary_completion'">
                  <div class="field">
                    <label>Passage / Prompt</label>
                    <textarea
                      v-model="q.passage_text"
                      rows="3"
                      required
                      placeholder="Example: The capital of Uzbekistan is ___."
                    ></textarea>
                  </div>
                  <div class="field">
                    <label>Question Text</label>
                    <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                  </div>
                  <div class="field">
                    <label>Correct Answer</label>
                    <input
                      type="text"
                      v-model="q.correct_answer"
                      required
                      placeholder="Enter the correct answer..."
                    />
                  </div>
                </template>

                <!-- SHORT ANSWER -->
                <template v-else-if="q.type === 'short_answer'">
                  <div class="field">
                    <label>Question Text</label>
                    <textarea v-model="q.question" rows="2" required placeholder="Enter the question..."></textarea>
                  </div>
                  <div class="field">
                    <label>Correct Answer</label>
                    <input
                      type="text"
                      v-model="q.correct_answer"
                      required
                      placeholder="Enter the correct answer..."
                    />
                  </div>
                </template>

                <!-- WRITING -->
                <template v-else-if="q.type === 'writing'">
                  <div class="field">
                    <label>Question / Task Title</label>
                    <textarea
                      v-model="q.question"
                      rows="2"
                      required
                      placeholder="Enter the writing task title..."
                    ></textarea>
                  </div>
                  <div class="field">
                    <label>Writing Prompt / Instructions</label>
                    <textarea
                      v-model="q.passage_text"
                      rows="4"
                      required
                      placeholder="Enter detailed writing instructions..."
                    ></textarea>
                  </div>
                  <div class="field">
                    <label>Word Limit</label>
                    <input type="number" v-model="q.max_words" min="1" required />
                  </div>
                </template>
              </div>
            </div>

            <button
              type="button"
              class="btn-add-block"
              @click="openTypePicker(null)"
            >
              <PlusIcon class="btn-icon" />
              Add New Block
            </button>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeModal">
            Cancel
          </button>
          <button
            type="submit"
            form="createTestForm"
            class="btn-primary"
            :disabled="loading"
          >
            {{ loading ? 'Saving...' : 'Save Questions' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== TYPE PICKER ===================== -->
    <div
      v-if="typePicker.open"
      class="modal-backdrop type-picker-overlay"
      @click.self="closeTypePicker"
    >
      <div class="modal-card type-picker-card">
        <div class="modal-header">
          <h3>Savol turini tanlang</h3>
          <button class="close-btn" @click="closeTypePicker">
            <XMarkIcon class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <div class="type-grid">
            <button
              v-for="t in QUESTION_TYPES"
              :key="t.value"
              type="button"
              class="type-item"
              @click="chooseBlockType(t.value)"
            >
              <span class="type-icon">{{ t.icon }}</span>
              <span>{{ t.label }}</span>
            </button>
          </div>
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
            :class="alertModal.type === 'success' ? 'success-title' : 'danger-title'"
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
          <button class="btn-primary" @click="closeAlertModal">Got it</button>
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
          <button class="btn-secondary" @click="closeConfirmModal">Cancel</button>
          <button class="btn-danger" @click="confirmModal.onConfirm">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>