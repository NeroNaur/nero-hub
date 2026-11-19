import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import { guardStrayDrops } from './lib/drop'

guardStrayDrops()

createApp(App).use(router).mount('#app')
