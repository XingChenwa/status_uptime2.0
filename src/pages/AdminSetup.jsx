import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Server, Key, Eye, EyeOff } from 'lucide-react';

export default function AdminSetup({ onSetupComplete }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    email: '', smtp_host: '', smtp_port: '587',
    smtp_user: '', smtp_pass: '', smtp_from: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.smtp_host.includes('@')) {
      setError(t('admin.setup.smtpHostHint'));
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sadmin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, smtp_port: Number(form.smtp_port) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      onSetupComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-th-accent to-[#388bfd] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-th-text">{t('admin.setup.title')}</h1>
          <p className="text-th-muted text-sm mt-2 max-w-sm mx-auto">{t('admin.setup.subtitle')}</p>
        </div>

        <div className="bg-th-surface border border-th-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-th-muted mb-1.5">
                <Mail className="w-3 h-3 inline mr-1" />{t('admin.setup.email')}
              </label>
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder={t('admin.setup.emailPlaceholder')}
                className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors placeholder-th-dim" />
              <p className="text-th-dim text-[10px] mt-1">{t('admin.setup.hint')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">
                  <Server className="w-3 h-3 inline mr-1" />{t('admin.setup.smtpHost')}
                </label>
                <input type="text" required value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)}
                  placeholder={t('admin.setup.smtpHostPlaceholder')}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors placeholder-th-dim" />
                <p className="text-th-dim text-[10px] mt-1">{t('admin.setup.smtpHostHint')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">{t('admin.setup.smtpPort')}</label>
                <input type="number" required value={form.smtp_port} onChange={(e) => set('smtp_port', e.target.value)}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-th-muted mb-1.5">{t('admin.setup.smtpUser')}</label>
              <input type="text" required value={form.smtp_user} onChange={(e) => set('smtp_user', e.target.value)}
                className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-medium text-th-muted mb-1.5">
                <Key className="w-3 h-3 inline mr-1" />{t('admin.setup.smtpPass')}
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={form.smtp_pass}
                  onChange={(e) => set('smtp_pass', e.target.value)}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 pr-9 text-sm text-th-text outline-none transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-th-muted hover:text-th-text transition-colors">
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-th-muted mb-1.5">{t('admin.setup.smtpFrom')}</label>
              <input type="text" value={form.smtp_from} onChange={(e) => set('smtp_from', e.target.value)}
                placeholder={t('admin.setup.smtpFromPlaceholder')}
                className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors placeholder-th-dim" />
            </div>

            {error && (
              <div className="px-3 py-2 bg-[#2a1c1c] border border-[#f85149]/30 rounded-lg text-[#f85149] text-xs">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {loading ? t('admin.setup.submitting') : t('admin.setup.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
