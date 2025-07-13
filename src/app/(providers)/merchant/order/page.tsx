"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import apiClient from "@/services/apiClient";
import toast from "react-hot-toast";
import { RejectReasonModal } from "@/components/RejectReasonModal";

interface Order {
  orderId: number;
  items: string;
  paidAt: string;              // 支付/下单时间
  amount: number;               // 实收金额
  remark?: string;
  status: number;
  eta: string;                 // 预计送达时间
  attemptedAt?: string;         // 骑手接单时间
  riderAssignmentId?: number;   // 骑手派单码
  riderPhone?: string;
  clientPhone: string;         // 下单人手机号
  payStatus: number;
}

// Tab 定义
const TABS = [
  ["paid", "待接单", [1] as const],
  ["preparing", "备餐中", [2, 3] as const],
  ["ready", "待取餐", [4] as const],
  ["dispatching", "配送中", [5] as const],
  ["completed", "已完成", [6] as const],
  ["cancelled", "已取消", [7] as const],
] as const;

type TabKey = typeof TABS[number][0];

function payStatusText(status: number) {
  switch (status) {
    case 0: return "未付款";
    case 1: return "已付款";
    case 2: return "已退款";
    default: return "未知";
  }
}

// 计时器：计算剩余确认时间
function formatRemaining(paidAtIso: string): string {
  if (!paidAtIso) return "—";
  const paidAt = new Date(paidAtIso).getTime();
  const deadline = paidAt + 5 * 60 * 1000000;
  const diff = deadline - Date.now();
  if (diff <= 0) return "已超时";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MerchantOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  // 打开模态框时重置reason
  const openRejectModal = (orderId: number) => {
    setCurrentOrderId(orderId);
    setReason("");
    setModalOpen(true);
  };

  // 用来触发倒计时重绘
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 当前 tab key
  const [filter, setFilter] = useState<TabKey>("paid");
  const [orders, setOrders] = useState<Order[]>([]);

  // 拉多状态
  const fetchOrders = async (codes: number[]) => {
    try {
      const reqs = codes.map((c) =>
        apiClient.get<{ data: Order[] }>("/merchant/orders", { params: { status: c } })
      );
      const res = await Promise.all(reqs);
      setOrders(res.flatMap((r) => r.data.data));
    } catch (e: any) {
      toast.error(e.response?.data?.msg ?? e.message);
    }
  };

  const handleFilter = (key: TabKey, codes: readonly number[]) => {
    setFilter(key);
    sessionStorage.setItem("orderCurrentTab", key);    
    fetchOrders([...codes]);
  };

  // 操作
  const handleAccept = async (id: number) => {
    const res = await apiClient.post(`/merchant/orders/${id}/accept`);
    toast.success(res.data.msg);
    const codes = TABS.find(t => t[0] === filter)![2];
    fetchOrders([...codes]);
  };

  // 模态框确认处理函数（这里去掉id，直接使用currentOrderId）
  const handleRejectConfirm  = async () => {
    if (!currentOrderId || !reason.trim()) {
      toast.error("请输入拒单理由");
      return;
    }
    try{
      const res = await apiClient.post(`/merchant/orders/${currentOrderId}/reject`, { reason });
      toast.success(res.data.msg);
      const codes = TABS.find(t => t[0] === filter)![2];
      fetchOrders([...codes]);
    } catch (e: any) {
      toast.error(e.response?.data?.msg ?? e.message);
    } finally {
      setModalOpen(false);
      setCurrentOrderId(null);
      setReason("");
    }  
  };
  const handleRejectCancel = () => {
    setModalOpen(false);
    setCurrentOrderId(null);
    setReason("");
  };

  const handleReady = async (id: number) => {
    const res = await apiClient.post(`/merchant/orders/${id}/ready`);
    toast.success(res.data.msg);
    const codes = TABS.find(t => t[0] === filter)![2];
    fetchOrders([...codes]);
  };
  const handleView = (id: number) => router.push(`/merchant/order/${id}`);

  const handleRefund = async (orderId: number) => {
    try {
      // 这里假设你有后端接口：/merchant/order/{orderId}/refund
      await apiClient.post(`/merchant/orders/${orderId}/refund`);
      toast.success('退款申请已提交！');
      // 操作成功后刷新订单列表
      const tab = TABS.find(t => t[0] === filter) ?? TABS[0];
      fetchOrders([...tab[2]]);
    } catch (e: any) {
      toast.error(e?.response?.data?.msg || '退款失败');
    }
  };  

  // 首次加载拉「待接单」
  // 从sessionStorage恢复状态
  useEffect(() => {
    const savedTab = sessionStorage.getItem("orderCurrentTab") as TabKey | null;
    const initialTab = savedTab ?? "paid";
    setFilter(initialTab);
  }, []);
  
  useEffect(() => {
    const tab = TABS.find(t => t[0] === filter) ?? TABS[0];
    fetchOrders([...tab[2]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // 根据 filter 渲染不同表格
  const renderTable = () => {
    switch (filter) {
      case "paid":
        return (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">订单号</th>
                <th className="px-4 py-2 border">订单菜品</th>
                <th className="px-4 py-2 border">剩余确认时间</th>
                <th className="px-4 py-2 border">实收金额</th>
                <th className="px-4 py-2 border">备注</th>
                <th className="px-4 py-2 border">下单人手机号</th>
                <th className="px-4 py-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-center">{formatRemaining(o.paidAt)}</td>
                  <td className="px-4 py-2 border text-center">$ {o.amount}</td>
                  <td className="px-4 py-2 border text-center">{o.remark || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.clientPhone}</td>
                  <td className="px-4 py-2 border text-center space-x-2 text-sm">
                    <button onClick={() => handleAccept(o.orderId)} className="text-green-600 hover:underline">接单</button>
                    <button onClick={() => openRejectModal(o.orderId)} className="text-red-600 hover:underline">拒单</button>
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "preparing":
        return (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">订单号</th>
                <th className="px-4 py-2 border">订单菜品</th>
                <th className="px-4 py-2 border">预计送达时间</th>
                <th className="px-4 py-2 border">下单人手机号</th>
                <th className="px-4 py-2 border">备注</th>
                <th className="px-4 py-2 border">订单状态</th>
                <th className="px-4 py-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-center">{o.eta}</td>
                  <td className="px-4 py-2 border text-center">{o.clientPhone || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.remark || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.status === 2 ? "准备中" : "已就绪"}</td>
                  <td className="px-4 py-2 border text-sm space-x-2 text-center">
                    {o.status === 2 ? (
                      <button
                        onClick={() => handleReady(o.orderId)}
                        className="text-green-600 hover:underline"
                      >
                        通知骑手接单
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-gray-400 bg-gray-100 cursor-not-allowed"
                        style={{ pointerEvents: "none" }}
                      >
                        等待骑手接单
                      </button>
                    )}
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "ready":
        return (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">订单号</th>
                <th className="px-4 py-2 border">订单菜品</th>
                <th className="px-4 py-2 border">预计送达时间</th>
                <th className="px-4 py-2 border">骑手接单时间</th>
                <th className="px-4 py-2 border">骑手派单ID码</th>
                <th className="px-4 py-2 border">骑手联系电话</th>
                <th className="px-4 py-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-center">{o.eta}</td>
                  <td className="px-4 py-2 border text-center">{o.attemptedAt || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.riderAssignmentId || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.riderPhone || "—"}</td>
                  <td className="px-4 py-2 border text-center text-sm">
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "cancelled":
        return (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">订单号</th>
                <th className="px-4 py-2 border">订单菜品</th>
                <th className="px-4 py-2 border">下单人手机号</th>
                <th className="px-4 py-2 border">付款时间</th>
                <th className="px-4 py-2 border">订单金额</th>
                <th className="px-4 py-2 border">付款状态</th>
                <th className="px-4 py-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-center">{o.clientPhone || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.paidAt}</td>
                  <td className="px-4 py-2 border text-center">$ {o.amount}</td>
                  <td className="px-4 py-2 border text-center">{payStatusText(o.payStatus)}</td>
                  <td className="px-4 py-2 border text-center text-sm">
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">查看</button>
                    <button
                      onClick={() => handleRefund(o.orderId)}
                      className={
                        o.payStatus === 1
                          ? "ml-2 text-red-600 hover:underline"
                          : "ml-2 text-gray-400 cursor-not-allowed"
                      }
                      disabled={o.payStatus !== 1}
                      style={o.payStatus !== 1 ? { pointerEvents: "none" } : undefined}
                    >
                      退款
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );  
      default:
        // dispatching / completed
        return (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">订单号</th>
                <th className="px-4 py-2 border">订单菜品</th>
                <th className="px-4 py-2 border">下单人手机号</th>
                <th className="px-4 py-2 border">骑手联系电话</th>
                <th className="px-4 py-2 border">付款时间</th>
                <th className="px-4 py-2 border">实收金额</th>
                <th className="px-4 py-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-center">{o.clientPhone || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.riderPhone || "—"}</td>
                  <td className="px-4 py-2 border text-center">{o.paidAt}</td>
                  <td className="px-4 py-2 border text-center">$ {o.amount}</td>
                  <td className="px-4 py-2 border text-center text-sm">
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="inline-flex bg-gray-200 rounded-full p-1 mb-4">
        {TABS.map(([key, label, codes]) => (
          <button
            key={key}
            onClick={() => handleFilter(key, codes)}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              filter === key
                ? "bg-white text-blue-600 font-semibold shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 表格 */}
      {renderTable()}
      {/* 模态框 */}
      <RejectReasonModal
        open={modalOpen}
        message="请输入拒单理由"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={handleRejectConfirm}
        onCancel={handleRejectCancel}
      />
    </div>
  );
}
