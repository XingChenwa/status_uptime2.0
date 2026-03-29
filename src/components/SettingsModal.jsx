import { useState } from 'react';
import { X, Settings, Clock, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const REFRESH_OPTIONS = [
  { value: 1,  label: '1 minute'   },
  { value: 2,  label: '2 minutes'  },
  { value: 3,  label: '3 minutes'  },
  { value: 5,  label: '5 minutes'  },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour'     }
];

export default function SettingsModal({ config, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    siteName: config?.siteName || 'My Status Page',
    siteDesc: config?.siteDesc || '',
    refreshInterval: config?.refreshInterval || 5,
    retentionDays: config?.retentionDays || 90
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, refreshInterval: Number(form.refreshInterval), retentionDays: Number(form.retentionDays) });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-th-surface border border-th-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-th-card">
          <div className="flex items-center gap-2 text-th-text font-semibold text-sm">
            <Settings className="w-4 h-4 text-th-accent" />
            {t('settings.title')}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-th-muted hover:text-th-text hover:bg-th-card transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Site name */}
          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">
              <Globe className="w-3 h-3 inline mr-1" />{t('settings.siteName')}
            </label>
            <input type="text" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors"
              placeholder="My Status Page" />
          </div>

          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">{t('settings.siteDesc')}</label>
            <input type="text" value={form.siteDesc} onChange={(e) => setForm({ ...form, siteDesc: e.target.value })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors"
              placeholder={t('settings.siteDescPlaceholder')} />
          </div>

          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />{t('settings.refreshInterval')}
            </label>
            <select value={form.refreshInterval} onChange={(e) => setForm({ ...form, refreshInterval: Number(e.target.value) })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors cursor-pointer">
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-th-dim text-[10px] mt-1.5">{t('settings.refreshHint')}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">{t('settings.retention')}</label>
            <input type="number" min={7} max={365} value={form.retentionDays}
              onChange={(e) => setForm({ ...form, retentionDays: e.target.value })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 border border-th-border hover:border-th-dim text-th-muted hover:text-th-text rounded-lg text-sm transition-colors">
              {t('settings.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
