"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { ToastMessage } from "@/types";
import { generateId } from "@/lib/utils";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

interface ToastContextType {
  showToast: (message: string, type?: ToastMessage["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// Export a standalone function for non-React contexts
let toastListeners: Array<(toast: ToastMessage) => void> = [];

export function showToast(message: string, type: ToastMessage["type"] = "info") {
  const toast: ToastMessage = { id: generateId(), type, message };
  toastListeners.forEach((fn) => fn(toast));
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    error: <XCircle className="h-5 w-5 text-red-400" />,
    info: <Info className="h-5 w-5 text-blue-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
  };

  const bgMap = {
    success: "border-green-500/30 bg-green-500/10",
    error: "border-red-500/30 bg-red-500/10",
    info: "border-blue-500/30 bg-blue-500/10",
    warning: "border-yellow-500/30 bg-yellow-500/10",
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm transition-all duration-300 ${
        bgMap[toast.type]
      } ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
    >
      <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <p className="text-sm text-gray-200 flex-1">{toast.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register listener for standalone showToast calls
  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  const contextValue: ToastContextType = {
    showToast: (message, type = "info") => {
      const toast: ToastMessage = { id: generateId(), type, message };
      addToast(toast);
    },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
