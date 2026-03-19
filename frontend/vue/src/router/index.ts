import { createRouter, createWebHistory } from 'vue-router'
import BasicLayout from '@/layouts/BasicLayout.vue'
import { useUserStore } from '@/stores/user'

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
      component: BasicLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'location-management',
          component: () => import('@/views/location/LocationManagement.vue')
        },
        {
          path: 'qrcode-batch',
          name: 'qrcode-batch',
          component: () => import('@/views/location/QRCodeBatch.vue')
        },
        {
          path: 'hospital-map',
          name: 'hospital-map',
          component: () => import('@/views/location/HospitalMapView.vue')
        },
        {
          path: 'users',
          name: 'user-management',
          component: () => import('@/views/user/UserManagement.vue')
        }
      ]
    }
  ]
})

router.beforeEach(async to => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth === false) {
    if (to.path === '/login' && userStore.isLoggedIn) {
      return '/'
    }
    return true
  }

  if (!userStore.isLoggedIn) {
    return '/login'
  }

  if (!userStore.userInfo) {
    try {
      await userStore.fetchCurrentUser()
    } catch {
      await userStore.logout()
      return '/login'
    }
  }

  return true
})

export default router
