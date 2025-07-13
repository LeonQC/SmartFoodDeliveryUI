'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useSidebar } from '@/components/SidebarContext';
import { useAppDispatch } from '@/store/hooks'
import { setMerchant as setMerchantRedux } from '@/store/slices/merchantSlice'

interface Category {
  sort: number;
  categoryId: number;
  name: string;
}

interface Dish {
  dishId: number;
  name: string;
  price: number;
  status: number;
  image?: string;
  description: string;
}

interface Merchant {
  phone: number;
  merchantId: number;
  merchantName: string;
  address: string;
  city: string;
  state: string;
  merchantDescription: string;
  merchantImage?: string;
  merchantType: string;
  merchantStatus: string;
  merchantOpeningHours: Record<string, string>;
  categories: Category[];
}

export default function MerchantPage() {
  const router = useRouter();
  const { merchantId } = useParams();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [showHours, setShowHours] = useState(false);
  const { collapsed } = useSidebar();
  const dispatch = useAppDispatch();
  const barClass = collapsed
  ? "w-[calc(100vw-5rem)] ml-20"
  : "w-[calc(100vw-16rem)] ml-64";

  // 购物车状态
  const [cartItems, setCartItems] = useState<Record<number, { cartId: number; quantity: number; subtotal: number }>>({});

  // 加载购物车
  useEffect(() => {
    apiClient
      .get('/client/cart')
      .then(res => {
        const list = res.data.data as any[];
        const map: Record<number, { cartId: number; quantity: number; subtotal: number }> = {};
        list.forEach(item => map[item.dishId] = { cartId: item.cartId, quantity: item.quantity, subtotal: item.subtotal });
        setCartItems(map);
      })
      .catch(console.error);
  }, []);
  // 加入购物车
  const handleAdd = async (dishId: number) => {
    const existing = cartItems[dishId];
    if (existing) {
      await apiClient.put(`/client/cart/${existing.cartId}`, { dishId, quantity: existing.quantity + 1 });
    } else {
      await apiClient.post('/client/cart', { dishId, quantity: 1 });
    }
    const resp = await apiClient.get('/client/cart');
    const newMap: Record<number, { cartId: number; quantity: number; subtotal: number }> = {};
    (resp.data.data as any[]).forEach(item => newMap[item.dishId] = { cartId: item.cartId, quantity: item.quantity, subtotal: item.subtotal });
    setCartItems(newMap);
  };
  // 从购物车中减
  const handleMinus = async (dishId: number) => {
    const existing = cartItems[dishId];
    if (!existing) return;
    const newQty = existing.quantity - 1;
    try {
      if (newQty > 0) {
        await apiClient.put(`/client/cart/${existing.cartId}`, { dishId, quantity: newQty });
      } else {
        console.log('cartIdList:', [existing.cartId]);
        await apiClient.delete('/client/cart/remove', {
          params: { cartIdList: [existing.cartId] }
        });
      }
      const resp = await apiClient.get('/client/cart');
      const newMap: Record<number, { cartId: number; quantity: number; subtotal: number }> = {};
      (resp.data.data as any[]).forEach(item => newMap[item.dishId] = { cartId: item.cartId, quantity: item.quantity, subtotal: item.subtotal });
      setCartItems(newMap);
    } catch (err) {
      // 简单报错
      toast.error('操作失败，请重试');
    }
  };

  const cartCount = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Object.values(cartItems).reduce((sum, item) => sum + item.subtotal, 0);

  // fetch merchant details
  useEffect(() => {
    if (!merchantId) return;
    apiClient
      .get(`/client/browse/merchants/${merchantId}`)
      .then(res => {
        const data = res.data.data as Merchant;
        setMerchant(data);
        dispatch(setMerchantRedux({
          merchantId: data.merchantId,
          merchantName: data.merchantName,
          address: data.address,
          city: data.city,
          state: data.state,
          phone: data.phone,
        }));        
        if (data.categories.length) {
          // default to category with smallest sort value
          const defaultCat = [...data.categories].sort((a, b) => a.sort - b.sort)[0];
          setSelectedCat(defaultCat.categoryId);
        }
      })
      .catch(console.error);
  }, [merchantId]);

  // fetch dishes for selected category
  useEffect(() => {
    if (!merchantId || selectedCat === null) return;
    apiClient
      .get(`/client/browse/merchants/${merchantId}/categories/${selectedCat}`)
      .then(res => setDishes(res.data.data as Dish[]))
      .catch(console.error);
  }, [merchantId, selectedCat]);

  if (!merchant) {
    return <p className="p-4 text-center">Loading merchant...</p>;
  }
  // Sort categories by 'sort' ascending
  const sortedCategories = [...merchant.categories].sort((a, b) => a.sort - b.sort);
  
  return (
    <div className="w-full p-4 space-y-6 pb-10">
      {/* merchant header */}
      <Card className="w-full flex flex-col md:flex-row gap-4 relative h-64">
        {merchant.merchantImage ? (
          <img
            src={`/api/images?key=${encodeURIComponent(merchant.merchantImage)}`}
            alt={merchant.merchantName}
            className="w-full md:w-1/6 h-64 object-cover"
          />
        ) : (
          <div className="w-full md:w-1/6 h-64 bg-gray-200">无图</div>
        )}
        <CardContent className="flex-1 p-6 relative overflow-auto">
          {/* type & status at top-right */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <Badge variant="primary">{merchant.merchantType}</Badge>
            <Badge variant={merchant.merchantStatus === '1' ? 'success' : 'destructive'}>
              {merchant.merchantStatus === '1' ? '营业中' : '已打烊'}
            </Badge>
          </div>

          <h1 className="text-3xl font-bold mb-5">{merchant.merchantName}</h1>
          <p className="text-sm text-black mb-2">
            {merchant.address}, {merchant.city}, {merchant.state}
          </p>
          <p className="text-sm text-black mb-2">Phone: {merchant.phone}</p>
          <p className="mb-3">{merchant.merchantDescription}</p>

          {/* opening hours toggle */}
          <button
            className="mb-4 text-sm text-blue-600 underline"
            onClick={() => setShowHours(h => !h)}
          >
            {showHours ? 'Hide Opening Hours' : 'Show Opening Hours'}
          </button>
          {showHours && (
            <div className="mb-4 p-3 bg-gray-100 rounded">
              {/* 按周一到周日顺序显示 */}
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                const hours = merchant.merchantOpeningHours[d];
                return hours ? (
                  <div key={d} className="text-sm">
                    <strong>{d}:</strong> {hours}
                  </div>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* categories + dishes */}
      <div className="flex w-full gap-4">
        {/* categories */}
        <div className="w-1/6 bg-white rounded shadow overflow-hidden"
            style={{ maxHeight: "calc(100vh - 28rem)" }}>
          <div className="flex flex-col h-full divide-y divide-gray-200">
            {sortedCategories.map(cat => (
              <button
                key={cat.categoryId}
                onClick={() => setSelectedCat(cat.categoryId)}
                className={`w-full flex items-center px-3 py-2 transition-colors duration-150 focus:outline-none flex-1 min-h-0
                  ${selectedCat === cat.categoryId
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'bg-white text-gray-800 hover:bg-gray-50'}
                `}
                style={{ minHeight: 0 }}
              >
                {selectedCat === cat.categoryId && (
                  <span className="text-blue-500 mr-2">➤</span>
                )}
                <span className="flex-1 text-left">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
        {/* dishes single column */}
        <div className="w-5/6 space-y-4 overflow-auto max-h-[calc(100vh-28rem)]">
          {dishes.map(dish => (
            <Card key={dish.dishId} className="w-full flex flex-row items-center gap-4 p-4 h-40">
              {dish.image ? (
                <div className="w-32 h-full ml-2 flex-shrink-0 overflow-hidden rounded">
                  <img
                    src={`/api/images?key=${encodeURIComponent(dish.image)}`}
                    alt={dish.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded bg-gray-300 flex items-center justify-center ml-2">
                无图
                </div>
              )}
              <CardContent className="flex-1 py-5">
                <div className="grid grid-cols-[1fr_4fr_1fr_0.5fr] items-center gap-4">
                  {/* Column 1: Dish Name */}
                  <span className="font-semibold">{dish.name}</span>
                  {/* Column 2: Description */}
                  <span className="text-sm text-gray-600 truncate">{dish.description}</span>
                  {/* Column 3: Price */}
                  <span>${dish.price.toFixed(2)}</span>
                  {/* Column 4: Add to cart button */}
                  {cartItems[dish.dishId] ? (
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleMinus(dish.dishId)} className="h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-white">-</button>
                      <span>{cartItems[dish.dishId].quantity}</span>
                      <button onClick={() => handleAdd(dish.dishId)} className="h-6 w-6 flex items-center justify-center rounded-full bg-yellow-500 text-white">+</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleAdd(dish.dishId)} className="h-6 w-6 flex items-center justify-center rounded-full bg-yellow-500 text-white">+</button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 购物车统计栏 */}
      <>
        {/* 你的页面内容 */}
        {cartCount > 0 && (
          <div className={`fixed bottom-0 left-0 z-50 bg-white border-t shadow-lg h-16 flex items-center justify-between px-8 transition-all duration-200 ${barClass}`}>
            <div>
              <span className="mr-6 font-medium">购物车菜品数量：<span className="text-blue-600">{cartCount}</span></span>
              <span className="mr-6 font-medium">总计：<span className="text-green-600">${cartTotal.toFixed(2)}</span></span>
            </div>
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
              onClick={() => router.push('/client/cart')}
            >
              进入购物车
            </button>
          </div>
        )}
      </>
    </div>
  );
}

