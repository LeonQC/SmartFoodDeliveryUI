"use client";

import React from "react";

type RejectReasonModalProps = {
  open: boolean;
  message: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RejectReasonModal({
  open,
  message,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectReasonModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        <p className="text-center text-gray-800 mb-4">{message}</p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="请输入理由"
          className="w-full h-24 border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
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