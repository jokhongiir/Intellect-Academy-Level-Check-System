<script setup>
import './AdminSidebar.css'

import {
  HomeModernIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'

defineProps({
  activeTab: {
    type: String,
    default: 'dashboard'
  },

  setActiveTab: {
    type: Function,
    required: true
  },

  onLogout: {
    type: Function,
    required: true
  },

  isCollapsed: {
    type: Boolean,
    default: true
  },

  toggleSidebar: {
    type: Function,
    required: true
  }
})

const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HomeModernIcon
  },

  {
    id: 'addStudent',
    label: 'Add Students',
    icon: UserPlusIcon
  },

  {
    id: 'addTest',
    label: 'Add Tests',
    icon: DocumentPlusIcon
  },

  {
    id: 'addBeginner',
    label: 'Beginner Tests',
    icon: AcademicCapIcon
  },

  {
    id: 'addElementary',
    label: 'Elementary Tests',
    icon: AcademicCapIcon
  },

  {
    id: 'results',
    label: 'Results & Analytics',
    icon: ChartBarIcon
  }
]
</script>

<template>
  <aside
    class="ia-admin-sidebar"
    :class="{ collapsed: isCollapsed }"
    @mouseenter="toggleSidebar(false)"
    @mouseleave="toggleSidebar(true)"
  >

    <!-- MENU -->
    <div class="ia-menu-section">

      <!-- LABEL -->
      <div
        v-if="!isCollapsed"
        class="ia-menu-label-wrap"
      >
        <span class="ia-menu-label">
          Management Module
        </span>
      </div>

      <!-- NAVIGATION -->
      <nav class="ia-nav-list">

        <button
          v-for="item in menuItems"
          :key="item.id"
          type="button"
          class="ia-menu-btn"
          :class="{
            active: activeTab === item.id
          }"
          :title="isCollapsed ? item.label : ''"
          @click="setActiveTab(item.id)"
        >

          <!-- ICON -->
          <component
            :is="item.icon"
            class="ia-menu-icon"
          />

          <!-- TEXT -->
          <span
            v-if="!isCollapsed"
            class="ia-menu-text"
          >
            {{ item.label }}
          </span>

          <!-- ACTIVE INDICATOR -->
          <span
            v-if="
              activeTab === item.id &&
              !isCollapsed
            "
            class="ia-active-indicator"
          ></span>

        </button>

      </nav>

    </div>

    <!-- FOOTER -->
    <div class="ia-sidebar-footer">

      <!-- SYSTEM STATUS -->
      <div
        v-if="!isCollapsed"
        class="ia-footer-card"
      >

        <div class="ia-footer-status-dot"></div>

        <div class="ia-footer-info">

          <p class="ia-footer-title">
            System Online
          </p>

          <p class="ia-footer-desc">
            Intellect Academy v2.5
          </p>

        </div>

      </div>

      <!-- LOGOUT -->
      <button
        type="button"
        class="ia-logout-btn"
        :title="isCollapsed ? 'Log out' : ''"
        @click="onLogout"
      >

        <ArrowRightOnRectangleIcon
          class="ia-menu-icon"
        />

        <span
          v-if="!isCollapsed"
          class="ia-menu-text"
        >
          Sign Out
        </span>

      </button>

    </div>

  </aside>
</template>