<script setup>
import { ref } from 'vue'

/* =========================================
   ADMIN COMPONENTS
========================================= */

import AdminSidebar from '../components/admin/AdminSidebar/AdminSidebar.vue'
import AdminNavbar from '../components/admin/AdminNavbar/AdminNavbar.vue'
import AddStudent from '../components/admin/AddStudent/AddStudent.vue'
import AddBeginner from '../components/admin/AddBeginner/AddBeginner.vue'
import AddElementary from '../components/admin/AddElemantary/AddElemantary.vue'
import AdminResults from '../components/admin/AdminResults/AdminResults.vue'

/* =========================================
   ACTIVE TAB
========================================= */

const activeTab = ref('dashboard')

/* =========================================
   SIDEBAR STATE
========================================= */

const isCollapsed = ref(true)

/* =========================================
   TOGGLE SIDEBAR
========================================= */

const toggleSidebar = (value) => {
  isCollapsed.value = value
}

/* =========================================
   CHANGE ACTIVE TAB
========================================= */

const setActiveTab = (tab) => {
  activeTab.value = tab
}

/* =========================================
   LOGOUT
========================================= */

const onLogout = () => {
  try {
    localStorage.removeItem('admin')
    localStorage.removeItem('current_admin')
    localStorage.removeItem('admin_user')
  } catch (error) {
    console.error('Logout storage error:', error)
  }

  window.location.href = '/login'
}
</script>

<template>
  <div class="ia-admin-layout">
    <!-- =====================================
         ADMIN SIDEBAR
    ====================================== -->

    <AdminSidebar
      :active-tab="activeTab"
      :set-active-tab="setActiveTab"
      :on-logout="onLogout"
      :is-collapsed="isCollapsed"
      :toggle-sidebar="toggleSidebar"
    />

    <!-- =====================================
         ADMIN MAIN
    ====================================== -->

    <div
      class="ia-admin-main"
      :class="{
        'sidebar-collapsed': isCollapsed,
        'sidebar-expanded': !isCollapsed
      }"
    >
      <!-- ===================================
           ADMIN NAVBAR
      ==================================== -->

      <AdminNavbar :on-logout="onLogout" />

      <!-- ===================================
           PAGE CONTENT
      ==================================== -->

      <main class="ia-admin-content">
        <!-- =================================
             DASHBOARD
        ================================== -->

        <section v-if="activeTab === 'dashboard'" class="ia-page-section">
          <div class="ia-page-header">
            <div class="ia-page-header-content">
              <span class="ia-page-eyebrow"> ADMIN PANEL </span>
              <h1>Dashboard</h1>
              <p>Welcome to Intellect Academy Administration Panel.</p>
            </div>
          </div>
        </section>

        <!-- =================================
             ADD STUDENT
        ================================== -->

        <section v-else-if="activeTab === 'addStudent'" class="ia-page-section">
          <AddStudent />
        </section>

        <!-- =================================
             BEGINNER TESTS
        ================================== -->

        <section v-else-if="activeTab === 'addBeginner'" class="ia-page-section">
          <AddBeginner />
        </section>

        <!-- =================================
             ELEMENTARY TESTS
        ================================== -->

        <section v-else-if="activeTab === 'addElementary'" class="ia-page-section">
          <AddElementary />
        </section>

        <!-- =================================
             RESULTS & ANALYTICS
        ================================== -->

        <section v-else-if="activeTab === 'results'" class="ia-page-section">
          <AdminResults />
        </section>

        <!-- =================================
             FALLBACK
        ================================== -->

        <section v-else class="ia-page-section">
          <div class="ia-empty-page">
            <div class="ia-empty-icon">⚠️</div>
            <h2>Page Not Found</h2>
            <p>The selected admin module could not be found.</p>
            <button
              type="button"
              class="ia-back-dashboard-btn"
              @click="setActiveTab('dashboard')"
            >
              Back to Dashboard
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* =========================================
   GLOBAL LAYOUT
========================================= */

