"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/services/apiClient";
import toast from "react-hot-toast";
import { RejectReasonModal } from "@/components/RejectReasonModal";
import { useAppSelector } from "@/store/hooks";

interface Order {
  orderId: number;
  clientPhone: string;
  items: string;
  paidAt: string;
  amount: number;
  remark?: string;
  status: number;
  eta: string;
  attemptedAt?: string;
  riderAssignmentId?: number;
  riderPhone?: string;
}

export default function MerchantDashboard() {
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  // 用 ref 记录哪些 orderId 已经自动触发过，避免重复请求
  const autoRejectedIds = useRef<Set<number>>(new Set());

  const lastMessage = useAppSelector(state => state.merchantWebSocket.lastMessage);

  useEffect(() => {
    if (!lastMessage) return;
    if ('type' in lastMessage && lastMessage.type === "NEW_ORDER") {
      toast.success("有新订单！");
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("You have a new order, please handle it!"));
      fetchDashboardData();
      fetchOrders(tabStatusMap[filter]);
    }
  }, [lastMessage]);

  // 打开模态框时重置reason
  const openRejectModal = (orderId: number) => {
    setCurrentOrderId(orderId);
    setReason("");
    setModalOpen(true);
  };

  // 当日日期
  const [today, setToday] = useState("");
  useEffect(() => {
    const d = new Date();
    setToday(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`);
  }, []);

  // KPI & Overview 数据
  const [kpi, setKpi] = useState({
    revenue: 0,
    validOrders: 0,
    completionRate: 0,
    avgPrice: 0,
    newUsers: 0,
  });
  const [stats, setStats] = useState({
    paidCount: 0,
    preparingCount: 0,
    readyToGoCount: 0,
    pickingUpCount: 0,
    dispatchingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalCount: 0,
    categoryActive: 0,
    dishActive: 0,
    categoryInactive: 0,
    dishInactive: 0,
  });

  // 计时器 （渲染倒计时--给客户端看的）
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
  // 自动拒单逻辑计时器
  function isOrderTimeout(paidAtIso: string) {
    if (!paidAtIso) return false;
    const paidAt = new Date(paidAtIso).getTime();
    const deadline = paidAt + 5 * 60 * 1000000;
    return Date.now() > deadline;
  }
  
  // 用来触发倒计时重绘
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 并行拉取订单与分类统计
  const fetchOrderMetrics = async () => {
    try {
      const res = await apiClient.get<{
        data: {
          revenue: number;
          validOrders: number;
          completionRate: number;
          avgPrice: number;
          newUsers: number;
          paidCount: number;
          preparingCount: number;
          readyToGoCount: number;
          pickingUpCount: number;
          dispatchingCount: number;
          completedCount: number;
          cancelledCount: number;
          totalCount: number;
        }
      }>("/merchant/dashboard/orders");
      const d = res.data.data; // 如果你有包了一层 Result，可能要拿 res.data.data
      setKpi({
        revenue: d.revenue,
        validOrders: d.validOrders,
        completionRate: d.completionRate,
        avgPrice: d.avgPrice,
        newUsers: d.newUsers,
      });
      setStats(prev => ({
        ...prev,
        paidCount: d.paidCount,
        preparingCount: d.preparingCount,
        readyToGoCount: d.readyToGoCount,
        pickingUpCount: d.pickingUpCount,
        dispatchingCount: d.dispatchingCount,
        completedCount: d.completedCount,
        cancelledCount: d.cancelledCount,
        totalCount: d.totalCount,
      }));
    } catch (e: any) {
      toast.error("加载订单数据失败：" + (e.response?.data?.msg ?? e.message));
    }
  };
  
  const fetchCategoryMetrics = async () => {
    try {
      const res = await apiClient.get<{
        data: {
          categoryTotal: number, 
          categoryActive: number, 
          dishTotal: number, 
          dishActive: number
        }
      }>("/merchant/dashboard/categories");
      const d = res.data.data;
      const categoryInactive = d.categoryTotal - d.categoryActive;
      const dishInactive     = d.dishTotal - d.dishActive;
      setStats(prev => ({
        ...prev,
        categoryActive: d.categoryActive,
        dishActive: d.dishActive,
        categoryInactive: categoryInactive,
        dishInactive: dishInactive,
      }));
    } catch (e: any) {
      toast.error("加载分类/菜品统计失败：" + (e.response?.data?.msg ?? e.message));
    }
  };
  
  // 汇总调用函数
  const fetchDashboardData = () => {
    fetchOrderMetrics();
    fetchCategoryMetrics();
  };

  // 进行中订单
  const [filter, setFilter] = useState<"paid" | "preparing" | "pickingUp">("paid");
  const [orders, setOrders] = useState<Order[]>([]);

  // 切换状态
  // 用fetchOrders接收一个数字数组
  const fetchOrders = async (statusCodes: number[]) => {
    try {
      // 并行请求所有状态
      const requests = statusCodes.map(code =>
        apiClient.get<{ data: Order[] }>("/merchant/orders", {
          params: { status: code },
        })
      );
      const responses = await Promise.all(requests); // 多个 Promise 并发
      // 合并所有接口返回的 orders
      const merged = responses.flatMap(r => r.data.data);
      setOrders(merged);
    } catch (e: any) {
      toast.error(e.response?.data?.msg ?? e.message);
    }
  };

  // 1. 定义 TabType 和映射表
  type TabType = "paid" | "preparing" | "pickingUp";

  const tabStatusMap: Record<TabType, number[]> = {
    paid: [1],
    preparing: [2, 3],
    pickingUp: [4],
  };

  // 2. handleFilter：统一走映射表
  const handleFilter = (type: TabType) => {
    setFilter(type);
    sessionStorage.setItem("dashboardCurrentTab", type);

    // 直接取映射表
    const codes = tabStatusMap[type];
    fetchOrders(codes);
  };

  // 接单 / 拒单
  const handleAccept = async (id: number) => {
    try {
      const res = await apiClient.post(`/merchant/orders/${id}/accept`);
      toast.success(res.data.msg);
      fetchOrderMetrics();
      handleFilter("paid");
    } catch (e: any) {
      toast.error(e.response?.data?.msg ?? e.message);
    }
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
      fetchOrderMetrics();
      handleFilter("paid");
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
  // 自动拒单逻辑
  useEffect(() => {
    orders.forEach((order) => {
      if (
        order.status === 1 && // 只针对“待接单”
        !autoRejectedIds.current.has(order.orderId) &&
        isOrderTimeout(order.paidAt)
      ) {
        autoRejectedIds.current.add(order.orderId); // 标记已处理
        // 发起自动拒单请求
        apiClient
          .post(`/merchant/orders/${order.orderId}/reject`, {
            reason: "商家未响应",
          })
          .then((res) => {
            toast.error(`订单${order.orderId}已自动拒单：商家未响应`);
            // 可选：刷新订单列表
            fetchOrders([1]);
          })
          .catch((e) => {
            toast.error(
              `订单${order.orderId}自动拒单失败: ${
                e.response?.data?.msg ?? e.message
              }`
            );
          });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, now]); // 只要 orders 或 now 更新就检查

  const handleReady = async (id: number) => { 
    try {
      const res = await apiClient.post(`/merchant/orders/${id}/ready`);
      toast.success(res.data.msg);
      fetchOrderMetrics();
      handleFilter("preparing");
    } catch (e: any) {
      toast.error(e.response?.data?.msg ?? e.message);
    }
  };

  // 查看订单详情
  const handleView = (id: number) => {
    router.push(`/merchant/order/${id}`);
  };

  // 3. 首次加载：fetchDashboardData + 从 sessionStorage 读取并校验
  useEffect(() => {
    // 拉取其它面板数据
    fetchDashboardData();

    // 读出来可能是 null / 也可能是乱写的字符串
    const saved = sessionStorage.getItem("dashboardCurrentTab");
    const allTabs: TabType[] = Object.keys(tabStatusMap) as TabType[];

    // 校验一下，只有在白名单里的才用，否则回退到 paid
    const initialTab: TabType = (saved && allTabs.includes(saved as TabType))
      ? (saved as TabType)
      : "paid";

    handleFilter(initialTab);
  }, []);

  return (
    <>
      {/* 日期行：无背景 */}
      <div className="mb-2 px-2">
        <h3 className="text-lg font-semibold">今日数据 {today}</h3>
      </div>

      {/* ====== KPI 容器 ====== */}
      <div className="bg-white shadow rounded mb-2">
        <div className="flex justify-between items-center px-6 py-2">
          <h3 className="text-lg font-semibold">KPI总览 </h3>
          <Link href="/merchant/statistics" className="text-blue-600 hover:underline">
            详细数据 &gt;
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-4 px-6 py-2 bg-white">
          <KpiCard title="营业额" value={`$ ${kpi.revenue}`} />
          <KpiCard title="有效订单" value={kpi.validOrders} />
          <KpiCard title="订单完成率" value={`${kpi.completionRate}%`} />
          <KpiCard title="平均客单价" value={`$ ${kpi.avgPrice}`} />
          <KpiCard title="新增用户" value={kpi.newUsers} />
        </div>
      </div>

      {/* ====== 管理概览 ====== */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* 订单管理 */}
        <div className="bg-white shadow rounded p-6 min-h-[250px] flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">订单管理</h3>
            <Link href="/merchant/order" className="text-blue-600 hover:underline">
              查看订单明细 &gt;
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <OrderStatusCard label="待接单" count={stats.paidCount} />
            <OrderStatusCard label="待取餐" count={stats.pickingUpCount} />
            <OrderStatusCard label="派送中" count={stats.dispatchingCount} />
            <OrderStatusCard label="已完成" count={stats.completedCount} />
            <OrderStatusCard label="已取消" count={stats.cancelledCount} />
            <OrderStatusCard label="全部订单" count={stats.totalCount} />
          </div>
        </div>

        {/* 分类 & 菜品总览 */}
        <div className="bg-white shadow rounded p-6 min-h-[250px] flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">分类总览</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <OverviewCard label="已启售" count={stats.categoryActive} />
            <OverviewCard label="已停售" count={stats.categoryInactive} />
            <Link href="/merchant/category">
              <OverviewCard label="查看分类管理" />
            </Link>
          </div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">菜品总览</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <OverviewCard label="已启售" count={stats.dishActive} />
            <OverviewCard label="已停售" count={stats.dishInactive} />
            <Link href="/merchant/dish">
              <OverviewCard label="查看菜品管理" />
            </Link>
          </div>
        </div>
      </div>

      {/* ====== 进行中订单 ====== */}
      <div className="bg-white shadow rounded p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">进行中的订单</h3>
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => handleFilter("paid")}
              className={`px-4 py-2 rounded ${
                filter === "paid" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              待接单 ({stats.paidCount})
            </button>
            <button
              onClick={() => handleFilter("preparing")}
              className={`px-4 py-2 rounded ${
                filter === "preparing" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              备餐中 ({stats.preparingCount + stats.readyToGoCount})
            </button>
            <button
              onClick={() => handleFilter("pickingUp")}
              className={`px-4 py-2 rounded ${
                filter === "pickingUp" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              待取餐 ({stats.pickingUpCount})
            </button>
          </div>
        </div>

        {filter === "paid" ? (
          // 状态=1：待接单
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
              {orders.map(o => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-sm text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-sm text-center">{formatRemaining(o.paidAt)}</td>
                  <td className="px-4 py-2 border text-sm text-center">$ {o.amount}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.remark || "—"}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.clientPhone}</td>
                  <td className="px-4 py-2 border text-sm text-center space-x-2">
                    <button onClick={() => handleAccept(o.orderId)} className="text-green-600 hover:underline">接单</button>
                    <button onClick={() => openRejectModal(o.orderId)} className="text-red-600 hover:underline">拒单</button>
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filter === "preparing" ? (
          // 状态=2&3：备餐中
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
              {orders.map(o => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-sm text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.eta}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.clientPhone}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.remark || "—"}</td>
                  <td className="px-4 py-2 border text-sm text-center">
                    {o.status === 2 ? "准备中" : "已就绪"}
                  </td>
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
        ) : (
          // 状态=4：待取餐
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">订单号</th>
                <th className="px-4 py-2 border">订单菜品</th>
                <th className="px-4 py-2 border">预计送达时间</th>
                <th className="px-4 py-2 border">骑手接单时间</th>
                <th className="px-4 py-2 border">派单ID</th>
                <th className="px-4 py-2 border">骑手联系电话</th>
                <th className="px-4 py-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-sm text-center">{o.orderId}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.items}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.eta}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.attemptedAt || "—"}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.riderAssignmentId || "—"}</td>
                  <td className="px-4 py-2 border text-sm text-center">{o.riderPhone || "—"}</td>
                  <td className="px-4 py-2 border text-sm text-center">
                    <button onClick={() => handleView(o.orderId)} className="text-blue-600 hover:underline">查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* 模态框 */}
      <RejectReasonModal
        open={modalOpen}
        message="请输入拒单理由"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={handleRejectConfirm}
        onCancel={handleRejectCancel}
      />
    </>
  );
}

// KPI 卡片
function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-yellow-50 shadow rounded p-6 text-center">
      <p className="text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// 订单状态统计卡片
function OrderStatusCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-yellow-50 shadow rounded p-6 text-center">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-semibold">{count}</p>
    </div>
  );
}

// 分类 & 菜品 overview 卡片
function OverviewCard({
  label,
  count,
  href,
}: {
  label: string;
  count?: number;
  href?: string;
}) {
  const card = (
    <div className="h-20 flex flex-col items-center justify-center rounded p-4 bg-yellow-50 shadow text-center cursor-pointer">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {count !== undefined && <p className="text-xl font-semibold">{count}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}