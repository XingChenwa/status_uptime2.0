import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LogOut, Settings, Server, Mail, Plus,
  Pencil, Trash2, Globe, Radio, Save, CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import ServiceModal from '../components/ServiceModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const TABS = ['siteSettings', 'services', 'emailSettings'];

function InputRow({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-th-muted mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors placeholder-th-dim" />
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-th-surface border border-th-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-th-border">
        <Icon className="w-4 h-4 text-th-accent" />
        <span className="font-semibold text-sm text-th-text">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { logout, authHeader } = useAuth();

  const [tab, setTab] = useState('siteSettings');
  const [services, setServices] = useState([]);
  const [config, setConfig] = useState({});
  const [emailCfg, setEmailCfg] = useState({});
  const [serviceModal, setServiceModal] = useState({ open: false, service: null });
  const [saved, setSaved] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  const hdr = { 'Content-Type': 'application/json', ...authHeader() };

  const loadAll = async () => {
    const [s, c, e] = await Promise.all([
      fetch('/api/status').then((r) => r.json()),
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/sadmin/admin-config', { headers: authHeader() }).then((r) => r.json())
    ]);
    setServices(s.services || []);
    setConfig({ siteName: '', siteDesc: '', refreshInterval: 5, retentionDays: 90, ...c });
    setEmailCfg({ email: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', ...e });
  };

  useEffect(() => { loadAll(); }, []);

  const flash = (key) => { setSaved(key); setTimeout(() => setSaved(''), 2000); };

  const saveSite = async () => {
    await fetch('/api/config', { method: 'PUT', headers: hdr, body: JSON.stringify(config) });
    flash('site');
  };

  const saveEmail = async () => {
    await fetch('/api/sadmin/admin-config', { method: 'PUT', headers: hdr, body: JSON.stringify(emailCfg) });
    flash('email');
  };

  const handleSaveService = async (data) => {
    const isEdit = !!serviceModal.service;
    await fetch(isEdit ? `/api/services/${serviceModal.service.id}` : '/api/services', {
      method: isEdit ? 'PUT' : 'POST',
      headers: hdr,
      body: JSON.stringify(data)
    });
    setServiceModal({ open: false, service: null });
    loadAll();
  };

  const handleDelete = (id, name) => {
    setConfirmDialog({
      open: true,
      message: t('services.confirmDelete', { name }),
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        await fetch(`/api/services/${id}`, { method: 'DELETE', headers: authHeader() });
        loadAll();
      }
    });
  };

  const TYPE_ICONS = { http: Globe, https: Globe, tcp: Server, ping: Radio };

  const SaveBtn = ({ saving, onClick }) => (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors">
      {saving ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      {saving ? t('admin.dashboard.saving') : t('admin.dashboard.save')}
    </button>
  );

  return (
    <div className="min-h-screen bg-th-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-th-surface/90 backdrop-blur border-b border-th-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-th-accent to-[#388bfd] flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-th-text text-sm">{t('admin.dashboard.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-th-muted hover:text-th-text hover:bg-th-card rounded-lg text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('admin.dashboard.backToSite')}
            </Link>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-th-muted hover:text-[#f85149] hover:bg-th-card rounded-lg text-xs transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              {t('admin.dashboard.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-th-surface border border-th-border rounded-xl p-1 w-fit">
          {TABS.map((tab_key) => {
            const icons = { siteSettings: Settings, services: Server, emailSettings: Mail };
            const Icon = icons[tab_key];
            return (
              <button key={tab_key} onClick={() => setTab(tab_key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === tab_key ? 'bg-th-accent text-white' : 'text-th-muted hover:text-th-text'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {t(`admin.dashboard.${tab_key}`)}
              </button>
            );
          })}
        </div>

        {/* Site settings tab */}
        {tab === 'siteSettings' && (
          <SectionCard title={t('admin.dashboard.siteSettings')} icon={Settings}>
            <div className="space-y-4 max-w-md">
              <InputRow label={t('settings.siteName')} value={config.siteName || ''} onChange={(v) => setConfig({ ...config, siteName: v })} />
              <InputRow label={t('settings.siteDesc')} value={config.siteDesc || ''} onChange={(v) => setConfig({ ...config, siteDesc: v })} placeholder={t('settings.siteDescPlaceholder')} />
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">{t('settings.refreshInterval')}</label>
                <select value={config.refreshInterval || 5} onChange={(e) => setConfig({ ...config, refreshInterval: Number(e.target.value) })}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors cursor-pointer">
                  {[[1,'1m'],[2,'2m'],[3,'3m'],[5,'5m'],[10,'10m'],[15,'15m'],[30,'30m'],[60,'1h']].map(([v, l]) => (
                    <option key={v} value={v}>{v < 60 ? `${v} min` : '1 hour'}</option>
                  ))}
                </select>
              </div>
              <InputRow label={t('settings.retention')} type="number" value={config.retentionDays || 90} onChange={(v) => setConfig({ ...config, retentionDays: Number(v) })} />
              <div className="pt-1 flex items-center gap-3">
                <SaveBtn saving={saved === 'site'} onClick={saveSite} />
                {saved === 'site' && <span className="text-[#3fb950] text-xs">Saved!</span>}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Services tab */}
        {tab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-th-muted uppercase tracking-widest">{t('admin.dashboard.services')}</h2>
              <button onClick={() => setServiceModal({ open: true, service: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {t('admin.dashboard.addService')}
              </button>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-16 bg-th-surface border border-th-border rounded-2xl">
                <Server className="w-10 h-10 mx-auto mb-3 text-th-dim" />
                <p className="text-th-muted text-sm">{t('services.empty')}</p>
              </div>
            ) : (
              services.map((svc) => {
                const Icon = TYPE_ICONS[svc.type] || Globe;
                const statusColor = svc.currentStatus === 'up' ? 'text-[#3fb950]' : svc.currentStatus === 'down' ? 'text-[#f85149]' : 'text-[#d29922]';
                return (
                  <div key={svc.id} className="flex items-center gap-4 bg-th-surface border border-th-border rounded-xl px-4 py-3">
                    <Icon className="w-4 h-4 text-th-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-th-text">{svc.name}</div>
                      <div className="text-th-dim text-xs font-mono truncate">{svc.host}</div>
                    </div>
                    <span className={`text-xs font-medium ${statusColor} flex-shrink-0`}>
                      {svc.currentStatus?.toUpperCase()}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setServiceModal({ open: true, service: svc })}
                        className="p-1.5 rounded-lg text-th-muted hover:text-th-accent hover:bg-th-card transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(svc.id, svc.name)}
                        className="p-1.5 rounded-lg text-th-muted hover:text-[#f85149] hover:bg-th-card transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Email settings tab */}
        {tab === 'emailSettings' && (
          <SectionCard title={t('admin.dashboard.emailSettings')} icon={Mail}>
            <div className="space-y-4 max-w-md">
              <InputRow label={t('admin.dashboard.smtpEmail')} type="email" value={emailCfg.email || ''} onChange={(v) => setEmailCfg({ ...emailCfg, email: v })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-th-muted mb-1.5">{t('admin.dashboard.smtpHost')}</label>
                  <input type="text" value={emailCfg.smtp_host || ''} onChange={(e) => setEmailCfg({ ...emailCfg, smtp_host: e.target.value })}
                    className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors" />
                  <p className="text-th-dim text-[10px] mt-1">{t('admin.dashboard.smtpHostHint')}</p>
                </div>
                <InputRow label={t('admin.dashboard.smtpPort')} type="number" value={emailCfg.smtp_port || '587'} onChange={(v) => setEmailCfg({ ...emailCfg, smtp_port: v })} />
              </div>
              <InputRow label={t('admin.dashboard.smtpUser')} value={emailCfg.smtp_user || ''} onChange={(v) => setEmailCfg({ ...emailCfg, smtp_user: v })} />
              <InputRow label={t('admin.dashboard.smtpPass')} type="password" value={emailCfg.smtp_pass || ''} onChange={(v) => setEmailCfg({ ...emailCfg, smtp_pass: v })} placeholder="••••••••" />
              <InputRow label={t('admin.dashboard.smtpFrom')} value={emailCfg.smtp_from || ''} onChange={(v) => setEmailCfg({ ...emailCfg, smtp_from: v })} />
              <div className="pt-1 flex items-center gap-3">
                <SaveBtn saving={saved === 'email'} onClick={saveEmail} />
                {saved === 'email' && <span className="text-[#3fb950] text-xs">Saved!</span>}
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {serviceModal.open && (
        <ServiceModal
          service={serviceModal.service}
          onClose={() => setServiceModal({ open: false, service: null })}
          onSave={handleSaveService}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </div>
  );
}
