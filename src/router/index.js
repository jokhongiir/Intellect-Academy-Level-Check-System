import { createRouter, createWebHistory } from 'vue-router'
import StudentLogin from '../views/StudentLogin/StudentLogin.vue'
import StudentLayout from '../layout/StudentLayout.vue'
import AdminLogin from '../views/AdminLogin/AdminLogin.vue'
import AdminLayout from '../layout/AdminLayout.vue'

const routes = [
  { path: '/', redirect: '/student-login' },
  { path: '/student-login', component: StudentLogin },
  { path: '/student-dashboard', component: StudentLayout },
  { path: '/admin-login', component: AdminLogin },
  { 
    path: '/admin', 
    component: AdminLayout,
    meta: { requiresAuth: true } 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router