.ia-admin-layout {
  width: 100%;
  min-height: 100vh;
  display: flex;
  background: #f8fafc;
  overflow-x: hidden;
}

/* =========================================
   MAIN AREA
========================================= */

.ia-admin-main {
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  margin-left: 84px;
  transition: margin-left 0.25s ease;
  background: #f8fafc;
}

/* =========================================
   SIDEBAR EXPANDED
========================================= */

.ia-admin-main.sidebar-expanded {
  margin-left: 250px;
}

/* =========================================
   SIDEBAR COLLAPSED
========================================= */

.ia-admin-main.sidebar-collapsed {
  margin-left: 84px;
}

/* =========================================
   CONTENT
========================================= */

.ia-admin-content {
  width: 100%;
  min-height: calc(100vh - 70px);
  padding: 28px;
  box-sizing: border-box;
}

/* =========================================
   PAGE SECTION
========================================= */

.ia-page-section {
  width: 100%;
  min-width: 0;
}

/* =========================================
   DASHBOARD HEADER
========================================= */

.ia-page-header {
  width: 100%;
  padding: 30px;
  box-sizing: border-box;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
}

/* =========================================
   HEADER CONTENT
========================================= */

.ia-page-header-content {
  max-width: 900px;
}

/* =========================================
   EYEBROW
========================================= */

.ia-page-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* =========================================
   PAGE TITLE
========================================= */

.ia-page-header h1 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
}

/* =========================================
   PAGE DESCRIPTION
========================================= */

.ia-page-header p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

/* =========================================
   EMPTY PAGE
========================================= */

.ia-empty-page {
  width: 100%;
  min-height: 420px;
  padding: 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
}

/* =========================================
   EMPTY ICON
========================================= */

.ia-empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 18px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 28px;
}

/* =========================================
   EMPTY TITLE
========================================= */

.ia-empty-page h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 750;
}

/* =========================================
   EMPTY DESCRIPTION
========================================= */

.ia-empty-page p {
  margin: 0 0 22px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

/* =========================================
   BACK BUTTON
========================================= */

.ia-back-dashboard-btn {
  border: 0;
  padding: 11px 18px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.ia-back-dashboard-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.2);
}

.ia-back-dashboard-btn:active {
  transform: translateY(0);
}

/* =========================================
   RESPONSIVE
========================================= */

@media (max-width: 1100px) {
  .ia-admin-main.sidebar-expanded {
    margin-left: 84px;
  }
}

/* =========================================
   TABLET
========================================= */

@media (max-width: 900px) {
  .ia-admin-main.sidebar-expanded,
  .ia-admin-main.sidebar-collapsed {
    margin-left: 84px;
  }

  .ia-admin-content {
    padding: 20px;
  }

  .ia-page-header {
    padding: 26px;
  }
}

/* =========================================
   MOBILE
========================================= */

@media (max-width: 640px) {
  .ia-admin-main,
  .ia-admin-main.sidebar-collapsed,
  .ia-admin-main.sidebar-expanded {
    margin-left: 72px;
  }

  .ia-admin-content {
    padding: 14px;
  }

  .ia-page-header {
    padding: 22px;
    border-radius: 16px;
  }

  .ia-page-header h1 {
    font-size: 23px;
  }

  .ia-page-header p {
    font-size: 13px;
  }

  .ia-page-eyebrow {
    font-size: 10px;
  }

  .ia-empty-page {
    min-height: 360px;
    padding: 28px 20px;
    border-radius: 16px;
  }

  .ia-empty-page h2 {
    font-size: 20px;
  }
}

/* =========================================
   VERY SMALL MOBILE
========================================= */

@media (max-width: 420px) {
  .ia-admin-main,
  .ia-admin-main.sidebar-collapsed,
  .ia-admin-main.sidebar-expanded {
    margin-left: 64px;
  }

  .ia-admin-content {
    padding: 10px;
  }

  .ia-page-header {
    padding: 18px;
  }

  .ia-page-header h1 {
    font-size: 21px;
  }
}
</style>