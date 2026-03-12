import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import BasicLayout from '@/layouts/BasicLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'layout',
      component: BasicLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'location-management',
          component: () => import('@/views/location/LocationManagement.vue')
        },
        {
          path: '/qrcode-batch',
          name: 'qrcode-batch',
          component: () => import('@/views/location/QRCodeBatch.vue')
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    // 需要认证且未登录，跳转到登录页
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    // 已登录访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router
