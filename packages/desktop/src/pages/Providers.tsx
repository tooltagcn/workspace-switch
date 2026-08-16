import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useProviderStore, type Provider } from '../stores/providerStore.js';

function ProviderDetail({
  provider,
  onClose,
}: {
  provider: Provider;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { setApiKey, isKeytarSupported } = useProviderStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keytarOk, setKeytarOk] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    isKeytarSupported().then(setKeytarOk);
  }, [isKeytarSupported]);

  const handleSaveKey = async () => {
    if (!apiKeyInput) return;
    setSavingKey(true);
    try {
      await setApiKey(provider.name, apiKeyInput);
      setApiKeyInput('');
    } finally {
      setSavingKey(false);
    }
  };

  const fields = [
    { label: t('provider.name'), value: provider.name },
    { label: t('provider.baseUrl'), value: provider.baseUrl ?? '-' },
    { label: t('provider.defaultModel'), value: provider.defaultModel ?? '-' },
    {
      label: t('provider.apiKey'),
      value: provider.apiKeyRef ? t('provider.apiKeyStored') : t('provider.apiKeyNotSet'),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-96">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{provider.name}</h3>
        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          ✕
        </button>
      </div>
      <div className="space-y-2 mb-4">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{f.label}</span>
            <span className="font-mono text-right max-w-[200px] truncate">{f.value}</span>
          </div>
        ))}
      </div>
      {provider.models.length > 0 && (
        <div className="mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('provider.models')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {provider.models.map((m) => (
              <span key={m} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
      {keytarOk && (
        <div className="border-t dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {t('provider.apiKey')}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={t('provider.enterApiKey')}
              className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              onClick={handleSaveKey}
              disabled={!apiKeyInput || savingKey}
              className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {t('provider.saveApiKey')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderAddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { createProvider, setApiKey, isKeytarSupported } = useProviderStore();
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    defaultModel: '',
    models: '',
    apiKey: '',
  });
  const [keytarOk, setKeytarOk] = useState(false);

  useEffect(() => {
    isKeytarSupported().then(setKeytarOk);
  }, [isKeytarSupported]);

  const handleSubmit = async () => {
    if (!form.name) return;
    try {
      const models = form.models
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
      await createProvider({
        name: form.name,
        baseUrl: form.baseUrl || undefined,
        defaultModel: form.defaultModel || undefined,
        models: models.length > 0 ? models : undefined,
      });
      if (form.apiKey && keytarOk) {
        await setApiKey(form.name, form.apiKey);
      }
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('provider.addProvider')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('provider.name')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Anthropic, OpenAI, DeepSeek..."
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('provider.baseUrl')}
            </label>
            <input
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
              placeholder="https://api.anthropic.com"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('provider.defaultModel')}
            </label>
            <input
              type="text"
              value={form.defaultModel}
              onChange={(e) => setForm((f) => ({ ...f, defaultModel: e.target.value }))}
              placeholder="claude-sonnet-4-20250514"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('provider.models')}
            </label>
            <input
              type="text"
              value={form.models}
              onChange={(e) => setForm((f) => ({ ...f, models: e.target.value }))}
              placeholder="model1, model2, model3"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {keytarOk && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t('provider.apiKey')}
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder={t('provider.enterApiKey')}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderSwitchDialog({
  provider,
  onClose,
}: {
  provider: Provider;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[400px]">
        <h3 className="text-lg font-semibold mb-4">{t('provider.switchProvider')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t('provider.switchConfirm')}</p>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
          <div className="text-sm font-medium">{provider.name}</div>
          {provider.defaultModel && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.defaultModel}</div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Providers() {
  const { t } = useTranslation();
  const { providers, loading, fetchProviders, deleteProvider } = useProviderStore();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('provider.title')}</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {t('provider.addProvider')}
        </button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {providers.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">{t('provider.noProviders')}</p>
          ) : (
            <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">{t('provider.name')}</th>
                  <th className="px-4 py-2 text-left">{t('provider.baseUrl')}</th>
                  <th className="px-4 py-2 text-left">{t('provider.defaultModel')}</th>
                  <th className="px-4 py-2 text-left">{t('provider.apiKey')}</th>
                  <th className="px-4 py-2 text-left">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t dark:border-gray-700 cursor-pointer hover:bg-gray-50 ${selectedProvider?.id === p.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                    onClick={() => setSelectedProvider(p)}
                  >
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">
                      {p.baseUrl ?? '-'}
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">{p.defaultModel ?? '-'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${p.apiKeyRef ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}
                      >
                        {p.apiKeyRef
                          ? t('provider.apiKeyStored')
                          : t('provider.apiKeyNotSet')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwitchingProvider(p);
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
                        >
                          {t('provider.setAsActive')}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(t('provider.deleteConfirm'))) {
                              await deleteProvider(p.id);
                              if (selectedProvider?.id === p.id) setSelectedProvider(null);
                            }
                          }}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedProvider && (
          <ProviderDetail
            provider={selectedProvider}
            onClose={() => setSelectedProvider(null)}
          />
        )}
      </div>

      {showAddDialog && <ProviderAddDialog onClose={() => setShowAddDialog(false)} />}
      {switchingProvider && (
        <ProviderSwitchDialog
          provider={switchingProvider}
          onClose={() => setSwitchingProvider(null)}
        />
      )}
    </div>
  );
}
