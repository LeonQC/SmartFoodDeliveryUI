'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import apiClient from '@/services/apiClient'
import toast from 'react-hot-toast'
import { clearMerchant } from '@/store/slices/merchantSlice'
export default function OrderSubmitPage() {
  const router = useRouter()
  // 从 redux 读取订单明细
  const pendingOrder = useAppSelector(state => state.order.pendingOrder)
  // 从 redux 读取地址簿列表
  // 默认选中第一个 isDefault（没有则第一个）
  const addressList = useAppSelector(state => state.address.addressList)
  // 从 redux 读取当前商家信息
  const merchant = useAppSelector(state => state.merchant.currentMerchant)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [orderRemark, setOrderRemark] = useState('')
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    if (!addressList || addressList.length === 0) return
    const defaultAddr = addressList.find(a => a.isDefault) || addressList[0]
    setSelectedAddressId(defaultAddr.addressId)
  }, [addressList])

  useEffect(() => {
    if (!merchant || !selectedAddressId) {
      setDeliveryFee(null)
      setDistance(null)
      return
    }
    apiClient
      .get('/client/deliveryFee', {
        params: {
          merchantId: merchant.merchantId,
          addressId: selectedAddressId,
        },
      })
      .then(res => {
        setDeliveryFee(res.data.data.deliveryFee)
        setDistance(res.data.data.distance) // 可选
      })
      .catch(() => {
        setDeliveryFee(null)
        setDistance(null)
        toast.error('配送费获取失败')
      })
  }, [merchant, selectedAddressId])

  if (!pendingOrder || !pendingOrder.items || pendingOrder.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center text-gray-500">
        无待提交订单，请先返回购物车选择商品
        <div>
          <button
            className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded"
            onClick={() => router.push('/client/cart')}
          >
            返回购物车
          </button>
        </div>
      </div>
    )
  }

  const totalAmount = pendingOrder.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

  // 提交订单
  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      toast.error('请选择收货地址')
      return
    }
    if (!merchant) {
      toast.error('无法获取商家信息，请重试')
      return
    }
    if (deliveryFee === null) {
      toast.error('无法获取配送费')
      return
    }
    if (distance !== null && distance > 10000) {
      toast.error('超出配送范围，无法下单')
      return
    }
    try {
      // 订单写库(写库时注意配送距离不要超过10km) 还需加入status等字段，并同步写库order_status_log
      const res = await apiClient.post('/client/order/submit', {
        items: pendingOrder.items,
        merchantId: merchant.merchantId,
        addressId: selectedAddressId,
        remark: orderRemark,
        deliveryFee,
      })
      const orderId = res.data.data.orderId;
      // 清空后端购物车
      await apiClient.delete('/client/cart/clear');
      // 清空前端 Redux (用 dispatch)
      dispatch(clearMerchant());
      toast.success('下单成功');
      router.replace(`/client/order/pay?orderId=${orderId}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.msg || '下单失败')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">确认订单</h2>

      {/* 1. 地址选择 */}
      <div className="mb-6 bg-white rounded shadow p-4">
        <div className="font-semibold mb-2">收货地址</div>
        {addressList.length === 0 ? (
          <div className="text-gray-500">
            暂无地址，请先
            <button
              className="text-blue-600 underline mx-2"
              onClick={() => router.push('/client/address')}
            >
              添加地址
            </button>
          </div>
        ) : (
          <>
            {/* 只显示选中地址 */}
            {(() => {
              const addr = addressList.find(a => a.addressId === selectedAddressId);
              if (!addr) return null;
              return (
                <div className="flex items-start gap-4 p-3 border rounded bg-indigo-50 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 rounded text-xs bg-indigo-600 text-white">默认</span>
                      )}
                    </div>
                    <div className="text-gray-700">{addr.recipient}</div>
                    <div className="text-gray-700">{addr.phone}</div>
                    <div className="text-gray-500">
                      {addr.country} {addr.state} {addr.city} {addr.addressLine1} {addr.addressLine2}
                    </div>
                    <div className="text-gray-400">邮编: {addr.zipcode}</div>
                  </div>
                  <button
                    className="px-3 py-1 text-blue-600 border border-blue-500 rounded hover:bg-blue-50"
                    onClick={() => setShowAddrModal(true)}
                  >
                    更换地址
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* 2. 商品明细 */}
      <div className="mb-6 bg-white rounded shadow p-4">
        <div className="font-semibold mb-2">订单明细</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">菜品</th>
              <th className="text-center py-1">数量</th>
              <th className="text-center py-1">单价</th>
              <th className="text-center py-1">小计</th>
              <th className="text-center py-1">备注</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrder.items.map(item => (
              <tr key={item.dishId} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">${item.price?.toFixed(2) ?? '-'}</td>
                <td className="text-center font-semibold text-green-600">${item.subtotal?.toFixed(2) ?? '-'}</td>
                <td className="text-center">{item.remark || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex mt-2 text-base justify-between">
          {distance !== null && (
            <span className="text-gray-500 text-sm ml-1">
              距离：{(distance / 1000).toFixed(2)} km
              {distance > 10000 && (
                <span className="ml-2 text-red-600 font-semibold">
                  超出配送范围(10km),不可下单
                </span>
              )}
            </span>
          )}
          <div>
            <span>配送费：</span>
            <span className="font-bold text-green-600 ml-2">
              {deliveryFee !== null ? `$ ${Number(deliveryFee).toFixed(2)}` : '--'}
            </span>
          </div>  
        </div>
        <div className="flex justify-end mt-1 text-lg">
          <span>总计：</span>
          <span className="font-bold text-red-600 ml-2">
            ${deliveryFee !== null ? (totalAmount + Number(deliveryFee)).toFixed(2) : totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 3. 订单备注 */}
      <div className="mb-6 bg-white rounded shadow p-4">
        <label className="font-semibold block mb-2">订单备注（选填）</label>
        <textarea
          className="w-full border rounded px-3 py-2 min-h-[60px]"
          value={orderRemark}
          onChange={e => setOrderRemark(e.target.value)}
          placeholder="给商家留言（如忌口、送达时间等）"
        />
      </div>

      {/* 4. 操作栏 */}
      <div className="flex justify-end gap-4">
        <button
          className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => router.back()}
        >
          返回
        </button>
        <button
          className={`px-8 py-2 rounded font-semibold text-white ${
            !selectedAddressId || (distance !== null && distance > 10000)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          disabled={!selectedAddressId || (distance !== null && distance > 10000)}
          onClick={handleSubmitOrder}
        >
          提交订单
        </button>
      </div>
      {showAddrModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
          <div className="text-xl font-bold mb-4">选择收货地址</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {addressList.map(addr => (
              <label
                key={addr.addressId}
                className={`flex cursor-pointer rounded border px-3 py-2 mb-2 items-start ${
                  addr.addressId === selectedAddressId
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => {
                  setSelectedAddressId(addr.addressId)
                  setShowAddrModal(false)
                }}
              >
                <input
                  type="radio"
                  name="address"
                  checked={addr.addressId === selectedAddressId}
                  readOnly
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded text-xs bg-indigo-600 text-white">默认</span>
                    )}
                  </div>
                  <div className="text-gray-700">{addr.recipient}</div>
                  <div className="text-gray-700">{addr.phone}</div>
                  <div className="text-gray-500">
                    {addr.country} {addr.state} {addr.city} {addr.addressLine1} {addr.addressLine2}
                  </div>
                  <div className="text-gray-400">邮编: {addr.zipcode}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              onClick={() => setShowAddrModal(false)}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
