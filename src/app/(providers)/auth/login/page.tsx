'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { login as loginAction } from '@/store/slices/authSlice'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import apiClient from '@/services/apiClient'
import { useTheme } from 'next-themes'
import toast from 'react-hot-toast'
import { setAddressList } from '@/store/slices/addressSlice'

const roles = ['client', 'merchant', 'rider'] as const
type Role = typeof roles[number]
type LoginType = 'PASSWORD' | 'OAUTH2'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const { theme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [role, setRole] = useState<Role>((searchParams.get('role') as Role) || 'client')
  const [loginType, setLoginType] = useState<LoginType>('PASSWORD')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiClient.post('/auth/login', {
        loginType: 'PASSWORD',
        role,
        username,
        password,
      })
      const payload = res.data.data
      dispatch(loginAction({
        role,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        image: payload.image || '',
        username: payload.username,
        needsProfileCompletion: payload.needsProfileCompletion,
      }))
      if (payload.needsProfileCompletion) {
        router.push(`/${role}/profile`)
      } else {
        if (role === "client") {
          router.push(`/${role}/browse`)
        } else {
          router.push(`/${role}/dashboard`)
        }
      }
    } catch (err) {
      console.error('Password login error', err)
      toast.error('登录失败，请重试')
    }
  }

  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential
    if (!idToken) {
      console.error('Google ID Token not found!')
      return
    }
    try {
      const res = await apiClient.post('/auth/login', {
        loginType: 'OAUTH2',
        role,
        oauth2Token: idToken,
      })
      const payload = res.data.data
      dispatch(loginAction({
        role,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        image: payload.image || '',
        username: payload.username,
        needsProfileCompletion: payload.needsProfileCompletion,
      }))
      if (payload.needsProfileCompletion) {
        router.push(`/${role}/profile`)
      } else {
        if (role === "client") { 
          router.push(`/${role}/browse`)
        } else {
          router.push(`/${role}/dashboard`)
        }
      }
    } catch (err) {
      console.error('Google OAuth2 login error', err)
      toast.error('登录失败，请重试')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8">
      <div className="relative flex justify-center items-center mb-4">
          <button
            className="absolute left-0 top-2.5 text-blue-600 hover:underline top"
            onClick={() => router.back()}
          >
            ← 返回
          </button>
          <h2 className="text-3xl font-extrabold text-indigo-700 tracking-tight">SmartFoodDelivery Login</h2>
        </div>
        <div className="flex justify-center gap-1 mb-6">
          {roles.map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-8 py-2 font-medium rounded-t-lg ${
                role === r ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex justify-center mb-6 space-x-4">
          <button
            onClick={() => setLoginType('PASSWORD')}
            className={`px-4 py-1 rounded-full ${
              loginType === 'PASSWORD'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Username / Password
          </button>
          <button
            onClick={() => setLoginType('OAUTH2')}
            className={`px-4 py-1 rounded-full ${
              loginType === 'OAUTH2'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Google OAuth2
          </button>
        </div>

        {loginType === 'PASSWORD' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700"
            >
              Login
            </button>
          </form>
        ) : (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => console.error('Google OAuth2 login failed')}
              theme={theme === 'dark' ? 'filled_black' : 'outline'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
