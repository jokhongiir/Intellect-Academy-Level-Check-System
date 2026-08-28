<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import {
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BellIcon,
  CheckCircleIcon,
  TrashIcon,
  Bars3Icon
} from '@heroicons/vue/24/outline'

defineProps({
  onLogout: {
    type: Function,
    required: true
  },
  toggleSidebar: {
    type: Function,
    required: true
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const notifications = ref([])
const showDropdown = ref(false)
let subscription = null

onMounted(async () => {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!error && data) {
    notifications.value = data.map((item) => ({
      id: item.id,
      title: 'Yangi test natijasi!',
      message: `${item.student_name || "O'quvchi"} testni yakunladi. Ball: ${item.score ?? 0}/100`,
      time: new Date(item.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      read: true
    }))
  }

  subscription = supabase
    .channel('public:results')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'results' },
      (payload) => {
        const newResult = payload.new
        notifications.value.unshift({
          id: newResult.id,
          title: 'Yangi test natijasi! 🎉',
          message: `${newResult.student_name || "O'quvchi"} testni tugatdi. Ball: ${newResult.score ?? 0}/100`,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          read: false
        })
        playNotificationSound()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
})

const unreadCount = computed(() =>
  notifications.value.filter((n) => !n.read).length
)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    notifications.value.forEach((n) => (n.read = true))
  }
}

const clearNotifications = () => {
  notifications.value = []
}

const playNotificationSound = () => {
  try {
    const audio = new Audio(
      'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
    )
    audio.volume = 0.4
    audio.play()
  } catch (e) {
    // silent fail
  }
}
</script>

<template>
  <header class="admin-navbar">
    <div class="navbar-left">
      <button
        type="button"
        class="toggle-btn"
        :class="{ active: isCollapsed }"
        title="Sidebarni ochish/yopish"
        @click="toggleSidebar"
      >
        <Bars3Icon class="icon" />
      </button>

      <div class="brand">
        <div class="brand-icon">
          <ShieldCheckIcon class="shield-icon" />
        </div>
        <div class="brand-info">
          <h2>Intellect Academy</h2>
          <span class="role-badge">Admin Panel</span>
        </div>
      </div>
    </div>

    <div class="navbar-right">
      <!-- Notifications -->
      <div class="notification-wrapper">
        <button
          class="icon-btn"
          :class="{ 'has-unread': unreadCount > 0 }"
          title="Bildirishnomalar"
          @click="toggleDropdown"
        >
          <BellIcon class="icon" />
          <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
        </button>

        <div v-if="showDropdown" class="dropdown">
          <div class="dropdown-header">
            <h4>Bildirishnomalar</h4>
            <button
              v-if="notifications.length"
              class="clear-btn"
              @click="clearNotifications"
            >
              <TrashIcon class="clear-icon" />
              Tozalash
            </button>
          </div>

          <div class="dropdown-body">
            <div v-if="!notifications.length" class="empty">
              Yangi bildirishnomalar yo‘q
            </div>

            <div
              v-for="item in notifications"
              :key="item.id"
              class="notif-item"
              :class="{ unread: !item.read }"
            >
              <div class="notif-icon">
                <CheckCircleIcon class="success-icon" />
              </div>
              <div class="notif-content">
                <p class="notif-title">{{ item.title }}</p>
                <p class="notif-text">{{ item.message }}</p>
                <span class="notif-time">{{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Admin Profile -->
      <div class="admin-profile">
        <div class="avatar">
          <UserCircleIcon class="avatar-icon" />
          <span class="online-dot"></span>
        </div>
        <div class="meta">
          <span class="name">Administrator</span>
          <span class="role">Super Admin</span>
        </div>
      </div>

      <button class="logout-btn" title="Tizimdan chiqish" @click="onLogout">
        <ArrowRightOnRectangleIcon class="icon" />
        <span>Chiqish</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.admin-navbar {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 40;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover,
.toggle-btn.active {
  background: #e0f2fe;
  color: #0284c7;
}

.icon {
  width: 20px;
  height: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.shield-icon {
  width: 20px;
  height: 20px;
}

.brand-info h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.role-badge {
  font-size: 11px;
  color: #64748b;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-wrapper {
  position: relative;
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.icon-btn.has-unread {
  color: #2563eb;
}

.badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  z-index: 50;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.dropdown-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
}

.clear-btn:hover {
  color: #ef4444;
}

.clear-icon {
  width: 14px;
  height: 14px;
}

.dropdown-body {
  max-height: 360px;
  overflow-y: auto;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f8fafc;
  transition: background 0.15s;
}

.notif-item:hover {
  background: #f8fafc;
}

.notif-item.unread {
  background: #f0f9ff;
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ecfdf5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success-icon {
  width: 18px;
  height: 18px;
  color: #10b981;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.notif-text {
  margin: 0 0 4px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.notif-time {
  font-size: 11px;
  color: #94a3b8;
}

.divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  position: relative;
  width: 36px;
  height: 36px;
  color: #64748b;
}

.avatar-icon {
  width: 36px;
  height: 36px;
}

.online-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid white;
}

.meta {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.role {
  font-size: 11px;
  color: #64748b;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: #fef2f2;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fee2e2;
}

@media (max-width: 768px) {
  .brand-info,
  .meta,
  .logout-btn span {
    display: none;
  }
}
</style>