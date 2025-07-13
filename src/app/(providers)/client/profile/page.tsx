"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/services/apiClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateImage } from '@/store/slices/authSlice'
import { useDispatch } from 'react-redux'

export default function ClientProfilePage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    gender: '',
    avatar: '',
    createTime: '',
    updateTime: '',
  })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/profile')
        const data = res.data.data
        if (!data || !data.client) throw new Error('Missing profile data')

        setForm({
          username: data.username || '',
          email: data.email || '',
          phone: data.client.phone || '',
          gender: data.client.gender || '',
          avatar: data.client.avatar || '',
          createTime: data.createTime ? formatDate(data.createTime) : '',
          updateTime: data.updateTime ? formatDate(data.updateTime) : '',
        })
      } catch (err) {
        setError('Failed to load profile')
      }
    }
    fetchProfile()
  }, [])

  function formatDate(timeStr: string) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const localUrl = URL.createObjectURL(file)
    setAvatarPreview(localUrl)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.data.url
      setForm(prev => ({ ...prev, avatar: url }))
      setTimeout(() => setAvatarPreview(''), 2000)
      setError('')
    } catch {
      setError('Upload failed')
    }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        phone: form.phone,
        gender: form.gender,
        avatar: form.avatar
      }
      await apiClient.put('/profile', payload)
      // 提交成功后更新 Redux
      dispatch(updateImage(form.avatar))
      router.push('/client/browse')
    } catch {
      setError('Update failed. Please check the input.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-20 px-4">
      <Card className="w-full max-w-3xl mx-auto h-full">
        <CardContent className="p-6 md:p-10">
          <p className="text-muted-foreground mb-4">查看并更新您的账户信息</p>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="flex flex-col items-center gap-4 py-5">
              <div className="relative w-40 h-40">
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
                    上传中…
                  </div>
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt="本地预览" className="w-40 h-40 rounded-full object-cover" />
                ) : form.avatar ? (
                  <img src={`/api/images?key=${encodeURIComponent(form.avatar)}`} alt="头像" className="w-40 h-40 rounded-full object-cover" />
                ) : (
                  <div className="w-40 h-40 bg-gray-200 rounded-full flex items-center justify-center text-4xl text-gray-400">
                    ?
                  </div>
                )}
              </div>
              <button onClick={() => document.getElementById('avatar-input')?.click()} type="button" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded">
                {uploading ? '上传中...' : '选择头像'}
              </button>
              <Input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </div>

            <div className="space-y-5">
              <div>
                <Label>用户名 <span className="text-red-500 relative top-[2px]">*</span></Label>
                <Input value={form.username} disabled className="bg-muted" />
              </div>
              <div>
                <Label>邮箱 <span className="text-red-500 relative top-[2px]">*</span></Label>
                <Input value={form.email} type="email" disabled className="bg-muted" />
              </div>
              <div>
                <Label htmlFor="phone">手机号 <span className="text-red-500 relative top-[2px]">*</span></Label>
                <Input name="phone" value={form.phone} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="gender">性别 <span className="text-red-500 relative top-[2px]">*</span></Label>
                <Select
                  value={form.gender}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, gender: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">女</SelectItem>
                    <SelectItem value="1">男</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <Label>创建时间</Label>
                <Input value={form.createTime} disabled className="bg-muted" />
              </div>
              <div>
                <Label>更新时间</Label>
                <Input value={form.updateTime} disabled className="bg-muted" />
              </div>
              <Button type="submit" disabled={uploading} className="w-full mt-2 bg-blue-600 text-white hover:bg-blue-700 rounded">
                {uploading ? '上传中...' : '保存修改'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}