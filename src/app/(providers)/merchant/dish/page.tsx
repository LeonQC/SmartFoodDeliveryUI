"use client";

import React, { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import apiClient from "@/services/apiClient";
import {
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";

// API 返回的菜品类型
interface Dish {
  dishId: number;
  categoryVO: { categoryId: number; name: string };
  name: string;
  price: number;
  status: number; // 1=启用，0=停用
  image?: string;
  description?: string;
}

// 分类类型
interface Category {
  categoryId: number;
  name: string;
  status: number;
}

// 分页结果，total 为总记录数
interface PageResult<T> {
  total: number; // 总记录数
  rows: T[];
}

export default function DishPage() {

  // 列表数据 & 状态
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 查询条件
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<number | "">("");

  // 分页
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);

  // 删除 & 批量删除 确认
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 新增
  const [newOpen, setNewOpen] = useState(false);
  const [newLoading, setNewLoading] = useState(false);
  const [newForm, setNewForm] = useState({ categoryId: 0, name: "", price: "", description: "", imageUrl: "", uploading: false, uploadError: "" });
  const [newPreview, setNewPreview] = useState("");

  // 编辑
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ dishId: 0, categoryId: 0, name: "", price: "", description: "", imageUrl: "", uploading: false, uploadError: "" });
  const [editPreview, setEditPreview] = useState("");

  useEffect(() => {
    // 下拉分类列表
    apiClient.get("/merchant/categories").then(res => {
      const list = (res.data.data as Category[]);
      setCategories(list);
      if (list.length > 0) {
        setNewForm(f => ({ ...f, categoryId: list[0].categoryId }));
      }
    });
    fetchDishes();
  }, [page]);

  // 拉菜品列表 (改为 POST 请求，匹配 @PostMapping)
  const fetchDishes = async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = {
        page,
        pageSize,
        name: nameFilter || undefined,
        categoryId: categoryFilter === "" ? undefined : categoryFilter,
        status: statusFilter === "" ? undefined : statusFilter,
      };
      // 使用 POST 调用后端 @PostMapping
      const res = await apiClient.post(
        "/merchant/dishes/search",
        dto
      );
      const data: PageResult<Dish> = res.data.data;
      setDishes(data.rows);
      // 根据总记录数计算总页数
      const pages = Math.ceil(data.total / pageSize) || 1;
      setTotalPages(pages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchDishes();
  };

  // 单条删除
  const handleDelete = async () => {
    if (confirmingId == null) return;
    try {
      await apiClient.delete("/merchant/dishes", {
        params: { dishIds: [confirmingId] },
      });
      toast.success("删除成功");
      setSelectedIds((ids) => ids.filter((id) => id !== confirmingId));
      fetchDishes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmingId(null);
    }
  };

  // 批量删除
  const handleBulkDelete = async () => {
    try {
      await apiClient.delete("/merchant/dishes", {
        params: { dishIds: selectedIds },
      });
      toast.success("批量删除成功");
      setSelectedIds([]);
      fetchDishes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmingBulk(false);
    }
  };

  // 切换状态
  const toggleStatus = async (dish: Dish) => {
    try {
      const newStatus = dish.status === 1 ? 0 : 1;
      await apiClient.put(
        `/merchant/dishes/${dish.dishId}/status/${newStatus}`
      );
      toast.success(
        newStatus === 1 ? "启用成功" : "停用成功"
      );
      fetchDishes();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // 复选框
  const onCheck = (id: number, checked: boolean) => {
    setSelectedIds((ids) =>
      checked ? [...ids, id] : ids.filter((x) => x !== id)
    );
  };

  // 公用的文件上传＋预览逻辑
  const handleDishImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isNew: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 本地预览
    const localUrl = URL.createObjectURL(file);
    if (isNew) {
      setNewPreview(localUrl);
      setNewForm(f => ({ ...f, uploading: true, uploadError: "" }));
    } else {
      setEditPreview(localUrl);
      setEditForm(f => ({ ...f, uploading: true, uploadError: "" }));
    }

    // 2. 异步上传
    try {
      const fd = new FormData();
      fd.append("file", file);
      // 这里假设返回结构 res.data.data.url
      const res = await apiClient.post(
        "/images/upload",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const key = res.data.data.url || "";

      if (isNew) {
        setNewForm(f => ({ ...f, imageUrl: key, uploading: false }));
      } else {
        setEditForm(f => ({ ...f, imageUrl: key, uploading: false }));
      }
    } catch {
      if (isNew) {
        setNewForm(f => ({ ...f, uploadError: "上传失败", uploading: false }));
      } else {
        setEditForm(f => ({ ...f, uploadError: "上传失败", uploading: false }));
      }
    }
  }
  // 新建菜品 handlers
  const openNew = () => setNewOpen(true);
  const closeNew = () => {
    setNewOpen(false);
    setNewForm({ categoryId: newForm.categoryId, name: "", price: "", description: "", imageUrl: "", uploading: false, uploadError: "" });
    setNewPreview("");
  };
  const handleNewImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDishImageChange(e, true);
  };
  const submitNew = async () => {
    if (!newForm.name.trim() || !newForm.price || !newForm.categoryId) {
      toast.error('分类、名称和价格为必填项'); return;
    }
    setNewLoading(true);
    try {
      await apiClient.post('/merchant/dishes', { categoryId: newForm.categoryId, name: newForm.name.trim(), price: parseFloat(newForm.price), description: newForm.description.trim() || undefined, image: newForm.imageUrl || undefined });
      toast.success('新增成功'); closeNew(); fetchDishes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setNewLoading(false);
    }
  };

  // 编辑菜品 handlers
  const openEdit = (d: Dish) => {
    setEditForm({ dishId: d.dishId, categoryId: d.categoryVO.categoryId, name: d.name, price: d.price.toString(), description: d.description || '', imageUrl: d.image || '', uploading: false, uploadError: '' });
    setEditPreview(d.image || '');
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditPreview('');
  };
  const handleEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDishImageChange(e, false);
  };
  const submitEdit = async () => {
    if (!editForm.name.trim() || !editForm.price || !editForm.categoryId) {
      toast.error('分类、名称和价格为必填项'); return;
    }
    setEditLoading(true);
    try {
      await apiClient.put(`/merchant/dishes/${editForm.dishId}`, { categoryId: editForm.categoryId, name: editForm.name.trim(), price: parseFloat(editForm.price), description: editForm.description.trim() || undefined, image: editForm.imageUrl || undefined });
      toast.success('更新成功'); closeEdit(); fetchDishes();
    } catch (e: any) { toast.error(e.message); }
    finally { setEditLoading(false); }
  };

  return (
    <>
      <div className="space-y-4">
        {/* 顶部：查询 + 新增 + 批量删除 */}
        <div className="flex items-center bg-white shadow rounded p-4 space-x-4">
          {/* 查询条件 */}
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder="按名称搜索"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="p-2 border rounded w-40"
            />
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value === "" ? "" : +e.target.value
                )
              }
              className="p-2 border rounded"
            >
              <option value="">全部分类</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                  {c.status === 0 ? " (disabled)" : ""}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "" ? "" : +e.target.value
                )
              }
              className="p-2 border rounded"
            >
              <option value="">全部状态</option>
              <option value={1}>启用</option>
              <option value={0}>停用</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              查询
            </button>
          </div>
          {/* 新增 & 批量删除 */}
          <div className="flex space-x-2">
            <button
              onClick={openNew} 
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Plus size={16} className="mr-2" /> 新增菜品
            </button>
            <button
              onClick={() => setConfirmingBulk(true)}
              disabled={selectedIds.length === 0}
              className={`px-4 py-2 rounded ${
                selectedIds.length > 0
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              批量删除 ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* 列表表格 */}
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="min-w-full table-fixed">
            <colgroup>
              {["w-1/12", "w-1/12", "w-1/12", "w-1/12", "w-5/12", "w-1/12", "w-2/12"].map(
                (cls, idx) => (
                  <col key={idx} className={cls} />
                )
              )}
            </colgroup>
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">选择</th>
                <th className="px-4 py-2 text-left">图片</th>
                <th className="px-4 py-2 text-left">名称 / 分类</th>
                <th className="px-4 py-2 text-left">价格</th>
                <th className="px-4 py-2 text-left">描述</th>
                <th className="px-4 py-2 text-center">状态</th>
                <th className="px-4 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    加载中...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : dishes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    暂无菜品
                  </td>
                </tr>
              ) : (
                dishes.map((d) => (
                  <tr key={d.dishId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.dishId)}
                        onChange={(e) => onCheck(d.dishId, e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      {d.image ? (
                        <img
                          src={`/api/images?key=${encodeURIComponent(d.image)}`}
                          alt={d.name}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 flex items-center justify-center text-gray-400">
                          无图
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div>{d.name}</div>
                      <div className="text-sm text-gray-500">
                        {d.categoryVO.name}
                      </div>
                    </td>
                    <td className="px-4 py-2">$ {d.price}</td>
                    <td className="px-4 py-2">{d.description}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => toggleStatus(d)}>
                        {d.status === 1 ? (
                          <ToggleRight size={20} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={20} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline flex items-center">
                          <Edit2 size={16} className="mr-1" /> 编辑
                        </button>
                        <button
                          onClick={() => setConfirmingId(d.dishId)}
                          className="text-red-600 hover:underline flex items-center"
                        >
                          <Trash2 size={16} className="mr-1" /> 删除
                        </button>
                      </div>  
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex justify-end items-center space-x-2">
          <button
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded"
          >
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded"
          >
            下一页
          </button>
        </div>

        {/* 单条删除确认 */}
        <ConfirmModal
          open={confirmingId !== null}
          message="确认要删除这个菜品吗？此操作不可撤销。"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingId(null)}
        />
        {/* 批量删除确认 */}
        <ConfirmModal
          open={confirmingBulk}
          message={`确认要删除所选的 ${selectedIds.length} 个菜品吗？此操作不可撤销。`}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmingBulk(false)}
        />
      </div>

      {/* 新增弹窗 */}
      {newOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">新增菜品</h3>
              <button onClick={closeNew}><X size={20} /></button>
            </div>

            {/* 表单网格布局 */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-4">
              {/* 图片预览框，占第1列第1行和第2行 */}
              <div className="row-span-2 col-span-1">
                <div
                  className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer"
                  onClick={() => document.getElementById("dishImageInput")?.click()}
                >
                  {newForm.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      Uploading…
                    </div>
                  ) : newPreview ? (
                    <img
                      src={newPreview}
                      alt="本地预览"
                      className="w-full h-full object-cover"
                    />
                  ) : newForm.imageUrl ? (
                    <img
                      src={`/api/images?key=${encodeURIComponent(newForm.imageUrl)}`}
                      alt="已上传"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Plus size={24} className="text-gray-400 m-auto" />
                  )}
                </div>
                {/* 上传失败提示，位于预览框正下方 */}
                {newForm.uploadError && (
                  <p className="mt-2 text-sm text-red-500 text-center">{newForm.uploadError}</p>
                )}
              </div>

              {/* 分类：第1行第2列 */}
              <div className="col-span-2 row-span-1">
                <label className="block text-sm font-medium mb-1">
                  分类 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newForm.categoryId}
                  onChange={e => setNewForm(prev => ({ ...prev, categoryId: +e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId} disabled={c.status === 0}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 价格：第2行第2列 */}
              <div className="col-span-2 row-span-1">
                <label className="block text-sm font-medium mb-1">
                  价格 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newForm.price}
                  onChange={e => setNewForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* 名称：第3行跨3列 */}
              <div className="col-span-3 mt-5">
                <label className="block text-sm font-medium mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={e => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* 描述：第4行跨3列 */}
              <div className="col-span-3">
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={newForm.description}
                  onChange={e => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded h-24"
                />
              </div>
            </div>

            {/* 隐藏文件输入 */}
            <input
              id="dishImageInput"
              type="file"
              accept="image/*"
              onChange={handleNewImage}
              className="hidden"
            />

            {/* 操作按钮，第5行跨3列，居中 */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={submitNew}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={newLoading}
              >
                <Save size={16} className="mr-2" />
                {newLoading ? "提交中..." : "提交"}
              </button>
              <button
                onClick={closeNew}
                className="px-4 py-2 border rounded"
                disabled={newLoading}
              >取消</button>
            </div>
          </div>
        </div>
      )}
      {/* 编辑弹窗 */}
      {editOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-lg">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑菜品</h3>
              <button onClick={closeEdit}><X size={20}/></button>
            </div>
            {/* 表单网格 */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-4">
              <div className="row-span-2 col-span-1">
                <div
                  className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer"
                  onClick={() => document.getElementById("editImageInput")?.click()}
                >
                  {editForm.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      Uploading…
                    </div>
                  ) : editPreview ? (
                    <img
                      src={editPreview}
                      alt="本地预览"
                      className="w-full h-full object-cover"
                    />
                  ) : editForm.imageUrl ? (
                    <img
                      src={`/api/images?key=${encodeURIComponent(editForm.imageUrl)}`}
                      alt="已上传"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Plus size={24} className="text-gray-400 m-auto" />
                  )}
                </div>
                {editForm.uploadError && (
                  <p className="mt-2 text-sm text-red-500 text-center">
                    {editForm.uploadError}
                  </p>
                )}
              </div>
              {/* 分类、价格、名称、描述等表单项 */}  
              <div className="col-span-2 row-span-1">
                <label className="block text-sm font-medium mb-1">分类 <span className="text-red-500">*</span></label>
                <select
                  value={editForm.categoryId}
                  onChange={e => setEditForm(prev => ({ ...prev, categoryId: +e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId} disabled={c.status === 0}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 row-span-1">
                <label className="block text-sm font-medium mb-1">价格 <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="col-span-3 mt-4">
                <label className="block text-sm font-medium mb-1">名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="col-span-3 mb-4">
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded h-24"
                />
              </div>  
            </div>
            <input
              id="editImageInput"
              type="file"
              accept="image/*"
              onChange={handleEditImage}
              className="hidden"
            />
            <div className="flex justify-center space-x-4">
              <button onClick={closeEdit} className="px-4 py-2 border rounded" disabled={editLoading}>取消</button>
              <button onClick={submitEdit} className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" disabled={editLoading}>
                <Save size={16} className="mr-2" />{editLoading ? "提交中..." : "提交"}
              </button>
            </div>
          </div>    
        </div>
      )}
    </>
  );
}
