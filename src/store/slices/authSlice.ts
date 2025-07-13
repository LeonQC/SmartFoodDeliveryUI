import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../store'

export interface AuthState {
  role: string | null
  accessToken: string | null
  refreshToken: string | null
  image: string | null
  username: string | null
  needsProfileCompletion: boolean | null
}

const initialState: AuthState = {
  role: null,
  accessToken: null,
  refreshToken: null,
  image: null,
  username: null,
  needsProfileCompletion: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(
      state,
      action: PayloadAction<{
        role: string
        accessToken: string
        refreshToken: string
        image: string
        username: string
        needsProfileCompletion: boolean
      }>
    ) {
      Object.assign(state, action.payload)
    },
    logout(state) {
      Object.assign(state, initialState)
    },
    setNeedsProfileCompletion(state, action: PayloadAction<boolean>) {
      state.needsProfileCompletion = action.payload
    },

    updateImage(state, action: PayloadAction<string>) {
      state.image = action.payload;
    },
  },
})

export const { login, logout, setNeedsProfileCompletion, updateImage } = authSlice.actions

// 直接选取整个 auth state
export const selectAuth = (state: RootState) => state.auth

// 创建一个 memoized selector，只处理 username 并加默认值
export const selectUsername = createSelector(
  selectAuth,
  auth => auth.username ?? 'Unknown User'
)

// 新增 selector 获取 needsProfileCompletion
export const selectNeedsProfileCompletion = createSelector(
  selectAuth,
  auth => auth.needsProfileCompletion
)

export default authSlice.reducer
