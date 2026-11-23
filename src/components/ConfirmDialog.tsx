import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ bỏ',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-navy-950/20 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 bg-navy-50/60 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                danger ? 'text-orange-600' : 'text-navy-800'
              }`}
            />
            <h3
              id="confirm-dialog-title"
              className="font-display text-base font-bold text-navy-900"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-white rounded-xl transition-colors"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-navy-50/45 border-t border-slate-200/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all whitespace-nowrap ${
              danger
                ? 'bg-orange-600 hover:bg-orange-700 shadow-xs'
                : 'bg-gradient-to-r from-navy-900 to-navy-700 hover:from-navy-800 hover:to-navy-600 shadow-navy'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
