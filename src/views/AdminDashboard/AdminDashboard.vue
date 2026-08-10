<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../api/supabaseClient'
import { OhVueIcon, addIcons } from "oh-vue-icons"
import { 
  RiUserSharedLine, 
  RiFileAddLine, 
  RiBarChartBoxLine, 
  RiLoader4Line, 
  RiRefreshLine,
  RiCheckDoubleLine,
  RiTeamLine,
  RiFolderShieldLine
} from "oh-vue-icons/icons"
import './AdminDashboard.css'

addIcons(
  RiUserSharedLine, 
  RiFileAddLine, 
  RiBarChartBoxLine, 
  RiLoader4Line, 
  RiRefreshLine,
  RiCheckDoubleLine,
  RiTeamLine,
  RiFolderShieldLine
)

const loading = ref(true)
const stats = ref({
  totalStudents: 0,
  totalTests: 0,
  totalResults: 0,
  submittedStudents: 0
})

const fetchDashboardStats = async () => {
  loading.value = true
  try {
    const { count: studentsCount, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
    
    if (studentsError) throw studentsError

    const { count: submittedCount, error: submittedError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_submitted', true)

    if (submittedError) throw submittedError

    const { count: testsCount, error: testsError } = await supabase
      .from('tests')
      .select('*', { count: 'exact', head: true })

    if (testsError) throw testsError

    const { count: resultsCount, error: resultsError } = await supabase
      .from('results')
      .select('*', { count: 'exact', head: true })

    if (resultsError) throw resultsError

    stats.value = {
      totalStudents: studentsCount || 0,
      submittedStudents: submittedCount || 0,
      totalTests: testsCount || 0,
      totalResults: resultsCount || 0
    }

  } catch (err) {
    console.error("Error loading dashboard statistics:", err.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardStats()
})
</script>

<template>
  <div class="ia-dashboard-home">
    <div class="ia-welcome-header">
      <div class="ia-welcome-text">
        <h1>Welcome Back, Admin!</h1>
        <p class="ia-subtitle">Intellect Academy CBT system management and monitoring center.</p>
      </div>
      <button @click="fetchDashboardStats" class="ia-refresh-btn" :disabled="loading" title="Refresh data">
        <OhVueIcon name="ri-refresh-line" :class="{ 'ia-spin': loading }" />
        <span>Refresh</span>
      </button>
    </div>

   
    <div v-if="loading" class="ia-admin-loading">
      <OhVueIcon name="ri-loader-4-line" scale="2.5" class="ia-spinner" />
      <p>Loading statistics...</p>
    </div>

    <div v-else class="ia-stats-grid">
      <div class="ia-stat-card">
        <div class="ia-stat-icon-box students">
          <OhVueIcon name="ri-team-line" scale="1.4" />
        </div>
        <div class="ia-stat-content">
          <span class="ia-stat-label">Total Students</span>
          <h2 class="ia-stat-value">{{ stats.totalStudents }}</h2>
          <span class="ia-stat-desc">Registered candidates</span>
        </div>
      </div>

      <div class="ia-stat-card">
        <div class="ia-stat-icon-box submitted">
          <OhVueIcon name="ri-check-double-line" scale="1.4" />
        </div>
        <div class="ia-stat-content">
          <span class="ia-stat-label">Submitted</span>
          <h2 class="ia-stat-value">{{ stats.submittedStudents }}</h2>
          <span class="ia-stat-desc">Completed exams</span>
        </div>
      </div>

      <div class="ia-stat-card">
        <div class="ia-stat-icon-box tests">
          <OhVueIcon name="ri-folder-shield-line" scale="1.4" />
        </div>
        <div class="ia-stat-content">
          <span class="ia-stat-label">Total Questions</span>
          <h2 class="ia-stat-value">{{ stats.totalTests }}</h2>
          <span class="ia-stat-desc">Available in database</span>
        </div>
      </div>

      <div class="ia-stat-card">
        <div class="ia-stat-icon-box results">
          <OhVueIcon name="ri-bar-chart-box-line" scale="1.4" />
        </div>
        <div class="ia-stat-content">
          <span class="ia-stat-label">Saved Results</span>
          <h2 class="ia-stat-value">{{ stats.totalResults }}</h2>
          <span class="ia-stat-desc">Reports ready</span>
        </div>
      </div>
    </div>

  
    <div class="ia-quick-sections">
      <h3 class="ia-section-title">Core Management Modules</h3>
      <div class="ia-modules-grid">
        <div class="ia-module-card">
          <div class="ia-mod-icon"><OhVueIcon name="ri-user-shared-line" scale="1.2" /></div>
          <div class="ia-mod-info">
            <h4>Add Students</h4>
            <p>Register students, generate custom IDs and passwords, and assign relevant question sets.</p>
          </div>
        </div>

        <div class="ia-module-card">
          <div class="ia-mod-icon"><OhVueIcon name="ri-file-add-line" scale="1.2" /></div>
          <div class="ia-mod-info">
            <h4>Add Test</h4>
            <p>Create multiple-choice questions, reading passages, note completions, and writing modules.</p>
          </div>
        </div>

        <div class="ia-module-card">
          <div class="ia-mod-icon"><OhVueIcon name="ri-bar-chart-box-line" scale="1.2" /></div>
          <div class="ia-mod-info">
            <h4>Results & Analytics</h4>
            <p>Monitor student test submissions, review performance percentages, and track correct/wrong answers.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 