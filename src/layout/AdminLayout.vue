<script setup>
import { ref } from 'vue'
import AdminSidebar from '../components/admin/AdminSidebar/AdminSidebar.vue'
import AdminNavbar from '../components/admin/AdminNavbar/AdminNavbar.vue'
import AddStudent from '../components/admin/AddStudent/AddStudent.vue'
import AddBeginner from '../components/admin/AddBeginner/AddBeginner.vue'
import AddElementary from '../components/admin/AddElemantary/AddElemantary.vue'
import AddIntermediate from '../components/admin/AddIntermediate/AddIntermediate.vue'
import AdminResults from '../components/admin/AdminResults/AdminResults.vue'

const activeTab = ref('dashboard')
const isCollapsed = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const setActiveTab = (tab) => {
  activeTab.value = tab
}

const onLogout = () => {
  try {
    localStorage.removeItem('admin')
    localStorage.removeItem('current_admin')
    localStorage.removeItem('admin_user')
  } catch (error) {
    console.error('Logout error:', error)
  }
  window.location.href = '/admin-login'
}
</script>

<template>
  <div class="admin-layout">
    <AdminSidebar
      :active-tab="activeTab"
      :set-active-tab="setActiveTab"
      :on-logout="onLogout"
      :is-collapsed="isCollapsed"
    />

    <div class="admin-main">
      <AdminNavbar
        :on-logout="onLogout"
        :toggle-sidebar="toggleSidebar"
        :is-collapsed="isCollapsed"
      />

      <main class="admin-content">
        <!-- Dashboard -->
        <section v-if="activeTab === 'dashboard'" class="page-section">
          <div class="page-header">
            <span class="page-eyebrow">ADMIN PANEL</span>
            <h1>Dashboard</h1>
            <p>Intellect Academy boshqaruv paneliga xush kelibsiz.</p>
          </div>
        </section>

        <!-- Add Students -->
        <section v-else-if="activeTab === 'addStudent'" class="page-section">
          <AddStudent />
        </section>

        <!-- Beginner Tests -->
        <section v-else-if="activeTab === 'addBeginner'" class="page-section">
          <AddBeginner />
        </section>

        <!-- Elementary Tests -->
        <section v-else-if="activeTab === 'addElementary'" class="page-section">
          <AddElementary />
        </section>

        <!-- Intermediate Tests -->
        <section v-else-if="activeTab === 'addIntermediate'" class="page-section">
          <AddIntermediate />
        </section>

        <!-- Results -->
        <section v-else-if="activeTab === 'results'" class="page-section">
          <AdminResults />
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
}

.admin-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.admin-content {
  flex: 1;
  padding: 32px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-header {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.page-eyebrow {
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
}

.page-header p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

@media (max-width: 900px) {
  .admin-content {
    padding: 20px;
  }
}
</style>