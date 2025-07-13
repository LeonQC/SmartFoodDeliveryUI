import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Merchant {
  merchantId: number;
  merchantName: string;
  address: string;
  city: string;
  state: string;
  phone: number;
}

const initialState: { currentMerchant: Merchant | null } = {
  currentMerchant: null
}

const merchantSlice = createSlice({
  name: 'merchant',
  initialState,
  reducers: {
    setMerchant(state, action: PayloadAction<Merchant>) {
      state.currentMerchant = action.payload
    },
    clearMerchant(state) {
      state.currentMerchant = null
    }
  }
})

export const { setMerchant, clearMerchant } = merchantSlice.actions
export default merchantSlice.reducer
