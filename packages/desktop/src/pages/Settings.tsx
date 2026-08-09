import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProviderStore } from '../stores/providerStore.js';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, workspacePath, setTheme, setWorkspacePath } = useUiStore();
  const { providers, isKeytarSupported } = useProviderStore();
  const [pathInput, setPathInput] = useState(workspacePath);
  const [keytarOk, setKeytarOkState] = useState<boolean | null>(null);

  if (keytarOk === null) {
    isKeytarSupported().then(setKeytarOkState);
  }

  const handleSavePath = () => {
    setWorkspacePath(pathInput);
  };

  const themes: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('settings.title')}</h2>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-1">{t('settings.general')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('settings.workspacePathDesc')}</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.workspacePath')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="~/workspace"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSavePath}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {t('common.save')}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.theme')}
            </label>
            <div className="flex gap-2">
              {themes.map((th) => (
                <button
                  key={th.value}
                  onClick={() => setTheme(th.value)}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === th.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.language')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`px-4 py-2 rounded-lg border ${
                  i18n.language === 'en'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('settings.langEn')}
              </button>
              <button
                disabled
                className="px-4 py-2 rounded-lg border bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              >
                {t('settings.langZh')}
              </button>
            </div>
          </div>
        </div>

        {keytarOk && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-1">{t('settings.apiKeys')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('settings.apiKeysDesc')}</p>
            {providers.length === 0 ? (
              <p className="text-sm text-gray-400">{t('provider.noProviders')}</p>
            ) : (
              <div className="space-y-2">
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <span className="font-medium text-sm">{p.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        p.apiKeyRef
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.apiKeyRef
                        ? t('provider.apiKeyStored')
                        : t('provider.apiKeyNotSet')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
