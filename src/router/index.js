import { createRouter, createWebHistory } from 'vue-router'

const sub = (name) => () => import(`@/views/subject/${name}.vue`)

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  {
    path: '/s/:subject',
    component: () => import('@/views/SubjectLayout.vue'),
    children: [
      { path: '', name: 'hallway', component: sub('HallwayTab') },
      { path: 'study/:module?', name: 'study', component: sub('StudyTab') },
      { path: 'materials', name: 'materials', component: sub('MaterialsTab') },
      { path: 'flashcards', name: 'flashcards', component: sub('FlashcardsTab') },
      { path: 'flashcards/new', name: 'flashcards-new', component: sub('FlashcardSetEdit') },
      { path: 'flashcards/:set', name: 'flashcards-set', component: sub('FlashcardSetStudy') },
      { path: 'flashcards/:set/edit', name: 'flashcards-edit', component: sub('FlashcardSetEdit') },
      { path: 'practice', name: 'practice', component: sub('PracticeTab') },
      { path: 'quizzes', name: 'quizzes', component: sub('QuizzesTab') },
      { path: 'quizzes/:quiz', name: 'quizzes-take', component: sub('QuizTake') },
      { path: 'quizzes/:quiz/review', name: 'quizzes-review', component: sub('QuizReview') },
      { path: 'quizzes/:quiz/edit', name: 'quizzes-edit', component: sub('QuizEdit') },
      { path: 'exam', name: 'exam', component: sub('ExamTab') },
      { path: 'review', name: 'review', component: sub('ReviewTab') },
      { path: 'progress', name: 'progress', component: sub('ProgressTab') },
    ],
  },
  { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue') },
  { path: '/s/:subject/focus', redirect: (to) => `/s/${to.params.subject}` }, // old link
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from) => (to.path === from.path ? false : { top: 0 }),
})
