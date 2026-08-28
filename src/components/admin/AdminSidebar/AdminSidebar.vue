<script setup>
import {
  HomeModernIcon,
  UserPlusIcon,
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
    default: false
  }
})

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeModernIcon },
  { id: 'addStudent', label: 'Add Students', icon: UserPlusIcon },
  { id: 'addBeginner', label: 'Beginner Tests', icon: AcademicCapIcon },
  { id: 'addElementary', label: 'Elementary Tests', icon: AcademicCapIcon },
  { id: 'results', label: 'Results & Analytics', icon: ChartBarIcon }
]
</script>

<template>
  <aside class="admin-sidebar" :class="{ collapsed: isCollapsed }">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="brand-badge">IA</div>
      <div v-show="!isCollapsed" class="brand-text">
        <span class="brand-name">Intellect Academy</span>
        <span class="brand-sub">Management Suite</span>
      </div>
    </div>

    <!-- Menu -->
    <div class="menu-section">
      <div v-show="!isCollapsed" class="menu-label">Management Module</div>

      <nav class="nav-list">
        <button
          v-for="item in menuItems"
          :key="item.id"
          type="button"
          class="menu-btn"
          :class="{ active: activeTab === item.id }"
          :title="isCollapsed ? item.label : ''"
          @click="setActiveTab(item.id)"
        >
          <component :is="item.icon" class="menu-icon" />
          <span v-show="!isCollapsed" class="menu-text">{{ item.label }}</span>
          <span
            v-if="activeTab === item.id && !isCollapsed"
            class="active-indicator"
          ></span>
        </button>
      </nav>
    </div>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div v-show="!isCollapsed" class="footer-card">
        <div class="status-dot"></div>
        <div>
          <p class="footer-title">System Online</p>
          <p class="footer-desc">Intellect Academy v2.5</p>
        </div>
      </div>

      <button
        type="button"
        class="logout-btn"
        :title="isCollapsed ? 'Sign Out' : ''"
        @click="onLogout"
      >
        <ArrowRightOnRectangleIcon class="menu-icon" />
        <span v-show="!isCollapsed" class="menu-text">Sign Out</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 260px;
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  flex-shrink: 0;
}

.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid #1e293b;
}

.brand-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  color: white;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.brand-sub {
  font-size: 11px;
  color: #94a3b8;
}

.menu-section {
  flex: 1;
  padding: 20px 12px;
  overflow-y: auto;
}

.menu-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
  padding: 0 12px 12px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.menu-btn:hover {
  background: #1e293b;
  color: #f1f5f9;
}

.menu-btn.active {
  background: #1e40af;
  color: #ffffff;
}

.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.menu-text {
  white-space: nowrap;
}

.active-indicator {
  position: absolute;
  right: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #60a5fa;
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid #1e293b;
}

.footer-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 10px;
  background: #1e293b;
  border-radius: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
  flex-shrink: 0;
}

.footer-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.footer-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: #64748b;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #f87171;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(248, 113, 113, 0.1);
}
</style>