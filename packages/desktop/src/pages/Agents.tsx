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
    { label: 'Template', value: agent.templateId ?? 'Auto-detect' },
    { label: 'MCP Config Path', value: agent.mcpConfigPath ?? 'Default' },
    { label: t('agent.targetFormat', 'Target Format'), value: agent.targetFormat ?? 'Auto-detect' },
    { label: t('agent.envTransform', 'Env Transform'), value: agent.envTransform ?? 'Default' },
    { label: t('agent.builtin'), value: agent.builtin ? t('common.yes') : t('common.no') },
    { label: t('agent.enabled'), value: agent.enabled ? t('common.yes') : t('common.no') },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-96 min-w-0 shrink-0 max-h-[80vh] flex flex-col sticky top-6 self-start">
      <div className="flex justify-between items-start gap-2 mb-4">
        <h3 className="text-lg font-semibold break-all">{agent.name}</h3>
        <button onClick={onClose} className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600">✕</button>
      </div>
      <div className="flex-1 overflow-auto space-y-2">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{f.label}</span>
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
      '.claude': { mcpFile: 'settings.json', mcpField: 'mcpServers', skillDir: 'skills' },
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">{t('agent.addAgent')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.configDirName')}</label>
            <input
              type="text"
              value={form.configDirName}
              onChange={(e) => setForm((f) => ({ ...f, configDirName: e.target.value }))}
              placeholder=".claude, .agents, .cursor..."
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.userRoot')}</label>
            <input
              type="text"
              value={form.userRoot}
              onChange={(e) => handlePathPaste(e.target.value)}
              placeholder={t('agent.pastePath')}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAutoDetect}
            disabled={detecting || !form.configDirName}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 disabled:text-gray-400"
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
            <label htmlFor="agent-enabled" className="text-sm text-gray-700 dark:text-gray-200">{t('agent.enabled')}</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800">{t('common.cancel')}</button>
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

function BuiltinMcpInfo({ agent }: { agent: Agent }) {
  const { t } = useTranslation();
  const items = [
    { label: t('agent.mcpFile'), value: agent.mcpFile ?? '-' },
    { label: t('agent.mcpField'), value: agent.mcpField ?? '-' },
    { label: t('agent.targetFormat', 'Target Format'), value: agent.targetFormat ?? t('agent.autoDetect', 'Auto-detect') },
    { label: t('agent.skillDir'), value: agent.skillDir ?? '-' },
  ];
  return (
    <div className="border-t dark:border-gray-700 pt-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('agent.mcpConfig', 'MCP Configuration')}</p>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
            <span className="font-mono text-gray-700 dark:text-gray-200">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('agent.builtinMcpHint', 'MCP configuration is managed by the built-in template.')}</p>
    </div>
  );
}

type EditForm = {
  name: string;
  configDirName: string;
  userRoot: string;
  projectRoot: string;
  enabled: boolean;
  mcpFile: string;
  mcpField: string;
  targetFormat: string;
  envTransform: string;
  fieldMappingCommand: string;
  fieldMappingArgs: string;
  fieldMappingUrl: string;
  fieldMappingEnv: string;
};

