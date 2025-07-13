'use client';

import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';

type Props = { orderId: string | string[] | null };

export default function StripePaymentElement({ orderId }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  // 轮询查询订单是否已支付
  async function waitForOrderPaid(orderId: string | number, maxTries = 10, delay = 800) {
    for (let i = 0; i < maxTries; i++) {
      try {
        const res = await apiClient.get(`/client/order/${orderId}`);
        // 根据你的订单状态，status=1 代表已支付，可能需要调整
        if (res.data.data.status === 1) {
          return true;
        }
      } catch (e) {
        // 可以忽略，继续轮询
      }
      await new Promise(res => setTimeout(res, delay));
    }
    return false;
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/client/order/${orderId}`,
      },
      redirect: 'if_required'
    });

    if (error) {
      setPaying(false);
      toast.error(error.message || '支付失败');
      return;
    }

    // 支付意图已成功，等待后端确认订单状态
    let realOrderId: string | number | undefined = undefined;
    if (Array.isArray(orderId)) {
      realOrderId = orderId[0];
    } else if (typeof orderId === 'string') {
      realOrderId = orderId;
    }
    if (!realOrderId) {
      toast.error('订单ID无效');
      setPaying(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('支付成功，正在确认订单...');
      const ok = await waitForOrderPaid(realOrderId);
      setPaying(false);

      if (ok) {
        toast.success('订单已确认！');
        router.replace(`/client/order/${realOrderId}`);
      } else {
        toast.error('支付成功但订单尚未确认，请稍后刷新');
        // 跳转但页面要友好提示（比如显示“订单确认中...”）
        router.replace(`/client/order/${realOrderId}`);
      }
    } else {
      setPaying(false);
      toast.error('支付未完成');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mt-5 flex flex-col gap-4">
      <PaymentElement />
      <Button
        size="lg"
        className="w-full"
        disabled={paying}
        type="submit"
      >
        {paying ? '支付中...' : '确认支付'}
      </Button>
    </form>
  );
}
