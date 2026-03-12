import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Location } from '@/api/location'
import {
  getLocationList,
  createLocation as createLocationApi,
  updateLocation as updateLocationApi,
  deleteLocation as deleteLocationApi
} from '@/api/location'

export const useLocationStore = defineStore('location', () => {
  // State
  const locations = ref<Location[]>([])
  const loading = ref(false)
  const currentLocation = ref<Location | null>(null)

  // Actions
  const fetchLocations = async (params?: any) => {
    loading.value = true
    try {
      const res = await getLocationList(params)
      locations.value = Array.isArray(res.data) ? res.data : []
      return res
    } catch (error) {
      console.error('获取地点列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createLocation = async (data: Location) => {
    loading.value = true
    try {
      const res = await createLocationApi(data)
      await fetchLocations()
      return res
    } catch (error) {
      console.error('创建地点失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateLocation = async (id: number, data: Location) => {
    loading.value = true
    try {
      const res = await updateLocationApi(id, data)
      await fetchLocations()
      return res
    } catch (error) {
      console.error('更新地点失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteLocation = async (id: number) => {
    loading.value = true
    try {
      const res = await deleteLocationApi(id)
      await fetchLocations()
      return res
    } catch (error) {
      console.error('删除地点失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const setCurrentLocation = (location: Location | null) => {
    currentLocation.value = location
  }

  return {
    locations,
    loading,
    currentLocation,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    setCurrentLocation
  }
})
