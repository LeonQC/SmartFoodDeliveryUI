"use client";
import React from "react";

type ConfirmModalProps = {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ open, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onCancel} // 点击遮罩关闭
    >
      <div 
        className="bg-white rounded-lg shadow-lg max-w-xs w-full p-6"
        onClick={e => e.stopPropagation()} // 阻止冒泡，点击内容不会冒泡到卡片
      >
        <p className="text-center text-gray-800 mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            确认
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
