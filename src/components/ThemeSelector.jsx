import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext.jsx';

const OPTIONS = [
  { mode: 'system', Icon: Monitor, labelKey: 'theme.system' },
  { mode: 'light',  Icon: Sun,     labelKey: 'theme.light'  },
  { mode: 'dark',   Icon: Moon,    labelKey: 'theme.dark'   },
];

export default function ThemeSelector() {
  const { mode, setTheme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = OPTIONS.find((o) => o.mode === mode) || OPTIONS[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-th-muted hover:text-th-text hover:bg-th-card text-xs"
      >
        <current.Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t(current.labelKey)}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="dropdown-enter absolute right-0 top-full mt-1.5 w-36 rounded-xl shadow-lg border border-th-border bg-th-surface py-1 z-50">
          {OPTIONS.map(({ mode: m, Icon, labelKey }) => (
            <button
              key={m}
              onClick={() => { setTheme(m); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                mode === m
                  ? 'text-th-accent font-medium bg-th-card'
                  : 'text-th-muted hover:text-th-text hover:bg-th-card'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
