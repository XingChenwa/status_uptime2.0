import { useState } from 'react';
import { Pencil, Trash2, Globe, Server, Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UptimeBar from './UptimeBar.jsx';

const STATUS_CONFIG = {
  up:      { labelKey: 'status.up',       color: 'text-[#2fcc66]', dot: 'bg-[#2fcc66]', badge: 'text-[#2fcc66] bg-[#2fcc66]/10 border-[#2fcc66]/30', pulse: true  },
  down:    { labelKey: 'status.down',     color: 'text-[#e92020]', dot: 'bg-[#e92020]', badge: 'text-[#e92020] bg-[#e92020]/10 border-[#e92020]/30', pulse: false },
  degraded:{ labelKey: 'status.degradedLabel', color: 'text-[#f7ac21]', dot: 'bg-[#f7ac21]', badge: 'text-[#f7ac21] bg-[#f7ac21]/10 border-[#f7ac21]/30', pulse: false },
  unknown: { labelKey: 'status.unknown',  color: 'text-th-dim',    dot: 'bg-th-border',  badge: 'text-th-muted bg-th-card border-th-border',             pulse: false }
};

const TYPE_ICONS = {
  http:  Globe,
  https: Globe,
  tcp:   Server,
  ping:  Radio
};

const TYPE_LABELS = {
  http:  'HTTP',
  https: 'HTTPS',
  tcp:   'TCP',
  ping:  'PING'
};

function formatResponseTime(ms) {
  if (!ms) return null;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatLastChecked(ts, t) {
  if (!ts) return t('status.never');
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return t('status.justNow');
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function ServiceCard({ service, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const sc = STATUS_CONFIG[service.currentStatus] || STATUS_CONFIG.unknown;
  const TypeIcon = TYPE_ICONS[service.type] || Globe;
  const rt = formatResponseTime(service.responseTime);
  const isAdminView = !!(onEdit || onDelete);

  return (
    <div
      className="group bg-th-surface border border-th-border hover:shadow-md rounded-2xl px-5 py-4 transition-shadow duration-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: status + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status dot */}
          <div className="relative flex-shrink-0 mt-0.5">
            <div className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
            {sc.pulse && (
              <div className={`absolute inset-0 rounded-full ${sc.dot} animate-ping opacity-50`} />
            )}
          </div>

          {/* Name + host */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-th-text text-sm">{service.name}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-th-card rounded text-[10px] text-th-muted font-mono border border-th-border">
                <TypeIcon className="w-2.5 h-2.5" />
                {TYPE_LABELS[service.type] || service.type.toUpperCase()}
              </span>
            </div>
            {(isAdminView || !service.hideHost) && (
              <div className="text-th-dim text-xs mt-0.5 truncate max-w-xs" title={service.host}>
                {service.host}
              </div>
            )}
          </div>
        </div>

        {/* Right: status label + response time + actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block text-right shrink-0">
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc.badge}`}>{t(sc.labelKey)}</span>
            <div className="text-th-dim text-[10px] mt-1">
              {rt ? rt : formatLastChecked(service.lastChecked, t)}
            </div>
          </div>

          {/* Edit / Delete — visible on hover */}
          {(onEdit || onDelete) && (
            <div className={`flex items-center gap-1 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
              {onEdit && (
                <button onClick={onEdit} title={t('services.edit')}
                  className="p-1.5 rounded-lg text-th-muted hover:text-th-accent hover:bg-th-card transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} title={t('services.delete')}
                  className="p-1.5 rounded-lg text-th-muted hover:text-[#f85149] hover:bg-th-card transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Uptime bar */}
      <UptimeBar bars={service.bars || []} uptime={service.uptime} />

      {/* Mobile: status row */}
      <div className="flex sm:hidden items-center justify-between mt-2 pt-2 border-t border-th-card">
        <span className={`text-xs font-medium ${sc.color}`}>{t(sc.labelKey)}</span>
        {rt && <span className="text-th-dim text-xs">{rt}</span>}
      </div>
    </div>
  );
}
