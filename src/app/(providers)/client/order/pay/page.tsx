'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/services/apiClient';
import toast from 'react-hot-toast';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentElement from './StripePaymentElement';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!); // 自己的Stripe公钥

type OrderDetailVO = {
  orderId: number;
  merchantName: string;
  totalAmount: number;
  deliveryFee: number;
  status: number; // 0待支付
  payStatus: number; // 0未支付，1已支付
};
export default function PayOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderDetailVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // 获取订单详情
  useEffect(() => {
    if (!orderId) {
      toast.error('缺少订单ID');
      router.replace('/client/order');
      return;
    }
    setLoading(true);
    apiClient
      .get(`/client/order/${orderId}`)
      .then(res => setOrder(res.data.data))
      .catch(() => {
        toast.error('获取订单信息失败');
        router.replace('/client/order');
      })
      .finally(() => setLoading(false));
  }, [orderId, router]);

  // 获取 Stripe clientSecret
  useEffect(() => {
    if (!orderId) return;
    apiClient
      .post('/client/order/pay', { orderId: Number(orderId) })
      .then(res => setClientSecret(res.data.data.clientSecret))
      .catch(() => {
        toast.error('获取支付信息失败');
        router.replace('/client/order');
      });
  }, [orderId, router]);

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!order || !clientSecret) return null;

  return (
    <div className="max-w-lg mx-auto p-6 mt-10">
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-5 w-full">
          <h2 className="text-xl font-bold">订单付款</h2>
          <div className="text-lg">
            商家：<span className="font-semibold">{order.merchantName}</span>
          </div>
          <div>
            金额：<span className="text-2xl font-bold text-red-600">${order.totalAmount+order.deliveryFee}</span>
          </div>
          {order.payStatus === 0 && order.status === 0 && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' }
              }}
            >
              <StripePaymentElement orderId={orderId} />
            </Elements>
          )}

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => router.replace('/client/order')}
          >
            返回订单列表
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
