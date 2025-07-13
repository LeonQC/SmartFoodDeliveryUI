'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/apiClient';
import toast from 'react-hot-toast';

type OrderItemVO = {
  dishName: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
  remark?: string;
};

type AddressBookVO = {
  recipient: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
};

type OrderStatusLogVO = {
  fromStatus?: number;
  toStatus: number;
  changedBy: string;
  remark?: string;
  changedAt: string;
};

export type ClientOrderDetailVO = {
  orderId: number;
  items: OrderItemVO[];
  address: AddressBookVO;
  merchantName: string;
  merchantPhone: string;
  totalAmount: string;
  deliveryFee: string;
  paymentMethod: string;
  paidAt?: string;
  payStatus: number;
  status: number;
  remark?: string;
  riderPhone?: string;
  statusLogs: OrderStatusLogVO[];
};

function orderStatusText(status?: number) {
  switch (status) {
    case 0: return "待支付";
    case 1: return "待接单";
    case 2: return "备餐中";
    case 3: return "已就绪";
    case 4: return "取餐中";
    case 5: return "配送中";
    case 6: return "已完成";
    case 7: return "已取消";
    default: return "无";
  }
}

function payStatusText(status?: number) {
  switch (status) {
    case 0: return "未支付";
    case 1: return "已支付";
    case 2: return "已退款";
    default: return "未知";
  }
}

export default function ClientOrderDetailPage() {
  const router = useRouter();
  const { orderId } = useParams() as { orderId: string };
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientOrderDetailVO | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    apiClient.get(`/client/order/${orderId}`)
      .then(res => {
        setDetail(res.data.data);
      })
      .catch(e => {
        toast.error('获取订单详情失败');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading || !detail) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const address = detail.address;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">订单详情</h2>
        <Button variant="ghost" size="sm" onClick={() => router.replace('/client/order')}>返回</Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold">{detail.merchantName}</div>
            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{orderStatusText(detail.status)}</span>
          </div>
          <div className="text-gray-500 text-sm">联系电话：{detail.merchantPhone || '-'}</div>
          <div className="text-gray-600 mt-2">
            <span className="font-medium">订单号：</span>{detail.orderId}
          </div>
          <div className="text-gray-600 mt-2">
            <span className="font-medium">支付状态：</span>{payStatusText(detail.payStatus)}
            {detail.paidAt && <span className="ml-6">支付时间：{detail.paidAt.replace('T', ' ').slice(0, 16)}</span>}
          </div>
        </CardContent>
      </Card>

      {/* 地址信息 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="font-medium mb-2">收货地址</div>
          <div>{address.recipient} {address.phone}</div>
          <div>
            {address.addressLine1}
            {address.addressLine2 ? `，${address.addressLine2}` : ''}
            ，{address.city}，{address.state}
          </div>
        </CardContent>
      </Card>

      {/* 菜品列表 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="font-medium mb-2">菜品列表</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left py-1">菜品</th>
                  <th className="text-center py-1">单价</th>
                  <th className="text-center py-1">数量</th>
                  <th className="text-center py-1">小计</th>
                  <th className="text-center py-1">备注</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map(item => (
                  <tr key={item.dishName} className="border-b last:border-b-0">
                    <td className="py-1">{item.dishName}</td>
                    <td className="py-1 text-center">${item.unitPrice}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-center">${item.subtotal}</td>
                    <td className="py-1 text-center">{item.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4 space-x-6">
            <div>商品金额：<span className="font-semibold text-gray-800">${detail.totalAmount}</span></div>
            <div>配送费：<span className="font-semibold text-gray-800">${detail.deliveryFee}</span></div>
            <div>实付金额：<span className="text-red-600 font-bold text-lg">${(Number(detail.totalAmount) + Number(detail.deliveryFee)).toFixed(2)}</span></div>
          </div>
          {detail.remark && (
            <div className="mt-2 text-gray-500 text-sm">备注：{detail.remark}</div>
          )}
        </CardContent>
      </Card>

      {/* 骑手信息 */}
      {detail.riderPhone && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="font-medium mb-2">配送信息</div>
            <div>骑手电话：{detail.riderPhone}</div>
          </CardContent>
        </Card>
      )}

      {/* 状态流水 */}
      <Card>
        <CardContent className="p-6">
          <div className="font-medium mb-2">订单状态跟踪</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="py-1 text-center">时间</th>
                  <th className="py-1 text-center">操作者</th>
                  <th className="py-1 text-center">旧状态</th>
                  <th className="py-1 text-center">新状态</th>
                  <th className="py-1 text-center">备注</th>
                </tr>
              </thead>
              <tbody>
                {detail.statusLogs.map((log, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="py-1 text-center">{log.changedAt.replace('T', ' ').slice(0, 16)}</td>
                    <td className="py-1 text-center">{log.changedBy}</td>
                    <td className="py-1 text-center">{orderStatusText(log.fromStatus)}</td>
                    <td className="py-1 text-center font-bold">{orderStatusText(log.toStatus)}</td>
                    <td className="py-1 text-center">{log.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
