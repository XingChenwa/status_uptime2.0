import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Hash, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sadmin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sadmin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      login(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-th-accent to-[#388bfd] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-th-text">{t('admin.login.title')}</h1>
          <p className="text-th-muted text-sm mt-2">{t('admin.login.subtitle')}</p>
        </div>

        <div className="bg-th-surface border border-th-border rounded-2xl p-6">
          {step === 'email' ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">
                  <Mail className="w-3 h-3 inline mr-1" />{t('admin.login.email')}
                </label>
                <input
                  type="email" required autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors"
                />
              </div>
              {error && <div className="px-3 py-2 bg-[#2a1c1c] border border-[#f85149]/30 rounded-lg text-[#f85149] text-xs">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-th-accent hover:opacity-90 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-opacity">
                {loading ? t('admin.login.sending') : t('admin.login.sendCode')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="px-3 py-2.5 bg-[#0d2a0d] border border-[#3fb950]/20 rounded-lg text-[#3fb950] text-xs">
                {t('admin.login.codeSent')}
              </div>
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">
                  <Hash className="w-3 h-3 inline mr-1" />{t('admin.login.code')}
                </label>
                <input
                  type="text" required autoFocus maxLength={6} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('admin.login.codePlaceholder')}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text font-mono tracking-widest text-center outline-none transition-colors placeholder-th-dim"
                />
              </div>
              {error && <div className="px-3 py-2 bg-[#2a1c1c] border border-[#f85149]/30 rounded-lg text-[#f85149] text-xs">{error}</div>}
              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full py-2.5 bg-th-accent hover:opacity-90 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-opacity">
                {loading ? t('admin.login.verifying') : t('admin.login.verify')}
              </button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}
                className="w-full py-2 text-th-muted hover:text-th-text text-xs transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" />{t('admin.login.resend')}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-th-muted hover:text-th-text text-xs transition-colors flex items-center justify-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            {t('admin.dashboard.backToSite')}
          </Link>
        </div>
      </div>
    </div>
  );
}
