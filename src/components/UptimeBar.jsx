import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BAR_STYLE = {
  up:       { base: '#2fcc66', hover: '#3de070', labelKey: 'status.up'           },
  degraded: { base: '#f7ac21', hover: '#ffbc3a', labelKey: 'status.degradedLabel' },
  down:     { base: '#e92020', hover: '#ff3535', labelKey: 'status.down'          },
  nodata:   { base: 'var(--th-card)', hover: 'var(--th-border)', labelKey: 'status.nodata'  },
  unknown:  { base: 'var(--th-card)', hover: 'var(--th-border)', labelKey: 'status.unknown' }
};

function Tooltip({ bar, x, y, t }) {
  if (!bar) return null;
  const style = BAR_STYLE[bar.status] || BAR_STYLE.nodata;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: x + 12, top: y - 80 }}
    >
      <div className="bg-th-surface border border-th-border rounded-xl px-3 py-2.5 shadow-2xl min-w-[140px]">
        <div className="text-th-muted text-[10px] mb-1">{bar.date}</div>
        <div className="font-medium text-xs" style={{ color: style.base }}>
          {t(style.labelKey)}
        </div>
        {bar.status !== 'nodata' && bar.status !== 'unknown' && (
          <>
            <div className="text-th-text text-xs mt-0.5">
              {bar.uptime}% {t('uptimeBar.uptime')}
            </div>
            {bar.avgResponseTime != null && (
              <div className="text-th-muted text-[10px] mt-0.5">
                {t('uptimeBar.avg')} {bar.avgResponseTime}ms
              </div>
            )}
            {bar.checks != null && (
              <div className="text-th-dim text-[10px]">{bar.checks} {t('uptimeBar.checks')}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function UptimeBar({ bars = [], uptime }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);

  return (
    <div className="mt-4">
      {/* Bar chart */}
      <div className="flex items-stretch gap-[2px] h-7">
        {bars.map((bar, i) => {
          const style = BAR_STYLE[bar.status] || BAR_STYLE.nodata;
          return (
            <div
              key={i}
              className="flex-1 rounded-[2px] cursor-default transition-opacity"
              style={{ backgroundColor: hovered?.index === i ? style.hover : style.base }}
              onMouseEnter={(e) =>
                setHovered({ ...bar, index: i, x: e.clientX, y: e.clientY })
              }
              onMouseMove={(e) =>
                setHovered((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
              }
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* Labels row */}
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] text-th-dim">{t('uptimeBar.daysAgo')}</span>
        {uptime !== null && uptime !== undefined && (
          <span className="text-[10px] text-th-muted">
            <span className="text-[#2fcc66] font-medium">{uptime}%</span> {t('uptimeBar.uptime')}
          </span>
        )}
        <span className="text-[10px] text-th-dim">{t('uptimeBar.today')}</span>
      </div>

      {hovered && <Tooltip bar={hovered} x={hovered.x} y={hovered.y} t={t} />}
    </div>
  );
}
