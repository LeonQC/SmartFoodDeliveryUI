import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface OrderItem {
  dishId: number
  name?: string        // 可选，方便预览展示
  price?: number       // 可选
  quantity: number
  subtotal: number
  remark?: string
}

interface PendingOrder {
  items: OrderItem[]
  addressId?: number    // 用户选择的地址ID
  addressInfo?: any     // 选填，展示用（如你想存整个地址对象）
  remark?: string       // 用户填写的订单备注
}

interface OrderState {
  pendingOrder: PendingOrder | null
}

const initialState: OrderState = {
  pendingOrder: null,
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    // 设置“待提交订单”，通常在购物车页“去结算”时调用
    setPendingOrder(state, action: PayloadAction<PendingOrder>) {
      state.pendingOrder = action.payload
    },
    // 只更新地址
    setOrderAddress(state, action: PayloadAction<{addressId: number; addressInfo?: any}>) {
      if (state.pendingOrder) {
        state.pendingOrder.addressId = action.payload.addressId
        state.pendingOrder.addressInfo = action.payload.addressInfo
      }
    },
    // 设置备注
    setOrderRemark(state, action: PayloadAction<string>) {
      if (state.pendingOrder) {
        state.pendingOrder.remark = action.payload
      }
    },
    // 下单完成或取消时清空
    clearPendingOrder(state) {
      state.pendingOrder = null
    }
  },
})

export const { setPendingOrder, setOrderAddress, setOrderRemark, clearPendingOrder } = orderSlice.actions
export default orderSlice.reducer
