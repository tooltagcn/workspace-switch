import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import GlobalSearch from './GlobalSearch.js';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navItems = [
    { path: '/', label: t('nav.dashboard') },
    { path: '/agents', label: t('nav.agents') },
    { path: '/skills', label: t('nav.skills') },
    { path: '/mcps', label: t('nav.mcps') },
    { path: '/providers', label: t('nav.providers') },
    { path: '/projects', label: t('nav.projects') },
    { path: '/settings', label: t('nav.settings') },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && (
        <aside className="w-64 bg-white shadow-lg">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-gray-800">{t('app.title')}</h1>
          </div>
          <nav className="p-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-2 mb-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      )}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              ☰
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSearchOpen(true)}
                className="px-3 py-1.5 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                ⌘K {t('search.placeholder')}
              </button>
              <div className="text-sm text-gray-600">{t('app.description')}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
