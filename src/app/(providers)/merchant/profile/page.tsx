"use client"
import React, { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '../../../../services/apiClient'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { updateImage } from '@/store/slices/authSlice'

interface ProfileForm {
  username: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  merchantName: string
  zipcode: string
  merchantDescription: string
  merchantImage: string
  merchantType: string
  merchantSocialMedia: string[]
  merchantOpeningHours: Record<string, string>
  createTime: string
  updateTime: string
}

export default function MerchantProfilePage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const [form, setForm] = useState<ProfileForm>({
    username: '', email: '', phone: '', address: '', city: '', state: '', country: '',
    merchantName: '', zipcode: '', merchantDescription: '', merchantImage: '', merchantType: '',
    merchantSocialMedia: [''], merchantOpeningHours: {}, createTime: '', updateTime: ''
  })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [logoPreview, setLogoPreview] = useState<string>('')

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/profile')
        const data = res.data.data.merchant
        setForm(prev => ({
          ...prev,
          username: res.data.data.username,
          email: res.data.data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          merchantName: data.merchantName,
          zipcode: data.zipcode,
          merchantDescription: data.merchantDescription,
          merchantImage: data.merchantImage,
          merchantType: data.merchantType,
          merchantSocialMedia: (data.merchantSocialMedia || '').split(',').filter(Boolean),
          merchantOpeningHours: data.merchantOpeningHours || {},
          createTime: res.data.data.createTime,
          updateTime: res.data.data.updateTime,
        }))
      } catch {
        setError('加载失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleOpeningHoursChange = (day: string, value: string) => {
    setForm(prev => ({
      ...prev,
      merchantOpeningHours: { ...prev.merchantOpeningHours, [day]: value }
    }))
  }

  const handleSocialMediaChange = (idx: number, value: string) => {
    setForm(prev => ({
      ...prev,
      merchantSocialMedia: prev.merchantSocialMedia.map((v, i) => i === idx ? value : v)
    }))
  }
  const addSocialMedia = () => setForm(prev => ({ ...prev, merchantSocialMedia: [...prev.merchantSocialMedia, ''] }))
  const removeSocialMedia = (idx: number) => setForm(prev => ({ ...prev, merchantSocialMedia: prev.merchantSocialMedia.filter((_, i) => i !== idx) }))

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. 先做本地预览
    const localUrl = URL.createObjectURL(file)
    setLogoPreview(localUrl)

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiClient.post('/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const key = res.data.data.url || ''
      setForm(prev => ({ ...prev, merchantImage: key }))
      setTimeout(() => setLogoPreview(''), 2000)
      setError('')
    } catch {
      setError('上传失败')
    }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, merchantSocialMedia: form.merchantSocialMedia.join(',') }
      const res = await apiClient.put('/profile', payload)
      dispatch(updateImage(form.merchantImage))
      router.push('/merchant/dashboard')
      toast.success(res.data.msg)
    } catch {
      setError('保存失败，请重试')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-center py-10">加载中...</div>
  }

  return (
    <div className="bg-gray-100 min-h-screen w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-3">
        {/* Sidebar */}
        <div className="flex flex-col bg-white shadow rounded h-full"> 
          <div className="bg-white rounded p-6 flex flex-col items-center space-y-4 text-center">
            {/* 先用本地预览，再用后端代理流 */}
            <div className="relative w-32 h-32">
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
                  上传中…
                </div>
              ) : logoPreview ? (
                <img
                  src={logoPreview}
                  alt="本地预览"
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : form.merchantImage ? (
                <img
                  src={`/api/images?key=${encodeURIComponent(form.merchantImage)}`}
                  alt="商户图片"
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-5xl">
                  ?
                </div>
              )}
            </div>
            <button onClick={() => document.getElementById('logo-input')?.click()} className="px-4 py-2 bg-blue-600 text-white rounded">
              {uploading ? '上传中...' : '更换图片'}
            </button>
            <input type="file" id="logo-input" accept="image/*" onChange={handleImageChange} className="hidden" />
            <p className="text-xl font-bold">{form.merchantName}</p>
            <p className="text-gray-700">{form.username}</p>
            <p className="text-gray-500">{form.phone}</p>
            <p className="text-gray-500">{form.email}</p>
            <p className="text-gray-500">{form.address}, {form.city}, {form.state}, {form.country} {form.zipcode}</p>
            <p className="text-gray-500">{form.merchantDescription}</p>
          </div>
          <div className="mt-auto flex justify-between text-gray-500 text-sm px-2 py-1">
            <span>CreateTime: {form.createTime} UpdateTime: {form.updateTime}</span>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 bg-white shadow rounded p-6">
          {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold"><span className="text-red-500 relative top-0.5 inline-block">*</span> 商户名称</label>
                <input name="merchantName" value={form.merchantName} onChange={handleChange} required className="w-full p-3 border rounded" />
              </div>
              <div>
                <label className="block mb-1 font-semibold"><span className="text-red-500 relative top-0.5 inline-block">*</span> 联系电话</label>
                <input name="phone" value={form.phone} onChange={handleChange} required className="w-full p-3 border rounded" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-semibold"><span className="text-red-500 relative top-0.5 inline-block">*</span> 地址</label>
              <input name="address" value={form.address} onChange={handleChange} required className="w-full p-3 border rounded" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Field 
                label={
                  <>
                    <span className="text-red-500 relative top-1 inline-block mr-1">* </span> 
                    城市
                  </>}
              >
                <input name="city" value={form.city} onChange={handleChange} required className="w-full p-3 border rounded" />
              </Field>
              <Field 
                label={
                  <>
                    <span className="text-red-500 relative top-1 inline-block  mr-1">* </span> 
                    省/州
                  </>}
              >
                <input name="state" value={form.state} onChange={handleChange} required className="w-full p-3 border rounded" />
              </Field>
              <Field 
                label = {<span className="block md:ml-2">邮编</span>}
              >
                <input name="zipcode" value={form.zipcode} onChange={handleChange} required className="w-full p-3 border rounded" />
              </Field>
            </div>
            <div>
              <label className="block mb-1 font-semibold">商户类型</label>
              <input name="merchantType" value={form.merchantType} onChange={handleChange} className="w-full p-3 border rounded" />
            </div>
            <div>
              <label className="block mb-1 font-semibold">描述</label>
              <textarea name="merchantDescription" value={form.merchantDescription} onChange={handleChange} className="w-full p-3 border rounded" rows={3} />
            </div>
            <div>
              <label className="block mb-1 font-semibold"><span className="text-red-500 relative top-0.5 inline-block">*</span> 营业时间</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-10 font-medium text-gray-600">{day}</span>
                    <input
                      value={form.merchantOpeningHours[day]||''}
                      onChange={e=>handleOpeningHoursChange(day,e.target.value)}
                      className="flex-1 p-2 border rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-1 font-semibold">社交媒体</label>
              <div className="space-y-2">
                {form.merchantSocialMedia.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={v} onChange={e=>handleSocialMediaChange(i,e.target.value)} className="flex-1 p-2 border rounded" />
                    <button type="button" onClick={()=>removeSocialMedia(i)} className="text-red-500">-</button>
                  </div>
                ))}
                <button type="button" onClick={addSocialMedia} className="text-blue-600">+ 添加</button>
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded font-semibold">
              {saving ? '保存中...' : '保存更新'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// 通用 Field 组件
interface FieldProps {
  label: ReactNode
  children: ReactNode
  className?: string 
}
export function Field({ label, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}