import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/s/:subject', name: 'subject', component: () => import('@/views/SubjectView.vue') },
  { path: '/s/:subject/exam', name: 'exam', component: () => import('@/views/ExamView.vue') },
  {
    path: '/s/:subject/:module/:tab(review|practice|quiz)?',
    name: 'module',
    component: () => import('@/views/ModuleView.vue'),
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
