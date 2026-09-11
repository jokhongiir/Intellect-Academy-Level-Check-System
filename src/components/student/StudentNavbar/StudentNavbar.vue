<script setup>
import './StudentNavbar.css'
import logo from '../../../assets/logo.png'
import { OhVueIcon, addIcons } from 'oh-vue-icons'
import {
  RiTimerLine,
  RiUserLine,
  RiLogoutBoxRLine
} from 'oh-vue-icons/icons'

addIcons(RiTimerLine, RiUserLine, RiLogoutBoxRLine)

defineProps({
  studentName: {
    type: String,
    default: 'Student'
  },
  level: {
    type: String,
    default: 'Beginner'
  },
  timeLeft: {
    type: String,
    default: null
  },
  onLogout: {
    type: Function,
    required: true
  }
})
</script>

<template>
  <nav class="ia-student-navbar">
    <!-- Brand -->
    <div class="ia-nav-brand">
      <div class="ia-brand-icon-wrapper">
        <img :src="logo" alt="Intellect Academy Logo" class="ia-brand-logo-img" />
      </div>
      <div class="ia-brand-text">
        <h1>Intellect Academy</h1>
        <p>Level Assessment System</p>
      </div>
    </div>

    <!-- Timer -->
    <div class="ia-nav-center-timer" v-if="timeLeft">
      <div class="ia-timer-badge">
        <OhVueIcon name="ri-timer-line" class="ia-timer-icon" />
        <span>Time Remaining: <strong>{{ timeLeft }}</strong></span>
      </div>
    </div>

    <!-- Profile + Logout -->
    <div class="ia-nav-right">
      <div class="ia-student-profile-info">
        <div class="ia-profile-avatar">
          <OhVueIcon name="ri-user-line" />
        </div>
        <div class="ia-profile-details">
          <span class="ia-student-name">{{ studentName }}</span>
          <span class="ia-level-badge" :class="level?.toLowerCase()">
            {{ level }}
          </span>
        </div>
      </div>

      <button @click="onLogout" class="ia-logout-btn" title="Log Out">
        <OhVueIcon name="ri-logout-box-r-line" />
        <span>Log Out</span>
      </button>
    </div>
  </nav>
</template>