'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { RejectReasonModal } from '@/components/RejectReasonModal';

export type ClientOrderVO = {
  orderId: number;
  items: string;
  merchantName: string;
  paidAt?: string;
  eta?: string;
  amount: string;
  status: number;
  attemptedAt?: string;
  riderAssignmentId?: number;
  riderPhone?: string;
  createTime?: string;
};

const PAGE_SIZE = 5;

// 状态转中文
function orderStatusText(status: number) {
  switch (status) {
    case 0: return "待支付";
    case 1: return "待接单";
    case 2: return "备餐中";
    case 3: return "已就绪";
    case 4: return "取餐中";
    case 5: return "配送中";
    case 6: return "已完成";
    case 7: return "已取消";
    default: return "未知";
  }
}

export default function ClientOrderPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [activeOrders, setActiveOrders] = useState<ClientOrderVO[]>([]);
  const [completedOrders, setCompletedOrders] = useState<ClientOrderVO[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<ClientOrderVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreCompleted, setHasMoreCompleted] = useState(true);
  const [hasMoreCancelled, setHasMoreCancelled] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);

  // 打开弹窗
  const openCancelModal = (orderId: number) => {
    setCancelOrderId(orderId);
    setCancelReason('');
    setCancelModalOpen(true);
  };
  // 关闭弹窗
  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelOrderId(null);
    setCancelReason('');
  };
  // 确认取消
  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.error("请输入取消理由");
      return;
    }
    try {
      await apiClient.post('/client/order/cancel', {
        orderId: cancelOrderId,
        reason: cancelReason 
      });
      toast.success('订单已取消');
      closeCancelModal();
      // 刷新列表或移除本地数据
      setActiveOrders(prev => prev.filter(o => o.orderId !== cancelOrderId));
      // 重新拉取已取消订单
      fetchPagedOrders('cancelled');
    } catch (err: any) {
      toast.error(err?.response?.data?.msg || '取消失败');
    }
  };

  // 获取进行中订单（不分页，全部显示）
  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/client/order', {
         statusType: 'processing'
      });
      setActiveOrders(res.data.data?.rows || []);
    } catch (e) {
      toast.error('获取进行中订单失败');
    }
    setLoading(false);
  };

  // 已完成/已取消 分页
  const fetchPagedOrders = async (
    status: 'completed' | 'cancelled',
    lastCreateTime?: string,
    lastOrderId?: number,
    append: boolean = false
  ) => {
    if (status === 'completed' && !hasMoreCompleted && append) return;
    if (status === 'cancelled' && !hasMoreCancelled && append) return;

    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await apiClient.post('/client/order', {
          statusType: status,
          lastCreateTime,
          lastOrderId,
          pageSize: PAGE_SIZE,
      });
      const list = res.data.data?.rows || [];
      if (status === 'completed') {
        setCompletedOrders(prev => append ? [...prev, ...list] : list);
        setHasMoreCompleted(list.length === PAGE_SIZE);
      } else {
        setCancelledOrders(prev => append ? [...prev, ...list] : list);
        setHasMoreCancelled(list.length === PAGE_SIZE);
      }
    } catch (e) {
      toast.error('获取订单失败');
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchActiveOrders();
    fetchPagedOrders('completed');
    fetchPagedOrders('cancelled');
    // eslint-disable-next-line
  }, []);

  // Tab切换刷新
  const handleTabChange = (value: string) => {
    setTab(value as typeof tab);
    // 如果有需要可以每次tab切换都刷新，也可以保留已加载数据
  };

  return (
    <div className="max-w-3xl mx-auto p-4 mt-10">
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">进行中</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
          <TabsTrigger value="cancelled">已取消</TabsTrigger>
        </TabsList>

        {/* 进行中订单 */}
        <TabsContent value="active">
          {loading && <Skeleton className="h-28 w-full mb-2" />}
          {!loading && activeOrders.length === 0 && (
            <div className="text-gray-400 text-center py-12">暂无进行中订单</div>
          )}
          {activeOrders.map(order => (
            <Card
              key={order.orderId}
              className="mb-3 hover:shadow-lg transition cursor-pointer"
              onClick={() => router.push(`/client/order/${order.orderId}`)}
            >
              <CardContent className="py-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">{order.merchantName}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{orderStatusText(order.status)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">菜品：{order.items}</div>
                <div className="flex text-sm justify-between text-gray-500 items-center">
                  <div>
                    <span>金额：</span>
                    <span className="text-red-600 font-bold">${order.amount}</span>
                  </div>
                  {order.eta && <span>预计送达：{order.eta.replace('T', ' ').slice(0, 16)}</span>}
                  {order.riderPhone && <span>骑手：{order.riderPhone}</span>}
                  {order.status === 0 && (
                    <div className="flex gap-2 ml-2">
                      <Button
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          router.push(`/client/order/pay?orderId=${order.orderId}`);
                        }}
                      >
                        去付款
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={e => {
                          e.stopPropagation();
                          openCancelModal(order.orderId);
                        }}
                      >
                        取消订单
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 已完成订单 */}
        <TabsContent value="completed">
          {loading && <Skeleton className="h-28 w-full mb-2" />}
          {!loading && completedOrders.length === 0 && (
            <div className="text-gray-400 text-center py-12">暂无已完成订单</div>
          )}
          {completedOrders.map(order => (
            <Card
              key={order.orderId}
              className="mb-3 hover:shadow-lg transition cursor-pointer"
              onClick={() => router.push(`/client/order/${order.orderId}`)}
            >
              <CardContent className="py-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">{order.merchantName}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">{orderStatusText(order.status)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">菜品：{order.items}</div>
                <div className="flex text-sm justify-between text-gray-500">
                  <div>
                    <span>金额：</span>
                    <span className="text-red-600 font-bold">${order.amount}</span>
                  </div>
                  {order.paidAt && <span>支付：{order.paidAt.replace('T', ' ').slice(0, 16)}</span>}
                  {order.riderPhone && <span>骑手：{order.riderPhone}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMoreCompleted && completedOrders.length > 0 && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (completedOrders.length > 0) {
                    const last = completedOrders[completedOrders.length - 1];
                    fetchPagedOrders('completed', last.createTime, last.orderId, true); // 建议加 orderId 支持更稳
                  }
                }}
                disabled={loadingMore || completedOrders.length === 0}
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 已取消订单 */}
        <TabsContent value="cancelled">
          {loading && <Skeleton className="h-28 w-full mb-2" />}
          {!loading && cancelledOrders.length === 0 && (
            <div className="text-gray-400 text-center py-12">暂无已取消订单</div>
          )}
          {cancelledOrders.map(order => (
            <Card
              key={order.orderId}
              className="mb-3 hover:shadow-lg transition cursor-pointer"
              onClick={() => router.push(`/client/order/${order.orderId}`)}
            >
              <CardContent className="py-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">{order.merchantName}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">{orderStatusText(order.status)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">菜品：{order.items}</div>
                <div className="flex text-sm justify-between text-gray-500">
                  <div>
                    <span>金额：</span>
                    <span className="text-red-600 font-bold">${order.amount}</span>
                  </div>
                  {order.paidAt && <span>支付：{order.paidAt.replace('T', ' ').slice(0, 16)}</span>}
                  {order.riderPhone && <span>骑手：{order.riderPhone}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMoreCancelled && cancelledOrders.length > 0 && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (cancelledOrders.length > 0) {
                    const last = cancelledOrders[cancelledOrders.length - 1];
                    fetchPagedOrders('cancelled', last.createTime, last.orderId, true); // 建议加 orderId 支持更稳
                  }
                }}
                disabled={loadingMore || cancelledOrders.length === 0}
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <RejectReasonModal
        open={cancelModalOpen}
        message="请输入取消订单理由"
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        onCancel={closeCancelModal}
      />
    </div>
  );
}
