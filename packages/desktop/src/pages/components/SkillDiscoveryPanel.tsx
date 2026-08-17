import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../../lib/ipc.js';
import { useSkillStore, type Skill } from '../../stores/skillStore.js';

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  inputPlaceholder: string;
}

interface SearchResult {
  name: string;
  description: string;
  source: string;
}

export default function SkillDiscoveryPanel() {
  const { t } = useTranslation();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeProviderId, setActiveProviderId] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [installingNames, setInstallingNames] = useState<Set<string>>(new Set());
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.listSkillProviders().then((list) => {
      setProviders(list);
      if (list.length > 0) setActiveProviderId(list[0].id);
    });
  }, []);

  const activeProvider = providers.find((p) => p.id === activeProviderId);

  const handleSearch = async () => {
    if (!query.trim() || !activeProviderId) return;
    setSearching(true);
    setError('');
    setResults([]);
    try {
      const res = await api.searchSkillDiscovery(activeProviderId, query.trim());
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  const handleInstall = async (name: string, source: string) => {
    if (!activeProviderId || installingNames.has(name) || installedNames.has(name)) return;
    setInstallingNames((prev) => new Set(prev).add(name));
    try {
      const created = (await api.installSkillDiscovery(activeProviderId, name, source)) as Skill | undefined;
      setInstalledNames((prev) => new Set(prev).add(name));
      if (created) {
        useSkillStore.setState((s) => ({ skills: [...s.skills, created] }));
      }
    } catch {
      // error shown inline via installingNames reset
    } finally {
      setInstallingNames((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      {providers.length > 1 && (
        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-900 rounded-lg">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProviderId(p.id);
                setResults([]);
                setError('');
                setQuery('');
              }}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeProviderId === p.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {activeProvider && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{activeProvider.description}</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={activeProvider?.inputPlaceholder ?? t('skill.addWizard.searchPlaceholder')}
          className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {searching ? t('skill.addWizard.searching') : t('skill.addWizard.searchBtn')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-2 max-h-[240px] overflow-auto">
          {results.map((r, i) => {
            const isInstalled = installedNames.has(r.name);
            const isInstalling = installingNames.has(r.name);
            return (
              <div key={i} className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.description}</div>
                  )}
                </div>
                <button
                  onClick={() => handleInstall(r.name, r.source)}
                  disabled={isInstalling || isInstalled}
                  className={`px-3 py-1 text-sm rounded shrink-0 ${
                    isInstalled
                      ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 cursor-default'
                      : 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50'
                  }`}
                >
                  {isInstalled
                    ? t('skill.addWizard.installed')
                    : isInstalling
                      ? t('skill.addWizard.installing')
                      : t('skill.addWizard.installBtn')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!searching && results.length === 0 && !error && query && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          {t('skill.addWizard.noResults')}
        </p>
      )}
    </div>
  );
}
