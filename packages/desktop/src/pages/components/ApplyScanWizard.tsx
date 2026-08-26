import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../../lib/ipc.js';
import { useSkillStore } from '../../stores/skillStore.js';

type CellState = 'applied' | 'missing' | 'orphan' | 'conflict' | 'notApplied';

interface ScanCell {
  agentId: string;
  state: CellState;
  targetPath: string;
  symlinkTarget: string | null;
}

interface ScanRow {
  skillId: string;
  skillName: string;
  hasSource: boolean;
  cells: ScanCell[];
}

interface ScanResult {
  agents: Array<{ agentId: string; agentName: string }>;
  rows: ScanRow[];
  counts: Record<CellState, number>;
}

const STATE_COLOR: Record<CellState, string> = {
  applied: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  missing: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  orphan: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  conflict: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  notApplied: 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400',
};

const RESYNC_STATES: CellState[] = ['missing', 'orphan', 'conflict'];

export default function ApplyScanWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { fetchSkills } = useSkillStore();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncDone, setResyncDone] = useState(0);
  const [resyncError, setResyncError] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setScanError(false);
    try {
      const r = (await api.scanSkillApplyStatus()) as ScanResult;
      setResult(r);
    } catch {
      setScanError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const resyncCell = async (skillId: string, agentId: string) => {
    setResyncing(true);
    setResyncError(false);
    try {
      await api.applySkill(skillId, agentId);
      await runScan();
      await fetchSkills();
    } catch {
      setResyncError(true);
    } finally {
      setResyncing(false);
    }
  };

  const resyncAllDrift = async () => {
    if (!result) return;
    setResyncing(true);
    setResyncError(false);
    let done = 0;
    try {
      for (const row of result.rows) {
        for (let i = 0; i < row.cells.length; i++) {
          const cell = row.cells[i];
          if (RESYNC_STATES.includes(cell.state)) {
            await api.applySkill(row.skillId, cell.agentId);
            done++;
          }
        }
      }
      setResyncDone(done);
      await runScan();
      await fetchSkills();
    } catch {
      setResyncError(true);
    } finally {
      setResyncing(false);
    }
  };

  const driftCount = result
    ? result.counts.missing + result.counts.orphan + result.counts.conflict
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[820px] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('skill.applyScan.title')}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">&#x2715;</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('skill.applyScan.scanning')}</p>
          </div>
        ) : scanError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">{t('skill.applyScan.scanError')}</p>
            <button onClick={runScan} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              {t('skill.applyScan.startScan')}
            </button>
          </div>
        ) : !result || result.agents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('skill.applyScan.noAgents')}</p>
          </div>
        ) : result.rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('skill.applyScan.noSkills')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('skill.applyScan.intro')}</p>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${STATE_COLOR.applied}`}>{t('skill.applyScan.stateApplied')}: {result.counts.applied}</span>
              <span className={`px-2 py-0.5 rounded ${STATE_COLOR.missing}`}>{t('skill.applyScan.stateMissing')}: {result.counts.missing}</span>
              <span className={`px-2 py-0.5 rounded ${STATE_COLOR.orphan}`}>{t('skill.applyScan.stateOrphan')}: {result.counts.orphan}</span>
              <span className={`px-2 py-0.5 rounded ${STATE_COLOR.conflict}`}>{t('skill.applyScan.stateConflict')}: {result.counts.conflict}</span>
              <span className={`px-2 py-0.5 rounded ${STATE_COLOR.notApplied}`}>{t('skill.applyScan.stateNotApplied')}: {result.counts.notApplied}</span>
            </div>

            {resyncDone > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400">{t('skill.applyScan.resyncDone', { count: resyncDone })}</p>
            )}
            {resyncError && (
              <p className="text-sm text-red-600 dark:text-red-400">{t('skill.applyScan.resyncError')}</p>
            )}

            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium min-w-[140px]">{t('skill.name')}</th>
                    {result.agents.map((a) => (
                      <th key={a.agentId} className="px-2 py-2 text-center font-medium whitespace-nowrap">{a.agentName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.skillId} className="border-t dark:border-gray-700">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{row.skillName}</td>
                      {row.cells.map((cell) => (
                        <td key={cell.agentId} className="px-2 py-2 text-center">
                          {RESYNC_STATES.includes(cell.state) ? (
                            <button
                              onClick={() => resyncCell(row.skillId, cell.agentId)}
                              disabled={resyncing}
                              title={cell.targetPath}
                              className={`px-1.5 py-0.5 rounded text-xs ${STATE_COLOR[cell.state]} hover:opacity-80 disabled:opacity-50`}
                            >
                              {cell.state === 'missing' ? t('skill.applyScan.stateMissing') : cell.state === 'orphan' ? t('skill.applyScan.stateOrphan') : t('skill.applyScan.stateConflict')}
                            </button>
                          ) : (
                            <span title={cell.targetPath} className={`inline-block px-1.5 py-0.5 rounded text-xs ${STATE_COLOR[cell.state]}`}>
                              {cell.state === 'applied' ? '✓' : '·'}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {driftCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={resyncAllDrift}
                  disabled={resyncing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {resyncing ? t('skill.applyScan.resyncing') : t('skill.applyScan.resyncAll')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
