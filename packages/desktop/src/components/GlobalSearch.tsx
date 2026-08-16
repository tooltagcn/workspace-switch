import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/ipc.js';

interface SearchItem {
  id: string;
  type: 'agent' | 'skill' | 'mcp' | 'provider';
  name: string;
  description: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      try {
        const [agents, skills, mcps, providers] = await Promise.all([
          api.listAgents(),
          api.listSkills(),
          api.listMcps(),
          api.listProviders(),
        ]);
        const lower = q.toLowerCase();
        const items: SearchItem[] = [
          ...agents
            .filter((a: { name: string }) => a.name.toLowerCase().includes(lower))
            .map((a: { id: string; name: string; configDirName: string }) => ({
              id: a.id,
              type: 'agent' as const,
              name: a.name,
              description: a.configDirName,
            })),
          ...skills
            .filter((s: { name: string }) => s.name.toLowerCase().includes(lower))
            .map((s: { id: string; name: string; description?: string }) => ({
              id: s.id,
              type: 'skill' as const,
              name: s.name,
              description: s.description ?? '',
            })),
          ...mcps
            .filter((m: { name: string }) => m.name.toLowerCase().includes(lower))
            .map((m: { id: string; name: string; description?: string }) => ({
              id: m.id,
              type: 'mcp' as const,
              name: m.name,
              description: m.description ?? '',
            })),
          ...providers
            .filter((p: { name: string }) => p.name.toLowerCase().includes(lower))
            .map((p: { id: string; name: string; baseUrl?: string }) => ({
              id: p.id,
              type: 'provider' as const,
              name: p.name,
              description: p.baseUrl ?? '',
            })),
        ];
        setResults(items);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
    },
    [],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 200);
  };

  const handleNavigate = (item: SearchItem) => {
    const routes: Record<string, string> = {
      agent: '/agents',
      skill: '/skills',
      mcp: '/mcps',
      provider: '/providers',
    };
    navigate(routes[item.type] ?? '/');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleNavigate(results[selectedIndex]);
    }
  };

  if (!open) return null;

  const grouped = {
    agent: results.filter((r) => r.type === 'agent'),
    skill: results.filter((r) => r.type === 'skill'),
    mcp: results.filter((r) => r.type === 'mcp'),
    provider: results.filter((r) => r.type === 'provider'),
  };

  const groupLabels: Record<string, string> = {
    agent: t('search.agents'),
    skill: t('search.skills'),
    mcp: t('search.mcps'),
    provider: t('search.providers'),
  };

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-[15vh]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[560px] max-h-[400px] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b dark:border-gray-700 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 px-4 py-2 text-lg border-0 outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title={t('common.close', 'Close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {results.length === 0 && query.trim() && (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">{t('search.noResults')}</div>
          )}
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            return (
              <div key={type} className="mb-2">
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-3 py-1">
                  {groupLabels[type]}
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleNavigate(item)}
                      className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between ${
                        idx === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[400px]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
