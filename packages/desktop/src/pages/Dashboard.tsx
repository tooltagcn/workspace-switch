import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../stores/agentStore.js';
import { useSkillStore } from '../stores/skillStore.js';
import { useMcpStore } from '../stores/mcpStore.js';
import { api } from '../lib/ipc.js';

function WorkspaceHealthCard() {
  const { t } = useTranslation();
  const { agents, fetchAgents } = useAgentStore();
  const { skills, fetchSkills } = useSkillStore();
  const { mcps, fetchMcps } = useMcpStore();
  const [integrityOk, setIntegrityOk] = useState(true);

  useEffect(() => {
    fetchAgents();
    fetchSkills();
    fetchMcps();
  }, [fetchAgents, fetchSkills, fetchMcps]);

  useEffect(() => {
    setIntegrityOk(agents.length > 0 || skills.length > 0 || mcps.length > 0);
  }, [agents, skills, mcps]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.workspaceHealth')}</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">{t('dashboard.totalAgents')}</span>
          <span className="font-medium">{agents.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">{t('dashboard.totalSkills')}</span>
          <span className="font-medium">{skills.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">{t('dashboard.totalMcps')}</span>
          <span className="font-medium">{mcps.length}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-300">{t('dashboard.integrity')}</span>
          <span className={`px-2 py-1 rounded text-sm ${integrityOk ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'}`}>
            {integrityOk ? t('dashboard.integrityOk') : t('dashboard.integrityWarning')}
          </span>
        </div>
      </div>
    </div>
  );
}

function AgentSyncStatus() {
  const { t } = useTranslation();
  const { agents } = useAgentStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-2">{t('dashboard.agentSyncStatus')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('dashboard.agentSyncDesc')}</p>
      {agents.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('common.noData')}</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${agent.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className="font-medium text-sm">{agent.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${agent.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>
                {agent.enabled ? t('dashboard.synced') : t('dashboard.notSynced')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    { label: t('dashboard.reverseScan'), desc: t('dashboard.reverseScanDesc'), onClick: () => navigate('/skills') },
    { label: t('dashboard.addAgent'), desc: '', onClick: () => navigate('/agents') },
    { label: t('dashboard.addSkill'), desc: '', onClick: () => navigate('/skills') },
    { label: t('dashboard.addMcp'), desc: '', onClick: () => navigate('/mcps') },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="p-3 text-left rounded-lg border dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-sm">{action.label}</div>
            {action.desc && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.desc}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReverseScanSummary() {
  const { t } = useTranslation();
  const [scanResult, setScanResult] = useState<{ skills: any[] } | null>(null);
  const [scanning, setScanning] = useState(false);

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await api.scanSkills();
      setScanResult(result);
    } catch {
      // scan failed silently
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('dashboard.recentScan')}</h3>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {scanning ? t('common.loading') : t('common.refresh')}
        </button>
      </div>
      {!scanResult ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.noScanYet')}</p>
      ) : (
        <div className="text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            {t('dashboard.scanSummary', {
              newCount: (scanResult.skills ?? []).filter((s: any) => s.classification === 'new').length,
              conflictCount: (scanResult.skills ?? []).filter((s: any) => s.classification === 'conflict').length,
              syncedCount: (scanResult.skills ?? []).filter((s: any) => s.classification === 'synced').length,
            })}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('dashboard.title')}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceHealthCard />
        <AgentSyncStatus />
        <QuickActions />
        <ReverseScanSummary />
      </div>
    </div>
  );
}
