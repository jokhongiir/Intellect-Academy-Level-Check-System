<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '../../../api/supabaseClient'
import { 
  ShieldCheckIcon, 
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BellIcon,
  CheckCircleIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

defineProps({
  onLogout: {
    type: Function,
    required: true
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
    notifications.value = data.map(item => ({
      id: item.id,
      title: 'Yangi test natijasi!',
      message: `${item.student_name || 'O\'quvchi'} testni yakunladi. Ball: ${item.score ?? 0}/100`,
      time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true
    }))
  }

  subscription = supabase
    .channel('public:results')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results' }, payload => {
      const newResult = payload.new
      
      notifications.value.unshift({
        id: newResult.id,
        title: 'Yangi test natijasi! 🎉',
        message: `${newResult.student_name || 'O\'quvchi'} testni tugatdi. Ball: ${newResult.score ?? 0}/100`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false // Yangi xabar kelganda false bo'ladi va animatsiyani yoqadi
      })

      playNotificationSound()
    })
    .subscribe()
})

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
})

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    notifications.value.forEach(n => n.read = true)
  }
}

const clearNotifications = () => {
  notifications.value = []
}

const playNotificationSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    audio.volume = 0.4
    audio.play()
  } catch (e) {}
}
</script>

<template>
  <header class="admin-navbar">
    <div class="navbar-brand">
      <div class="brand-icon-wrapper">
        <ShieldCheckIcon class="brand-shield" />
      </div>
      <div class="brand-info">
        <h2 class="brand-title">Intellect Academy</h2>
        <span class="role-badge">Admin Panel</span>
      </div>
    </div>
    
    <div class="navbar-actions">
      <!-- Bildirishnoma tugmasi -->
      <div class="notification-container">
        <button 
          class="icon-action-btn" 
          :class="{ 'has-unread': unreadCount > 0 }" 
          @click="toggleDropdown" 
          title="Bildirishnomalar"
        >
          <BellIcon class="action-icon" />
          <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
        </button>

        <div v-if="showDropdown" class="notification-dropdown">
          <div class="dropdown-header">
            <h4>Bildirishnomalar</h4>
            <button v-if="notifications.length > 0" @click="clearNotifications" class="clear-all-btn">
              <TrashIcon class="clear-icon" /> Tozalash
            </button>
          </div>

          <div class="dropdown-body">
            <div v-if="notifications.length === 0" class="no-notifications">
              Yangi bildirishnomalar yo'q
            </div>
            <div 
              v-for="item in notifications" 
              :key="item.id" 
              class="notification-item"
              :class="{ unread: !item.read }"
            >
              <div class="notif-icon-box">
                <CheckCircleIcon class="notif-success-icon" />
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

      <div class="admin-profile">
        <div class="avatar-wrapper">
          <UserCircleIcon class="admin-avatar-icon" />
          <span class="status-dot"></span>
        </div>
        <div class="admin-meta">
          <span class="admin-name">Administrator</span>
          <span class="admin-role">Super Admin</span>
        </div>
      </div>

      <button @click="onLogout" class="logout-btn" title="Tizimdan chiqish">
        <ArrowRightOnRectangleIcon class="logout-icon" />
        <span class="logout-text">Chiqish</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.admin-navbar {
  height: 72px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  font-family: 'Inter', -apple-system, BlinkMacSystemText, sans-serif;
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon-wrapper {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.brand-shield {
  width: 24px;
  height: 24px;
  color: #ffffff;
}

.brand-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 2px 8px;
  border-radius: 20px;
  width: fit-content;
  letter-spacing: 0.02em;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-container {
  position: relative;
}

.icon-action-btn {
  position: relative;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
}

.icon-action-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

/* MUHIM: Qizil yoniq-o'chib turish animatsiyasi */
.icon-action-btn.has-unread {
  background-color: #fef2f2 !important;
  border-color: #fca5a5 !important;
  color: #dc2626 !important;
  animation: pulseGlow 1.5s infinite !important;
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

.action-icon {
  width: 20px;
  height: 20px;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  border: 2px solid #ffffff;
}

.notification-dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  width: 340px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
  animation: dropdownFadeIn 0.2s ease;
}

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dropdown-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.clear-all-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.clear-all-btn:hover {
  color: #ef4444;
}

.clear-icon {
  width: 14px;
  height: 14px;
}

.dropdown-body {
  max-height: 320px;
  overflow-y: auto;
}

.no-notifications {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.notification-item {
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item.unread {
  background: #eff6ff;
}

.notif-icon-box {
  width: 32px;
  height: 32px;
  background: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-success-icon {
  width: 18px;
  height: 18px;
  color: #22c55e;
}

.notif-content {
  flex: 1;
}

.notif-title {
  margin: 0 0 2px 0;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.notif-text {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #475569;
}

.notif-time {
  font-size: 10px;
  color: #94a3b8;
}

.divider {
  width: 1px;
  height: 28px;
  background-color: #e2e8f0;
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px 6px 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 30px;
}

.avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-avatar-icon {
  width: 34px;
  height: 34px;
  color: #64748b;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  background-color: #22c55e;
  border-radius: 50%;
  border: 2px solid #ffffff;
}

.admin-meta {
  display: flex;
  flex-direction: column;
}

.admin-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
}

.admin-role {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-icon {
  width: 18px;
  height: 18px;
}
</style>