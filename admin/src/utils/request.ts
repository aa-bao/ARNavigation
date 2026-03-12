import axios from 'axios'
import router from '../router'

// 创建axios实例
const request = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 从localStorage获取token并添加到header
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    // 统一错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // token过期时跳转登录页
          localStorage.removeItem('token')
          router.push('/login')
          break
        case 403:
          console.error('拒绝访问')
          break
        case 404:
          console.error('请求地址不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error('请求失败:', error.response.data)
      }
    } else if (error.request) {
      console.error('请求没有收到响应')
    } else {
      console.error('请求配置失败:', error.message)
    }
    return Promise.reject(error)
  }
)

// 导出常用请求方法
export const get = (url: string, params?: any) => {
  return request.get(url, { params })
}

export const post = (url: string, data?: any) => {
  return request.post(url, data)
}

export const put = (url: string, data?: any) => {
  return request.put(url, data)
}

export const del = (url: string) => {
  return request.delete(url)
}

export default request
