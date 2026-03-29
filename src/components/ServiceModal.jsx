import { useState } from 'react';
import { X, Globe, Server, Radio, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TYPE_OPTIONS = [
  { value: 'http',  label: 'HTTP / HTTPS', icon: Globe,  hint: 'e.g. https://example.com'      },
  { value: 'tcp',   label: 'TCP Port',     icon: Server, hint: 'e.g. 1.2.3.4:22'              },
  { value: 'ping',  label: 'Ping (ICMP)',  icon: Radio,  hint: 'e.g. 1.2.3.4 or hostname'     }
];

export default function ServiceModal({ service, onClose, onSave }) {
  const { t } = useTranslation();
  const isEdit = !!service;
  const [form, setForm] = useState({
    name:      service?.name      || '',
    type:      service?.type      || 'http',
    host:      service?.host      || '',
    timeout:   service?.timeout   || 10,
    hide_host: service?.hideHost  || false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const selectedType = TYPE_OPTIONS.find((t) => t.value === form.type) || TYPE_OPTIONS[0];

  const validate = () => {
    if (!form.name.trim()) return t('serviceModal.errors.nameRequired');
    if (!form.host.trim()) return t('serviceModal.errors.hostRequired');
    if (form.type === 'tcp' && !form.host.includes(':')) return t('serviceModal.errors.tcpFormat');
    if (form.type === 'http' && !form.host.startsWith('http')) return t('serviceModal.errors.httpFormat');
    if (form.timeout < 1 || form.timeout > 60) return t('serviceModal.errors.timeoutRange');
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    await onSave({ ...form, timeout: Number(form.timeout) });
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
          <span className="font-semibold text-sm text-th-text">
            {isEdit ? t('serviceModal.editTitle') : t('serviceModal.addTitle')}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-th-muted hover:text-th-text hover:bg-th-card transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Service name */}
          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">{t('serviceModal.name')}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors placeholder-th-dim"
              placeholder={t('serviceModal.namePlaceholder')} autoFocus />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">{t('serviceModal.type')}</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.type === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setForm({ ...form, type: opt.value, host: '' })}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                      active ? 'bg-[#0d1f3c] border-th-accent text-th-accent'
                             : 'bg-th-bg border-th-border text-th-muted hover:border-th-dim hover:text-th-text'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host / URL */}
          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">{t('serviceModal.host')}</label>
            <input type="text" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text font-mono outline-none transition-colors placeholder-th-dim"
              placeholder={selectedType.hint} />
            <p className="flex items-center gap-1 text-th-dim text-[10px] mt-1.5">
              <Info className="w-3 h-3 flex-shrink-0" />{selectedType.hint}
            </p>
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-xs font-medium text-th-muted mb-1.5">{t('serviceModal.timeout')}</label>
            <input type="number" min={1} max={60} value={form.timeout} onChange={(e) => setForm({ ...form, timeout: e.target.value })}
              className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors" />
          </div>

          {/* Hide host toggle */}
          <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-th-bg border border-th-border rounded-lg cursor-pointer select-none">
            <span className="text-sm text-th-text">{t('serviceModal.hideHost')}</span>
            <div
              onClick={() => setForm(f => ({ ...f, hide_host: !f.hide_host }))}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                form.hide_host ? 'bg-th-accent' : 'bg-th-border'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                form.hide_host ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-[#2a1c1c] border border-[#f85149]/30 rounded-lg text-[#f85149] text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 border border-th-border hover:border-th-dim text-th-muted hover:text-th-text rounded-lg text-sm transition-colors">
              {t('serviceModal.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {saving ? t('serviceModal.saving') : isEdit ? t('serviceModal.save') : t('serviceModal.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
