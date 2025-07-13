'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAddressList } from '@/store/slices/addressSlice'
import apiClient from '@/services/apiClient'
import toast from 'react-hot-toast'
import { ConfirmModal } from "@/components/ConfirmModal"

type FormMode = 'add' | 'edit'

export default function AddressBookPage() {
  const dispatch = useAppDispatch()
  const addressList = useAppSelector(state => state.address.addressList)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('add')
  const [currentEdit, setCurrentEdit] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteIds, setDeleteIds] = useState<number[]>([])
  const [form, setForm] = useState({
    label: '',
    recipient: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    isDefault: false,
  })

  // 拉取地址列表
  const fetchAddressList = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/client/address')
      dispatch(setAddressList(res.data.data || []))
    } catch (e) {
      toast.error('加载地址簿失败')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAddressList()
  }, [])

  // 打开新增/编辑弹窗
  const openAdd = () => {
    setFormMode('add')
    setForm({
      label: '',
      recipient: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipcode: '',
      country: '',
      isDefault: false,
    })
    setModalOpen(true)
    setCurrentEdit(null)
  }
  const openEdit = (addr: any) => {
    setFormMode('edit')
    setForm({ ...addr })
    setModalOpen(true)
    setCurrentEdit(addr)
  }

  // 提交新增/编辑
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (formMode === 'add') {
        const res = await apiClient.post('/client/address', form)
        toast.success('新增成功')
      } else if (formMode === 'edit' && currentEdit) {
        await apiClient.put(`/client/address/${currentEdit.addressId}`, form)
        toast.success('更新成功')
      }
      setModalOpen(false)
      fetchAddressList()
    } catch (e: any) {
      toast.error(e?.response?.data?.msg || '操作失败')
    }
  }

  // 删除
  const handleDelete = (id: number) => {
    setDeleteIds([id])
    setConfirmOpen(true)
  }
  // 选择切换
  const handleSelect = (addressId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(addressId)) newSet.delete(addressId)
      else newSet.add(addressId)
      return newSet
    })
  }
  // 批量删除
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setDeleteIds(Array.from(selectedIds))
    setConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    setConfirmOpen(false)
    if (deleteIds.length === 0) return
    try {
      await apiClient.delete('/client/address', { params: { addressId: deleteIds } })
      toast.success(deleteIds.length > 1 ? '批量删除成功' : '删除成功')
      setSelectedIds(new Set()) // 兼容批量
      setDeleteIds([])
      fetchAddressList()
    } catch {
      toast.error('删除失败')
    }
  }
  // 设为默认
  const handleSetDefault = async (id: number) => {
    try {
      await apiClient.post(`/client/address/${id}/setDefault`)
      toast.success('已设为默认地址')
      fetchAddressList()
    } catch {
      toast.error('设置默认失败')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <div className='flex items-center gap-5 ml-4'>
          {/* 全选/反选 */}
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={addressList.length > 0 && selectedIds.size === addressList.length}
            onChange={() => {
              if (addressList.length === 0) return;
              if (selectedIds.size === addressList.length) {
                setSelectedIds(new Set()); // 全部取消
              } else {
                setSelectedIds(new Set(addressList.map(a => a.addressId))); // 全部选中
              }
            }}
            id="selectAll"
          />
          {/* 批量删除 */}
          <button
            className={`px-4 py-2 rounded text-white font-medium ${selectedIds.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
            disabled={selectedIds.size === 0}
            onClick={handleBulkDelete}
          >
            批量删除{selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
        </div>  
        <button
          className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          onClick={openAdd}
        >
          新增地址
        </button>
      </div>
      

      {loading ? (
        <div className="py-20 text-center text-gray-500">加载中…</div>
      ) : addressList.length === 0 ? (
        <div className="py-20 text-center text-gray-400">暂无地址，可点击新增</div>
      ) : (
        <div className="space-y-4">
          {addressList.map(addr => (
            <div
              key={addr.addressId}
              className={`flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg shadow relative ${
                addr.isDefault ? 'border-indigo-600 bg-indigo-50' : 'bg-white'
              }`}
            >
              {/* 复选框 */}
              <input
                type="checkbox"
                className="w-5 h-5 mr-2"
                checked={selectedIds.has(addr.addressId)}
                onChange={() => handleSelect(addr.addressId)}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-600 text-white">默认</span>
                  )}
                </div>
                <div className="text-gray-700">{addr.recipient}</div>
                <div className="text-gray-700">{addr.phone}</div>
                <div className="text-gray-500">
                  {addr.addressLine1} {addr.addressLine2} {addr.city} {addr.state} {addr.country}
                </div>
                <div className="text-gray-400">邮编: {addr.zipcode}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                {!addr.isDefault && (
                  <button
                    className="px-3 py-1 text-indigo-600 border border-indigo-500 rounded hover:bg-indigo-100"
                    onClick={() => handleSetDefault(addr.addressId)}
                  >
                    设为默认
                  </button>
                )}
                <button
                  className="px-3 py-1 text-blue-600 border border-blue-500 rounded hover:bg-blue-50"
                  onClick={() => openEdit(addr)}
                >
                  编辑
                </button>
                <button
                  className="px-3 py-1 text-red-600 border border-red-500 rounded hover:bg-red-50"
                  onClick={() => handleDelete(addr.addressId)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 地址弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-8">
            <h3 className="text-xl font-bold mb-4">{formMode === 'add' ? '新增地址' : '编辑地址'}</h3>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>标签
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>收件人
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.recipient}
                    onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>手机号
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">邮编</label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.zipcode ?? ""}
                    onChange={e => setForm(f => ({ ...f, zipcode: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>国家
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>省/州
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>城市
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    <span className="text-red-500 mr-1">*</span>详细地址1
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.addressLine1}
                    onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">详细地址2</label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={form.addressLine2 ?? ""}
                    onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  保存
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                  onClick={() => setModalOpen(false)}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmOpen}
        message={
          deleteIds.length > 1
            ? `确认删除选中的 ${deleteIds.length} 个地址吗？`
            : '确定要删除该地址吗？'
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteIds([]) }}
      />
    </div>
  )
}
