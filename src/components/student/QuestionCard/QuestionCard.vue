<script setup>
import { computed } from 'vue'
import './QuestionCard.css'

/* =========================================
    1. TASHQARIDAN KELADIGAN MA'LUMOTLAR (PROPS)
========================================= */
const props = defineProps({
  questionData: {
    type: Object,
    required: true
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  questionNumber: {
    type: Number,
    default: 1
  }
})

/* =========================================
    2. OTA KOMPONENTGA JAVOBNI YUBORISH (EMITS)
========================================= */
const emit = defineEmits(['update:modelValue'])

/* =========================================
    3. IKKI TOMONLAMA BOG'LANISH (v-model)
========================================= */
const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/* =========================================
    4. TEST VARIANTLARI (A, B, C, D)
========================================= */
const options = ['A', 'B', 'C', 'D']

/* =========================================
    5. SAVOL TURINI XAVFSIZ (NORMALIZATSIYA QILINGAN)
========================================= */
const normalizedType = computed(() =>
  String(props.questionData?.section_type || '').trim().toLowerCase()
)

const isChoiceType = computed(() =>
  normalizedType.value === 'multiple_choice' || normalizedType.value === 'reading'
)
const isCompletionType = computed(() =>
  normalizedType.value === 'note_completion' || normalizedType.value === 'summary_completion'
)
const isShortAnswerType = computed(() => normalizedType.value === 'short_answer')
const isWritingType = computed(() => normalizedType.value === 'writing')

/* =========================================
    6. SAVOL TURINI CHIROYLI MATNGA O'TKAZISH
========================================= */
const TYPE_LABELS = {
  multiple_choice: 'Multiple Choice',
  reading: 'Reading Comprehension',
  note_completion: 'Note Completion',
  summary_completion: 'Summary Completion',
  short_answer: 'Short Answer',
  writing: 'Writing'
}

const formatType = computed(() => {
  if (TYPE_LABELS[normalizedType.value]) return TYPE_LABELS[normalizedType.value]
  return normalizedType.value.replaceAll('_', ' ').toUpperCase()
})

/* =========================================
    7. VARIANT MATNINI OLISH
========================================= */
const getOptionText = (letter) => {
  return props.questionData?.[`option_${letter.toLowerCase()}`] || ''
}

/* =========================================
    8. RADIO GURUH NOMI (har doim noyob)
========================================= */
const radioGroupName = computed(
  () => `question-${props.questionNumber}-${props.questionData?.id ?? 'na'}`
)

/* =========================================
    9. YOZMA ISHLAR UCHUN SO'ZLARNI SANASH
========================================= */
const wordCount = computed(() => {
  const value = String(props.modelValue || '').trim()
  if (!value) return 0
  return value.split(/\s+/).filter(Boolean).length
})

const maxWords = computed(() => props.questionData?.max_words || 70)
const isOverLimit = computed(() => wordCount.value > maxWords.value)

/* =========================================
    10. VARIANT TANLANGANLIGINI TEKSHIRISH
========================================= */
const isSelected = (option) => {
  return String(props.modelValue || '').trim().toUpperCase() === option
}
</script>

<template>
  <article class="question-card">

    <!-- =========================
         SAVOL SARLAVHASI (HEADER)
    ========================== -->
    <header class="question-header">
      <div class="question-header-left">
        <div class="question-number">
          {{ questionNumber }}
        </div>
        <div class="question-heading">
          <span class="question-label">
            Savol {{ questionNumber }}
          </span>
          <span class="question-required">
            Mandatory
          </span>
        </div>
      </div>

      <span class="q-type-badge">
        {{ formatType }}
      </span>
    </header>


    <!-- =========================
          O'QISH MATNI (PASSAGE)
    ========================== -->
    <section v-if="questionData?.passage_text" class="passage-box">
      <div class="passage-title">
        <div class="passage-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          </svg>
        </div>
        <div>
          <span class="passage-label">Read it</span>
          <p class="passage-description">
            Read the text carefully before answering.
          </p>
        </div>
      </div>
      <div class="passage-content">
        {{ questionData.passage_text }}
      </div>
    </section>


    <!-- =========================
         SAVOL TANA QISMI (BODY)
    ========================== -->
    <section class="question-body">
      <div class="question-text-wrapper">
        <span class="question-text-label">Question</span>
        <h2 class="q-text">
          {{ questionData?.question }}
        </h2>
      </div>


      <!-- 1. TEST (MULTIPLE CHOICE / READING) -->
      <div v-if="isChoiceType" class="options-list" role="radiogroup">
        <label
          v-for="option in options"
          :key="`${radioGroupName}-${option}`"
          class="option-item"
          :class="{ selected: isSelected(option) }"
        >
          <input
            type="radio"
            :name="radioGroupName"
            :value="option"
            v-model="localValue"
          />
          <span class="custom-radio">
            <span class="radio-dot"></span>
          </span>
          <span class="option-letter">{{ option }}</span>
          <span class="option-text">{{ getOptionText(option) }}</span>

          <span v-if="isSelected(option)" class="selected-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M5 12l4 4L19 6" />
            </svg>
          </span>
        </label>
      </div>


      <!-- 2. ESLATMA YOKI XULOSA TO'LDIRISH (NOTE / SUMMARY) -->
      <div v-else-if="isCompletionType" class="completion-box">
        <div class="answer-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16v16H4z" />
            <path d="M8 9h8M8 13h6M8 17h4" />
          </svg>
        </div>
        <input
          type="text"
          class="answer-input"
          v-model="localValue"
          placeholder="Write your answer here..."
          autocomplete="off"
        />
      </div>


      <!-- 3. QISQA JAVOB (SHORT ANSWER) -->
      <div v-else-if="isShortAnswerType" class="short-answer-box">
        <div class="answer-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 5h16v11H7l-3 3V5Z" />
          </svg>
        </div>
        <input
          type="text"
          class="answer-input"
          v-model="localValue"
          placeholder="Enter a short answer..."
          autocomplete="off"
        />
      </div>


      <!-- 4. YOZMA MASHQ (WRITING) -->
      <div v-else-if="isWritingType" class="writing-box">
        <textarea
          class="writing-textarea"
          rows="8"
          v-model="localValue"
          placeholder="Write your answer here..."
        ></textarea>

        <div class="writing-footer">
          <div class="writing-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 5h16M4 12h16M4 19h10" />
            </svg>
            <span>Write your answer clearly and completely.</span>
          </div>

          <div class="word-counter" :class="{ 'over-limit': isOverLimit }">
            <span>{{ wordCount }}</span>
            <span class="counter-divider">/</span>
            <span>{{ maxWords }}</span>
            <span class="words-text">so‘z</span>
          </div>
        </div>
      </div>


      <!-- 5. NOMA'LUM YOKI XATO TUR -->
      <div v-else class="unsupported-question">
        <div class="unsupported-icon">!</div>
        <div>
          <strong>Unknown question type</strong>
          <p>Tur: {{ questionData?.section_type || 'kiritilmagan' }}</p>
        </div>
      </div>

    </section>

  </article>
</template>