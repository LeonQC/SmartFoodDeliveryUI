'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/SidebarContext';
import { useAppDispatch } from '@/store/hooks';
import { setPendingOrder } from '@/store/slices/orderSlice';
import { useAppSelector } from '@/store/hooks';
import { clearMerchant } from '@/store/slices/merchantSlice';

interface CartItem {
  cartId: number;
  dishId: number;
  dishName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarkMap, setRemarkMap] = useState<Record<number, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const merchant = useAppSelector(state => state.merchant.currentMerchant);
  const { collapsed } = useSidebar();
  const dispatch = useAppDispatch();
  const barClass = collapsed
  ? "w-[calc(100vw-5rem)] ml-20"
  : "w-[calc(100vw-16rem)] ml-64";

  // 获取购物车数据
  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/client/cart');
      setCartItems(res.data.data || []);
      setSelectedIds(new Set()); // 刷新后清空选中
    } catch (e) {
      toast.error('加载购物车失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // 数量操作
  const handleAdd = async (item: CartItem) => {
    await apiClient.put(`/client/cart/${item.cartId}`, {
      dishId: item.dishId,
      quantity: item.quantity + 1
    });
    fetchCart();
  };
  const handleMinus = async (item: CartItem) => {
    if (item.quantity <= 1) {
      await apiClient.delete('/client/cart/remove', { params: { cartIdList: [item.cartId] } });
    } else {
      await apiClient.put(`/client/cart/${item.cartId}`, {
        dishId: item.dishId,
        quantity: item.quantity - 1
      });
    }
    fetchCart();
  };

  // 单项删除
  const removeItem = async (cartId: number) => {
    try {
      await apiClient.delete('/client/cart/remove', {
        params: { cartIdList: [cartId] }
      });
      fetchCart();
    } catch (e) {
      toast.error('删除失败');
    }
  };
    // 批量删除
    const removeSelected = async () => {
      if (selectedIds.size === 0) return;
      if (!confirm('确认删除选中项？')) return;
      try {
        await apiClient.delete('/client/cart/remove', {
          params: { cartIdList: Array.from(selectedIds) }
        });
        fetchCart();
      } catch (e) {
        toast.error('批量删除失败');
      }
    };

  // 清空购物车
  const clearCart = async () => {
    if (!confirm('确认清空购物车？')) return;
    try {
      await apiClient.delete('/client/cart/clear');
      dispatch(clearMerchant());
      fetchCart();
    } catch (e) {
      toast.error('清空失败');
    }
  };

  // 单个checkbox切换
  const handleSelect = (cartId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cartId)) newSet.delete(cartId);
      else newSet.add(cartId);
      return newSet;
    });
  };

  // 总计
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  // 结算
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('购物车为空');
      return;
    }
    // 整理要传递的商品数据
    const items = cartItems.map(item => ({
      dishId: item.dishId,
      name: item.dishName,
      price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      remark: remarkMap[item.dishId] || ''
    }));
    // 保存到 Redux
    dispatch(setPendingOrder({ items }));
    // 跳转到订单确认页
    router.push('/client/order/submit');
  };

  return (
    <div className="flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center mb-4 px-4 pt-4">
        {/* 返回店铺按钮 */}
        {merchant && (
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold"
            onClick={() => router.push(`/client/browse/${merchant.merchantId}`)}
          >
            返回店铺
          </button>
        )}
        <div className="flex items-center justify-end gap-4">
          {cartItems.length > 0 && (
            <button
              className={`px-4 py-2 rounded text-white font-medium ${selectedIds.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
              disabled={selectedIds.size === 0}
              onClick={removeSelected}
            >
              批量删除{selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          )}  
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:underline"
            >
              清空购物车
            </button>
          )}
        </div>
      </div>
      {/* 商家信息栏 */}
      {merchant && (
        <div className="bg-white rounded shadow p-4 mb-4 flex items-center gap-4">
          <span className="text-lg font-bold text-indigo-700">{merchant.merchantName}</span>
          <span className="text-gray-500 ml-3">{merchant.address}, {merchant.city}, {merchant.state}</span>
          <span className="text-gray-500 ml-6">电话: {merchant.phone}</span>
        </div>
      )}
      {/* 购物车内容 */}
      {loading ? (
        <p className="text-center">加载中...</p>
      ) : cartItems.length === 0 ? (
        <p className="text-center text-gray-500">购物车空空如也~</p>
      ) : (
        <div className="space-y-4 overflow-auto max-h-[calc(100vh-20rem)]">
          {cartItems.map((item) => (
            <Card key={item.cartId} className="flex items-center gap-4 p-4">
              {/* 复选框 */}
              <input
                type="checkbox"
                className="w-5 h-5 mr-2"
                checked={selectedIds.has(item.cartId)}
                onChange={() => handleSelect(item.cartId)}
              />
              <div className="w-24 h-24 rounded overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                {item.image ? (
                  <img
                    src={`/api/images?key=${encodeURIComponent(item.image)}`}
                    alt={item.dishName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400">无图</span>
                )}
              </div>
              <CardContent className="flex-1 space-y-2 py-5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{item.dishName}</span>
                  <span className="text-sm text-gray-400">${item.unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                    onClick={() => handleMinus(item)}
                  >-</button>
                  <span className="mx-2">{item.quantity}</span>
                  <button
                    className="h-6 w-6 rounded-full bg-yellow-500 text-white flex items-center justify-center"
                    onClick={() => handleAdd(item)}
                  >+</button>
                  <button
                    className="ml-4 text-sm text-red-400 hover:underline"
                    onClick={() => removeItem(item.cartId)}
                  >
                    删除
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={remarkMap[item.dishId] || ''}
                    onChange={e =>
                      setRemarkMap(prev => ({
                        ...prev,
                        [item.dishId]: e.target.value
                      }))
                    }
                    placeholder="备注（可选）"
                    className="border rounded px-2 py-1 w-1/3 mt-2"
                  />
                  <span className="text-right text-gray-500 flex-1">
                    小计: ${item.subtotal.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* 统计栏 */}
      {cartItems.length > 0 && (
        <div className={`fixed bottom-0 left-0 z-50 bg-white border-t shadow-lg h-16 flex items-center justify-between px-8 transition-all duration-200 ${barClass}`}>
          <span>
            共 <span className="text-lg font-bold">{totalCount}</span> 件
          </span>
          <span className="font-bold text-red-600">
            总计：${totalAmount.toFixed(2)}
          </span>
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
            onClick={handleCheckout}
          >
            去结算
          </button>
        </div>
      )}
    </div>
  );
}
