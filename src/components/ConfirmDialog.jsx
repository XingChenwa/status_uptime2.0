import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${visible ? 'dialog-overlay-enter' : 'opacity-0'}`} onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-sm bg-th-surface border border-th-border rounded-2xl shadow-2xl ${visible ? 'dialog-card-enter' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          {title && <h3 className="font-semibold text-th-text text-sm mb-2">{title}</h3>}
          <p className="text-th-muted text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 border border-th-border hover:border-th-dim text-th-muted hover:text-th-text rounded-lg text-sm transition-colors"
          >
            {t('confirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors ${
              danger
                ? 'bg-[#b91c1c] hover:bg-[#dc2626]'
                : 'bg-[#238636] hover:bg-[#2ea043]'
            }`}
          >
            {t('confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
