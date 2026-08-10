<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../api/supabaseClient'
import './AdminLogin.css'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  if (!email.value.trim() || !password.value.trim()) {
    error.value = "Iltimos, barcha maydonlarni to'ldiring!"
    return
  }

  loading.value = true

  try {
    // Supabase Auth orqali Gmail va parol tekshiruvi
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })

    if (authError) throw authError

    if (data?.session) {
      // Muvaffaqiyatli kirdi, admin panelga o'tkazamiz
      router.push('/admin')
    }
  } catch (err) {
    // Xatolik turiga qarab tushunarli xabar chiqarish
    if (err.message.includes('Invalid login credentials')) {
      error.value = "Kiritilgan Gmail yoki parol xato!"
    } else {
      error.value = "Kirishda xatolik yuz berdi: " + err.message
    }
    console.error(err.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-card">
      <h2>Admin Panel</h2>
      <p class="login-subtitle">Gmail va parolingizni kiriting</p>
      
      <p v-if="error" class="error-msg">{{ error }}</p>
      
      <div class="form-group">
        <label>Gmail manzil</label>
        <input 
          type="email" 
          v-model="email" 
          required 
          placeholder="admin@intellect.uz" 
        />
      </div>

      <div class="form-group">
        <label>Parol</label>
        <input 
          type="password" 
          v-model="password" 
          required 
          placeholder="••••••••" 
        />
      </div>

      <button type="submit" class="submit-btn" :disabled="loading">
        {{ loading ? 'Tekshirilmoqda...' : 'Kirish' }}
      </button>
    </form>
  </div>
</template>