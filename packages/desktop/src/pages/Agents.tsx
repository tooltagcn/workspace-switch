import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore.js';

function AgentDetail({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useTranslation();

  const fields = [
    { label: t('agent.name'), value: agent.name },
    { label: t('agent.configDirName'), value: agent.configDirName },
    { label: t('agent.userRoot'), value: agent.userRoot ?? '-' },
    { label: t('agent.projectRoot'), value: agent.projectRoot ?? '-' },
    { label: t('agent.mcpFile'), value: agent.mcpFile ?? '-' },
    { label: t('agent.mcpField'), value: agent.mcpField ?? '-' },
    { label: t('agent.skillDir'), value: agent.skillDir ?? '-' },
    { label: t('agent.builtin'), value: agent.builtin ? t('common.yes') : t('common.no') },
    { label: t('agent.enabled'), value: agent.enabled ? t('common.yes') : t('common.no') },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 w-96">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{agent.name}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{f.label}</span>
            <span className="font-mono text-right max-w-[200px] truncate">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentAddDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { createAgent } = useAgentStore();
  const [form, setForm] = useState({
    name: '',
    configDirName: '',
    userRoot: '',
    enabled: true,
  });
  const [detecting, setDetecting] = useState(false);

  const handlePathPaste = (path: string) => {
    setForm((f) => ({ ...f, userRoot: path }));
  };

  const handleAutoDetect = async () => {
    if (!form.configDirName) return;
    setDetecting(true);
    const knownDirs: Record<string, { mcpFile: string | null; mcpField: string | null; skillDir: string | null }> = {
      '.claude': { mcpFile: 'settings.json', mcpField: 'mcpServers', skillDir: 'commands' },
      '.agents': { mcpFile: 'config.json', mcpField: 'mcpServers', skillDir: 'skills' },
      '.cursor': { mcpFile: 'settings.json', mcpField: 'mcpServers', skillDir: null },
      '.qoder-cn': { mcpFile: null, mcpField: null, skillDir: 'skills' },
    };
    const detected = knownDirs[form.configDirName];
    if (detected) {
      setDetecting(false);
    } else {
      setDetecting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.configDirName) return;
    try {
      await createAgent({
        name: form.name,
        configDirName: form.configDirName,
        userRoot: form.userRoot || null,
        enabled: form.enabled,
      });
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('agent.addAgent')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.configDirName')}</label>
            <input
              type="text"
              value={form.configDirName}
              onChange={(e) => setForm((f) => ({ ...f, configDirName: e.target.value }))}
              placeholder=".claude, .agents, .cursor..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.userRoot')}</label>
            <input
              type="text"
              value={form.userRoot}
              onChange={(e) => handlePathPaste(e.target.value)}
              placeholder={t('agent.pastePath')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAutoDetect}
            disabled={detecting || !form.configDirName}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            {detecting ? t('agent.detecting') : t('agent.autoDetect')}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="agent-enabled"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="agent-enabled" className="text-sm text-gray-700">{t('agent.enabled')}</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.configDirName}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentEditDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useTranslation();
  const { updateAgent } = useAgentStore();
  const [form, setForm] = useState({
    name: agent.name,
    configDirName: agent.configDirName,
    userRoot: agent.userRoot ?? '',
    projectRoot: agent.projectRoot ?? '',
    enabled: agent.enabled,
  });

  const handleSubmit = async () => {
    try {
      await updateAgent(agent.id, {
        name: form.name,
        configDirName: form.configDirName,
        userRoot: form.userRoot || null,
        projectRoot: form.projectRoot || null,
        enabled: form.enabled,
      });
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('agent.editAgent')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.configDirName')}</label>
            <input
              type="text"
              value={form.configDirName}
              onChange={(e) => setForm((f) => ({ ...f, configDirName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.userRoot')}</label>
            <input
              type="text"
              value={form.userRoot}
              onChange={(e) => setForm((f) => ({ ...f, userRoot: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('agent.projectRoot')}</label>
            <input
              type="text"
              value={form.projectRoot}
              onChange={(e) => setForm((f) => ({ ...f, projectRoot: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-agent-enabled"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="edit-agent-enabled" className="text-sm text-gray-700">{t('agent.enabled')}</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.configDirName}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Agents() {
  const { t } = useTranslation();
  const { agents, loading, fetchAllAgents, deleteAgent } = useAgentStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAllAgents();
  }, [fetchAllAgents]);

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('agent.title')}</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {t('agent.addAgent')}
        </button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {agents.length === 0 ? (
            <p className="text-gray-600">{t('common.noData')}</p>
          ) : (
            <table className="w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">{t('agent.name')}</th>
                  <th className="px-4 py-2 text-left">{t('agent.configDirName')}</th>
                  <th className="px-4 py-2 text-left">{t('agent.userRoot')}</th>
                  <th className="px-4 py-2 text-left">{t('common.status')}</th>
                  <th className="px-4 py-2 text-left">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className={`border-t cursor-pointer hover:bg-gray-50 ${selectedAgent?.id === agent.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        {agent.builtin && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{t('agent.builtin')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">{agent.configDirName}</td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-500 truncate max-w-[200px]">{agent.userRoot ?? '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${agent.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {agent.enabled ? t('agent.status.active') : t('agent.status.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {t('common.edit')}
                        </button>
                        {!agent.builtin && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(t('agent.deleteConfirm'))) {
                                await deleteAgent(agent.id);
                                if (selectedAgent?.id === agent.id) setSelectedAgent(null);
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedAgent && (
          <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        )}
      </div>

      {showAddDialog && <AgentAddDialog onClose={() => setShowAddDialog(false)} />}
      {editingAgent && <AgentEditDialog agent={editingAgent} onClose={() => setEditingAgent(null)} />}
    </div>
  );
}
