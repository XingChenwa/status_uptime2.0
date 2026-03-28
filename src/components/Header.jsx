import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Settings, Plus, Globe, ChevronDown, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import ThemeSelector from './ThemeSelector.jsx';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

function useShanghaiTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Header({ siteName, refreshing, onRefresh, onSettings, onAddService }) {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  const shanghaiTime = useShanghaiTime();

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-th-surface/95 backdrop-blur-sm border-b border-th-border shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo / Site name */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/favicon.svg" alt="logo" className="w-8 h-8 rounded-lg select-none" />
          <span className="font-semibold text-th-text text-sm tracking-tight truncate">{siteName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">

          {/* Shanghai time */}
          <div className="hidden sm:flex items-center px-2.5 py-1.5 text-th-dim text-xs font-mono select-none">
            {shanghaiTime} CST
          </div>

          {/* Refresh */}
          <button onClick={onRefresh} disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-th-muted hover:text-th-text hover:bg-th-card">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme selector */}
          <ThemeSelector />

          {/* Language dropdown */}
          <div className="relative" ref={langRef}>
            <button onClick={() => setLangOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-th-muted hover:text-th-text hover:bg-th-card text-xs">
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentLang.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
            </button>

            {langOpen && (
              <div className="dropdown-enter absolute right-0 top-full mt-1.5 w-32 rounded-xl shadow-lg border border-th-border bg-th-surface py-1 z-50">
                {LANGUAGES.map((lang) => (
                  <button key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm rounded-lg mx-0 transition-colors ${
                      i18n.language === lang.code
                        ? 'text-th-accent font-medium bg-th-card'
                        : 'text-th-muted hover:text-th-text hover:bg-th-card'
                    }`}>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings (admin only) */}
          {isAdmin && onSettings && (
            <button onClick={onSettings}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-th-muted hover:text-th-text hover:bg-th-card">
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Add service (admin only) */}
          {isAdmin && onAddService && (
            <button onClick={onAddService}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium rounded-lg">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('header.addService')}</span>
            </button>
          )}

          {/* Admin link */}
          {isAdmin && (
            <Link to="/sadmin"
              className="flex items-center gap-1 px-2.5 py-1.5 text-th-accent hover:bg-th-card rounded-lg text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('header.admin')}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