function CustomMcpFields({ form, setForm, templates, templateId, onQuickSetup }: {
  form: EditForm;
  setForm: (fn: (f: EditForm) => EditForm) => void;
  templates: any[];
  templateId: string;
  onQuickSetup: (tid: string) => void;
}) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <div className="border-t dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          {t('agent.quickSetup', 'Quick Setup / \u9884\u8BBE')}
        </label>
        <select
          value={templateId}
          onChange={(e) => onQuickSetup(e.target.value)}
          className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('agent.noTemplate', 'None (manual config)')}</option>
          {templates.map((tmpl: any) => (
            <option key={tmpl.id} value={tmpl.id}>{tmpl.name} ({tmpl.id})</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('agent.quickSetupHint', 'Select a preset to auto-fill MCP fields below. You can edit them freely.')}</p>
      </div>

      <div className="border-t dark:border-gray-700 pt-4 space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('agent.mcpConfig', 'MCP Configuration')}</p>
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('agent.mcpFile')}</label>
          <input
            type="text"
            value={form.mcpFile}
            onChange={(e) => setForm((f) => ({ ...f, mcpFile: e.target.value }))}
            placeholder="mcp.json, config.toml..."
            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('agent.mcpField')}</label>
          <input
            type="text"
            value={form.mcpField}
            onChange={(e) => setForm((f) => ({ ...f, mcpField: e.target.value }))}
            placeholder="mcpServers, mcp_servers..."
            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('agent.targetFormat', 'Target Format')}</label>
          <select
            value={form.targetFormat}
            onChange={(e) => setForm((f) => ({ ...f, targetFormat: e.target.value }))}
            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('agent.autoDetect', 'Auto-detect from file extension')}</option>
            <option value="json-map">JSON Map</option>
            <option value="toml-table">TOML Table</option>
            <option value="yaml">YAML</option>
          </select>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
        >
          {showAdvanced ? t('agent.hideAdvanced', 'Hide Advanced') : t('agent.showAdvanced', 'Show Advanced')}
        </button>
      </div>

      {showAdvanced && (
        <div className="border-t dark:border-gray-700 pt-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('agent.envTransform', 'Env Transform')}</label>
            <input
              type="text"
              value={form.envTransform}
              onChange={(e) => setForm((f) => ({ ...f, envTransform: e.target.value }))}
              placeholder="${env:VAR} or bare"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">{t('agent.fieldMapping', 'Field Mapping')}</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500">command</label>
                <input
                  type="text"
                  value={form.fieldMappingCommand}
                  onChange={(e) => setForm((f) => ({ ...f, fieldMappingCommand: e.target.value }))}
                  className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500">args</label>
                <input
                  type="text"
                  value={form.fieldMappingArgs}
                  onChange={(e) => setForm((f) => ({ ...f, fieldMappingArgs: e.target.value }))}
                  className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500">url</label>
                <input
                  type="text"
                  value={form.fieldMappingUrl}
                  onChange={(e) => setForm((f) => ({ ...f, fieldMappingUrl: e.target.value }))}
                  className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500">env</label>
                <input
                  type="text"
                  value={form.fieldMappingEnv}
                  onChange={(e) => setForm((f) => ({ ...f, fieldMappingEnv: e.target.value }))}
                  className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AgentEditDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useTranslation();
  const { updateAgent, updateTemplate, updateMcpConfigPath, templates, fetchTemplates } = useAgentStore();
  const [form, setForm] = useState<EditForm>({
    name: agent.name,
    configDirName: agent.configDirName,
    userRoot: agent.userRoot ?? '',
    projectRoot: agent.projectRoot ?? '',
    enabled: agent.enabled,
    mcpFile: agent.mcpFile ?? '',
    mcpField: agent.mcpField ?? '',
    targetFormat: agent.targetFormat ?? '',
    envTransform: agent.envTransform ?? '',
    fieldMappingCommand: agent.fieldMapping?.command ?? 'command',
    fieldMappingArgs: agent.fieldMapping?.args ?? 'args',
    fieldMappingUrl: agent.fieldMapping?.url ?? 'url',
    fieldMappingEnv: agent.fieldMapping?.env ?? 'env',
  });
  const [templateId, setTemplateId] = useState(agent.templateId ?? '');
  const [mcpConfigPath, setMcpConfigPath] = useState(agent.mcpConfigPath ?? '');

  useEffect(() => {
    if (templates.length === 0) fetchTemplates();
  }, [templates.length, fetchTemplates]);

  const handleQuickSetup = (tid: string) => {
    setTemplateId(tid);
    if (!tid) return;
    const tmpl = templates.find((t: any) => t.id === tid);
    if (!tmpl) return;
    setForm((f) => ({
      ...f,
      mcpFile: tmpl.mcpFile ?? '',
      mcpField: tmpl.mcpField ?? '',
      targetFormat: tmpl.targetFormat ?? tmpl.entryFormat?.format ?? '',
      envTransform: tmpl.entryFormat?.envTransform ?? '',
      fieldMappingCommand: tmpl.entryFormat?.fieldMapping?.command ?? 'command',
      fieldMappingArgs: tmpl.entryFormat?.fieldMapping?.args ?? 'args',
      fieldMappingUrl: tmpl.entryFormat?.fieldMapping?.url ?? 'url',
      fieldMappingEnv: tmpl.entryFormat?.fieldMapping?.env ?? 'env',
    }));
  };

  const handleSubmit = async () => {
    try {
      const updates: Record<string, unknown> = {
        name: form.name,
        configDirName: form.configDirName,
        userRoot: form.userRoot || null,
        projectRoot: form.projectRoot || null,
        enabled: form.enabled,
      };

      if (!agent.builtin) {
        updates.mcpFile = form.mcpFile || null;
        updates.mcpField = form.mcpField || null;
        updates.targetFormat = form.targetFormat || null;
        updates.envTransform = form.envTransform || null;
        updates.fieldMapping = {
          command: form.fieldMappingCommand || 'command',
          args: form.fieldMappingArgs || 'args',
          url: form.fieldMappingUrl || 'url',
          env: form.fieldMappingEnv || 'env',
        };
      }

      await updateAgent(agent.id, updates);
      if (!agent.builtin) {
        await updateTemplate(agent.id, templateId || null);
      }
      await updateMcpConfigPath(agent.id, mcpConfigPath || null);
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[520px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{t('agent.editAgent')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.configDirName')}</label>
            <input
              type="text"
              value={form.configDirName}
              onChange={(e) => setForm((f) => ({ ...f, configDirName: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {agent.builtin
            ? <BuiltinMcpInfo agent={agent} />
            : (
                <CustomMcpFields
                  form={form}
                  setForm={setForm}
                  templates={templates}
                  templateId={templateId}
                  onQuickSetup={handleQuickSetup}
                />
              )
          }

          <div className="border-t dark:border-gray-700 pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">MCP Config Path</label>
              <input
                type="text"
                value={mcpConfigPath}
                onChange={(e) => setMcpConfigPath(e.target.value)}
                placeholder="~/.config/agent/settings.json"
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.userRoot')}</label>
              <input
                type="text"
                value={form.userRoot}
                onChange={(e) => setForm((f) => ({ ...f, userRoot: e.target.value }))}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('agent.projectRoot')}</label>
              <input
                type="text"
                value={form.projectRoot}
                onChange={(e) => setForm((f) => ({ ...f, projectRoot: e.target.value }))}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="edit-agent-enabled" className="text-sm text-gray-700 dark:text-gray-200">{t('agent.enabled')}</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800">{t('common.cancel')}</button>
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
        <div className="flex-1 min-w-0 overflow-x-auto">
          {agents.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">{t('common.noData')}</p>
          ) : (
            <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow">
              <thead className="bg-gray-50 dark:bg-gray-800">
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
                    className={`border-t dark:border-gray-700 cursor-pointer hover:bg-gray-50 ${selectedAgent?.id === agent.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        {agent.builtin && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{t('agent.builtin')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">{agent.configDirName}</td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{agent.userRoot ?? '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${agent.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>
                        {agent.enabled ? t('agent.status.active') : t('agent.status.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
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
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800"
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
