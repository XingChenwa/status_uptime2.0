import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Activity, Plus, Wifi, AlertCircle, Trash2, ChevronDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext.jsx';
import Header from '../components/Header.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import SettingsModal from '../components/SettingsModal.jsx';
import ServiceModal from '../components/ServiceModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { MOCK_STATUS, MOCK_INCIDENTS } from '../mockData.js';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const INCIDENT_BADGE = {
  investigating: { text: 'text-[#e92020]', bg: 'bg-[#e92020]/10', border: 'border-[#e92020]/30', dot: 'bg-[#e92020]' },
  identified:    { text: 'text-[#f7ac21]', bg: 'bg-[#f7ac21]/10', border: 'border-[#f7ac21]/30', dot: 'bg-[#f7ac21]' },
  monitoring:    { text: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/30', dot: 'bg-[#3b82f6]' },
  resolved:      { text: 'text-[#2fcc66]', bg: 'bg-[#2fcc66]/10', border: 'border-[#2fcc66]/30', dot: 'bg-[#2fcc66]' },
};

function StatusBadge({ status, t }) {
  const b = INCIDENT_BADGE[status] || INCIDENT_BADGE.investigating;
  const key = `incidents.status${status.charAt(0).toUpperCase() + status.slice(1)}`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${b.text} ${b.bg} ${b.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${b.dot} inline-block`} />
      {t(key)}
    </span>
  );
}

function IncidentCard({ inc, services, isAdmin, t, i18n, authHeader, fetchIncidents }) {
  const [expanded, setExpanded] = useState(inc.status !== 'resolved');
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: inc.status, message: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  const b = INCIDENT_BADGE[inc.status] || INCIDENT_BADGE.investigating;
  const dateStr = new Date(inc.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  let affectedIds = [];
  try { affectedIds = JSON.parse(inc.affected_services || '[]'); } catch (_) {}
  const affectedNames = affectedIds.map(id => services.find(s => s.id === id)?.name).filter(Boolean);

  const updates = Array.isArray(inc.updates) ? inc.updates : [];
  const initialEntry = inc.message
    ? { id: '__initial__', status: inc.status, message: inc.message, created_at: inc.created_at }
    : null;
  const allEntries = [...updates, ...(initialEntry ? [initialEntry] : [])];

  const fmtTime = (ts) => new Date(ts).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const submitUpdate = async () => {
    if (!updateForm.message.trim()) return;
    setSaving(true);
    await fetch(`/api/incidents/${inc.id}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(updateForm)
    });
    setSaving(false);
    setAddingUpdate(false);
    setUpdateForm({ status: updateForm.status, message: '' });
    fetchIncidents();
  };

  return (
    <div className="bg-th-surface border border-th-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-th-card transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={inc.status} t={t} />
            <span className="text-xs text-th-dim flex items-center gap-1">
              <Clock className="w-3 h-3" />{dateStr}
            </span>
          </div>
          <h3 className="font-semibold text-th-text text-sm leading-snug">{inc.title}</h3>
          {affectedNames.length > 0 && (
            <p className="text-th-dim text-[11px] mt-1">{t('incidents.affectedServices')}: {affectedNames.join(', ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {isAdmin && (
            <span role="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(true); }}
              className="p-1 text-th-dim hover:text-[#e92020] rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          )}
          <ConfirmDialog
            open={deleteConfirm}
            message={t('services.confirmDelete', { name: inc.title })}
            onConfirm={async () => {
              setDeleteConfirm(false);
              await fetch(`/api/incidents/${inc.id}`, { method: 'DELETE', headers: authHeader() });
              fetchIncidents();
            }}
            onCancel={() => setDeleteConfirm(false)}
          />
          <ChevronDown className={`w-4 h-4 text-th-dim transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Timeline */}
      {expanded && (
        <div className="px-5 pb-5">
          <div className="border-l-2 border-th-border pl-4 space-y-4">
            {allEntries.map((entry) => (
              <div key={entry.id} className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-th-surface border-2 border-th-border" />
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {entry.status && <StatusBadge status={entry.status} t={t} />}
                  <span className="text-th-dim text-[11px]">{fmtTime(entry.created_at)}</span>
                </div>
                <p className="text-sm text-th-muted leading-relaxed">{entry.message}</p>
              </div>
            ))}

            {/* Inline add-update form (admin) */}
            {isAdmin && (
              addingUpdate ? (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-th-accent border-2 border-th-accent" />
                  <div className="space-y-2">
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full bg-th-bg border border-th-border rounded-lg px-3 py-1.5 text-xs text-th-text outline-none cursor-pointer"
                    >
                      {['investigating','identified','monitoring','resolved'].map(s => (
                        <option key={s} value={s}>{t(`incidents.status${s.charAt(0).toUpperCase()+s.slice(1)}`)}</option>
                      ))}
                    </select>
                    <textarea
                      rows={2}
                      autoFocus
                      placeholder={t('incidents.updatePlaceholder')}
                      value={updateForm.message}
                      onChange={(e) => setUpdateForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full bg-th-bg border border-th-border rounded-lg px-3 py-2 text-sm text-th-text outline-none resize-none focus:border-th-accent"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setAddingUpdate(false)}
                        className="px-3 py-1.5 border border-th-border rounded-lg text-xs text-th-muted hover:text-th-text transition-colors">
                        {t('incidents.cancel')}
                      </button>
                      <button onClick={submitUpdate} disabled={saving || !updateForm.message.trim()}
                        className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors">
                        {saving ? t('incidents.saving') : t('incidents.postUpdate')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setUpdateForm({ status: inc.status, message: '' }); setAddingUpdate(true); }}
                  className="text-xs text-th-accent hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />{t('incidents.addUpdate')}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentSection({ incidents, services, isAdmin, t, i18n, authHeader, fetchIncidents, onAdd }) {
  return (
    <section className="mt-10 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-th-text">{t('incidents.title')}</h2>
        {isAdmin && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-th-border hover:bg-th-card text-th-muted hover:text-th-text text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('incidents.addIncident')}
          </button>
        )}
      </div>
      {incidents.length === 0 ? (
        <div className="bg-th-surface border border-th-border rounded-2xl p-8 text-center">
          <p className="text-th-muted text-sm">{t('incidents.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <IncidentCard
              key={inc.id}
              inc={inc}
              services={services}
              isAdmin={isAdmin}
              t={t}
              i18n={i18n}
              authHeader={authHeader}
              fetchIncidents={fetchIncidents}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function StatusPage() {
  const { t, i18n } = useTranslation();
  const { isAdmin, authHeader } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [serviceModal, setServiceModal] = useState({ open: false, service: null });
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentModal, setIncidentModal] = useState({ open: false });
  const [incidentForm, setIncidentForm] = useState({ title: '', message: '', status: 'investigating', affected_services: [] });
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  const fetchIncidents = useCallback(async () => {
    if (DEMO) { setIncidents(MOCK_INCIDENTS); return; }
    try {
      const res = await fetch('/api/incidents');
      const json = await res.json();
      setIncidents(Array.isArray(json) ? json : []);
    } catch (_) {}
  }, []);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (DEMO) {
      if (isManual) { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }
      setData(MOCK_STATUS); setLoading(false); setCountdown(300);
      return;
    }
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setCountdown((json.config?.refreshInterval || 5) * 60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setRefreshing(false), 600);
    }
  }, []);

  useEffect(() => { fetchStatus(); fetchIncidents(); }, [fetchStatus, fetchIncidents]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchStatus(true);
          return (data?.config?.refreshInterval || 5) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [countdown === null, data?.config?.refreshInterval]);

  const handleManualRefresh = async () => {
    if (isAdmin) await fetch('/api/check-all', { method: 'POST', headers: authHeader() });
    fetchStatus(true);
  };

  const handleDeleteService = (id, name) => {
    setConfirmDialog({
      open: true,
      message: t('services.confirmDelete', { name }),
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        await fetch(`/api/services/${id}`, { method: 'DELETE', headers: authHeader() });
        fetchStatus();
      }
    });
  };

  const handleSaveService = async (serviceData) => {
    const isEdit = !!serviceModal.service;
    await fetch(isEdit ? `/api/services/${serviceModal.service.id}` : '/api/services', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(serviceData)
    });
    setServiceModal({ open: false, service: null });
    fetchStatus();
  };

  const handleSaveConfig = async (cfg) => {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(cfg)
    });
    setShowSettings(false);
    fetchStatus();
  };

  const fmt = (secs) => {
    if (secs === null) return '--:--';
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  const overallStatus = () => {
    if (!data?.services?.length) return 'operational';
    const ss = data.services.map((s) => s.currentStatus);
    if (ss.some((s) => s === 'down')) return 'outage';
    if (ss.some((s) => s === 'degraded')) return 'degraded';
    return 'operational';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-th-accent border-t-transparent animate-spin" />
          <p className="text-th-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Wifi className="w-12 h-12 text-[#f85149] mx-auto mb-4 opacity-70" />
          <h2 className="text-th-text text-xl font-semibold mb-2">Cannot connect to backend</h2>
          <p className="text-th-muted text-sm mb-1">{error}</p>
          <p className="text-th-dim text-xs mb-6">Run: <code className="text-th-accent">npm run dev</code></p>
          <button onClick={fetchStatus} className="px-4 py-2 bg-th-card hover:bg-th-hover border border-th-border text-th-text rounded-lg text-sm transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = overallStatus();
  const services = data?.services || [];

  const STATUS_CFG = {
    operational: { Icon: CheckCircle,  solid: 'bg-[#2fcc66]', dot: 'bg-white', label: t('status.operational') },
    degraded:    { Icon: AlertTriangle, solid: 'bg-[#f7ac21]', dot: 'bg-white', label: t('status.degraded')    },
    outage:      { Icon: XCircle,       solid: 'bg-[#e92020]', dot: 'bg-white', label: t('status.outage')       }
  };
  const sc = STATUS_CFG[status];

  return (
    <div className="min-h-screen bg-th-bg text-th-text flex flex-col">
      <Header
        siteName={data?.config?.siteName || 'Status Page'}
        refreshing={refreshing}
        onRefresh={handleManualRefresh}
        onSettings={() => setShowSettings(true)}
        onAddService={isAdmin ? () => setServiceModal({ open: true, service: null }) : null}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {error && (
          <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-[#e92020]/10 border border-[#e92020]/30 rounded-xl text-[#e92020] text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* Overall banner */}
        <div className={`mb-8 px-6 py-5 rounded-2xl ${sc.solid} flex items-center gap-4 shadow-sm`}>
          <div className="relative flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${sc.dot}`} />
            {status === 'operational' && <div className={`absolute inset-0 rounded-full ${sc.dot} animate-ping opacity-50`} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base text-white leading-tight">{sc.label}</div>
            <div className="text-white/75 text-sm mt-0.5 truncate">{data.config.siteDesc || t('status.defaultDesc')}</div>
          </div>
          <sc.Icon className="w-6 h-6 text-white flex-shrink-0" strokeWidth={2.5} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { key: 'total',       value: services.length,                                                                          color: 'text-th-text'    },
            { key: 'operational', value: services.filter((s) => s.currentStatus === 'up').length,                                  color: 'text-[#2fcc66]'  },
            { key: 'issues',      value: services.filter((s) => s.currentStatus === 'down' || s.currentStatus === 'degraded').length, color: 'text-[#e92020]' }
          ].map(({ key, value, color }) => (
            <div key={key} className="bg-th-surface border border-th-border rounded-xl px-4 py-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-th-muted text-xs mt-0.5">{t(`stats.${key}`)}</div>
            </div>
          ))}
        </div>

        {/* Services header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-th-muted uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('services.title')}
          </h2>
          {isAdmin && (
            <button
              onClick={() => setServiceModal({ open: true, service: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('services.add')}
            </button>
          )}
        </div>

        {services.length === 0 ? (
          <div className="text-center py-20 bg-th-surface border border-th-border rounded-2xl">
            <Activity className="w-10 h-10 mx-auto mb-3 text-th-dim" />
            <p className="text-th-muted font-medium">{t('services.empty')}</p>
            <p className="text-th-dim text-sm mt-1">{t('services.emptyHint')}</p>
            {isAdmin && (
              <button
                onClick={() => setServiceModal({ open: true, service: null })}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('services.addFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={isAdmin ? () => setServiceModal({ open: true, service }) : null}
                onDelete={isAdmin ? () => handleDeleteService(service.id, service.name) : null}
              />
            ))}
          </div>
        )}

        {/* Incident history */}
        <IncidentSection
          incidents={incidents}
          services={services}
          isAdmin={isAdmin}
          t={t}
          i18n={i18n}
          authHeader={authHeader}
          fetchIncidents={fetchIncidents}
          onAdd={() => { setIncidentForm({ title: '', message: '', status: 'investigating', affected_services: [] }); setIncidentModal({ open: true }); }}
        />

      </main>

      {showSettings && isAdmin && (
        <SettingsModal config={data?.config} onClose={() => setShowSettings(false)} onSave={handleSaveConfig} />
      )}
      {serviceModal.open && isAdmin && (
        <ServiceModal
          service={serviceModal.service}
          onClose={() => setServiceModal({ open: false, service: null })}
          onSave={handleSaveService}
        />
      )}

      {incidentModal.open && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIncidentModal({ open: false })}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-th-surface border border-th-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-th-card">
              <span className="font-semibold text-sm text-th-text">{t('incidents.addIncident')}</span>
              <button onClick={() => setIncidentModal({ open: false })} className="p-1.5 rounded-lg text-th-muted hover:text-th-text hover:bg-th-card transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">{t('incidents.incidentTitle')}</label>
                <input type="text" value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors"
                  autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">{t('incidents.incidentMessage')}</label>
                <textarea rows={3} value={incidentForm.message} onChange={(e) => setIncidentForm({ ...incidentForm, message: e.target.value })}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-th-muted mb-1.5">{t('incidents.incidentStatus')}</label>
                <select value={incidentForm.status} onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })}
                  className="w-full bg-th-bg border border-th-border focus:border-th-accent rounded-lg px-3 py-2 text-sm text-th-text outline-none transition-colors cursor-pointer">
                  {['investigating','identified','monitoring','resolved'].map((s) => (
                    <option key={s} value={s}>{t(`incidents.status${s.charAt(0).toUpperCase()+s.slice(1)}`)}</option>
                  ))}
                </select>
              </div>
              {services.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-th-muted mb-1.5">{t('incidents.affectedServices')}</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {services.map((svc) => {
                      const checked = incidentForm.affected_services.includes(svc.id);
                      return (
                        <label key={svc.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-th-card cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setIncidentForm(prev => ({
                              ...prev,
                              affected_services: checked
                                ? prev.affected_services.filter(id => id !== svc.id)
                                : [...prev.affected_services, svc.id]
                            }))}
                            className="w-3.5 h-3.5 accent-th-accent cursor-pointer"
                          />
                          <span className="text-sm text-th-text">{svc.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setIncidentModal({ open: false })}
                  className="flex-1 py-2 px-4 border border-th-border hover:border-th-dim text-th-muted hover:text-th-text rounded-lg text-sm transition-colors">
                  {t('incidents.cancel')}
                </button>
                <button type="button" disabled={incidentSaving || !incidentForm.title.trim()}
                  onClick={async () => {
                    if (!incidentForm.title.trim()) return;
                    setIncidentSaving(true);
                    await fetch('/api/incidents', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...authHeader() },
                      body: JSON.stringify(incidentForm)
                    });
                    setIncidentSaving(false);
                    setIncidentModal({ open: false });
                    fetchIncidents();
                  }}
                  className="flex-1 py-2 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                  {incidentSaving ? t('incidents.saving') : t('incidents.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />

      <footer className="py-3 text-center text-th-dim text-xs border-t border-th-border">
        Copyright © 2026{' '}
        <a
          href="https://github.com/XingChenwa"
          target="_blank"
          rel="noopener noreferrer"
          className="text-th-muted hover:text-th-accent transition-colors"
        >
          XinQing'酱
        </a>
        {' '}· All Rights Reserved.
      </footer>
    </div>
  );
}
