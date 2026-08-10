import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Router fayli to'g'ri import qilingan bo'lishi kerak
import './style.css'

const app = createApp(App)

app.use(router) // <-- BU JUDA MUHIM
app.mount('#app')