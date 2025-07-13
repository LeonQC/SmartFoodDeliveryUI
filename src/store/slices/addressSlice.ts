import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AddressBook {
  addressId: number
  label: string
  recipient: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zipcode?: string
  country: string
  isDefault: boolean
}

interface AddressState {
  addressList: AddressBook[]
}

const initialState: AddressState = {
  addressList: [],
}

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    setAddressList(state, action: PayloadAction<AddressBook[]>) {
      state.addressList = action.payload
    },
    addAddress(state, action: PayloadAction<AddressBook>) {
      state.addressList.push(action.payload)
    },
    updateAddress(state, action: PayloadAction<AddressBook>) {
      const idx = state.addressList.findIndex(a => a.addressId === action.payload.addressId)
      if (idx !== -1) state.addressList[idx] = action.payload
    },
    removeAddress(state, action: PayloadAction<number>) {
      state.addressList = state.addressList.filter(a => a.addressId !== action.payload)
    },
    bulkRemoveAddresses(state, action: PayloadAction<number[]>) {
      state.addressList = state.addressList.filter(a => !action.payload.includes(a.addressId))
    },
    clearAddressList(state) {
      state.addressList = []
    }
  }
})

export const { setAddressList, addAddress, updateAddress, removeAddress, bulkRemoveAddresses, clearAddressList } = addressSlice.actions
export default addressSlice.reducer
