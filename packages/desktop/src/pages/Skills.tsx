import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useSkillStore, type Skill } from '../stores/skillStore.js';
import { api } from '../lib/ipc.js';
import ApplyToAgentDialog from './components/ApplyToAgentDialog.js';
import type { ApplyResource } from './components/ApplyToAgentDialog.js';
import UnapplyFromAgentDialog from './components/UnapplyFromAgentDialog.js';
import BulkActionBar from '../components/BulkActionBar.js';

function SkillDetail({ skill, onClose, onApply }: { skill: Skill; onClose: () => void; onApply: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-6 w-96">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{skill.name}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-500">{t('skill.description')}</span>
          <p className="text-sm mt-1">{skill.description ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">{t('skill.tags')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {skill.tags.length === 0 ? (
              <span className="text-sm text-gray-400">{t('common.none')}</span>
            ) : (
              skill.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{tag}</span>
              ))
            )}
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500">{t('skill.sourcePath')}</span>
          <p className="text-sm font-mono mt-1 truncate">{skill.sourcePath ?? '-'}</p>
        </div>
        <button
          onClick={onApply}
          className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
        >
          {t('skill.apply')}
        </button>
      </div>
    </div>
  );
}

function SkillAddWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { createSkill } = useSkillStore();
  const [activeTab, setActiveTab] = useState(0);
  const [localPath, setLocalPath] = useState('');
  const [archivePath, setArchivePath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const tabs = [
    { label: t('skill.addWizard.localImport'), desc: t('skill.addWizard.localImportDesc') },
    { label: t('skill.addWizard.archiveUpload'), desc: t('skill.addWizard.archiveUploadDesc') },
    { label: t('skill.addWizard.onlineSearch'), desc: t('skill.addWizard.onlineSearchDesc') },
    { label: t('skill.addWizard.manualCreate'), desc: t('skill.addWizard.manualCreateDesc') },
  ];

  const handleSubmit = async () => {
    try {
      if (activeTab === 0 && localPath) {
        await createSkill({ name: localPath.split('/').pop() ?? 'imported-skill', sourcePath: localPath });
      } else if (activeTab === 3 && manualName) {
        await createSkill({ name: manualName, description: manualDesc });
      }
      onClose();
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[560px]">
        <h3 className="text-lg font-semibold mb-4">{t('skill.addWizard.title')}</h3>
        <div className="flex border-b mb-4">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === i ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-4">{tabs[activeTab].desc}</p>
        <div className="min-h-[120px]">
          {activeTab === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('skill.addWizard.selectPath')}</label>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {activeTab === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('skill.addWizard.uploadFile')}</label>
              <input
                type="text"
                value={archivePath}
                onChange={(e) => setArchivePath(e.target.value)}
                placeholder=".zip or .tar.gz"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {activeTab === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('skill.addWizard.searchQuery')}</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {activeTab === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('skill.addWizard.skillName')}</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('skill.addWizard.skillDescription')}</label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={(activeTab === 0 && !localPath) || (activeTab === 3 && !manualName)}
          >
            {t('common.import')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagManager({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { skills, fetchSkills, addTag, removeTag } = useSkillStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchTag = async () => {
    if (!newTag) return;
    for (const id of selectedIds) {
      await addTag(id, newTag);
    }
    await fetchSkills();
    setNewTag('');
    setSelectedIds(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('skill.tagManager.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm">{t('skill.tagManager.selectedSkills', { count: selectedIds.size })}</span>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t('skill.tagManager.addTag')}
              className="flex-1 px-2 py-1 text-sm border rounded"
            />
            <button
              onClick={handleBatchTag}
              disabled={!newTag}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {t('skill.tagManager.batchTag')}
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === skills.length && skills.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(skills.map((s) => s.id)));
                      else setSelectedIds(new Set());
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-left">{t('skill.name')}</th>
                <th className="px-3 py-2 text-left">{t('skill.tags')}</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(skill.id)}
                      onChange={() => toggleSelect(skill.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">{skill.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {skill.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {tag}
                          <button
                            onClick={() => removeTag(skill.id, tag)}
                            className="hover:text-red-600"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReverseScanWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { fetchSkills } = useSkillStore();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'agents' | 'home' | 'full'>('agents');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [importError, setImportError] = useState(false);

  const runScan = async () => {
    setScanning(true);
    setScanError(false);
    setResults([]);
    try {
      const result = await api.scanSkills(mode);
      const skills = result.skills ?? [];
      setResults(skills);
      setFolders(result.folders ?? []);
      if (skills.length > 0) {
        setStep(3);
      }
    } catch {
      setScanError(true);
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError(false);
    try {
      const toImport = results.filter((_, i) => selectedIds.has(String(i)));
      await api.importScannedSkills(toImport);
      await fetchSkills();
      setImportDone(true);
    } catch {
      setImportError(true);
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (idx: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('skill.reverseScan.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded ${step >= s ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">{t(`skill.reverseScan.step${step}`)}</p>
              {(['agents', 'home', 'full'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${mode === m ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-medium">{t(`skill.reverseScan.mode${m.charAt(0).toUpperCase() + m.slice(1)}` as any)}</div>
                  <div className="text-sm text-gray-500">{t(`skill.reverseScan.mode${m.charAt(0).toUpperCase() + m.slice(1)}Desc` as any)}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">{t(`skill.reverseScan.step${step}`)}</p>
              {mode === 'home' || mode === 'full' ? (
                <div className="text-sm text-gray-600">
                  <p>Scan will discover agent config folders in your home directory.</p>
                  {folders.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {folders.map((f: any, i: number) => (
                        <li key={i} className="font-mono text-xs">{f.path}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Ready to scan agent configurations.</p>
              )}
              <button
                onClick={runScan}
                disabled={scanning}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {scanning ? t('skill.reverseScan.scanning') : t('skill.reverseScan.startScan')}
              </button>
              {scanError && (
                <p className="mt-3 text-sm text-red-600">{t('skill.reverseScan.scanError')}</p>
              )}
              {!scanning && results.length === 0 && !scanError && (
                <p className="mt-3 text-sm text-gray-500">{t('skill.reverseScan.noImportable')}</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">{t(`skill.reverseScan.step${step}`)}</p>
              {results.length === 0 ? (
                <p className="text-gray-500">{t('skill.reverseScan.noResults')}</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r: any, i: number) => {
                    if (r.classification === 'synced') return null;
                    const classColor = r.classification === 'new' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                    const classLabel = r.classification === 'new' ? t('skill.reverseScan.newFound') : t('skill.reverseScan.conflict');
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(i))}
                          onChange={() => toggleSelect(String(i))}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.agentName} - {r.sourcePath}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${classColor}`}>{classLabel}</span>
                      </div>
                    );
                  })}
                  {results.every((r: any) => r.classification === 'synced') && (
                    <p className="text-sm text-gray-500">{t('skill.reverseScan.noImportable')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">{t(`skill.reverseScan.step${step}`)}</p>
              {importDone ? (
                <div className="text-center py-8">
                  <div className="text-green-600 text-lg font-medium">{t('skill.reverseScan.importComplete')}</div>
                </div>
              ) : (
                <div>
                  <p className="text-sm mb-4">{selectedIds.size} items selected for import</p>
                  <button
                    onClick={handleImport}
                    disabled={importing || selectedIds.size === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {importing ? t('skill.reverseScan.importing') : t('skill.reverseScan.importSelected')}
                  </button>
                  {importError && (
                    <p className="mt-3 text-sm text-red-600">{t('skill.reverseScan.importError')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          {(step === 1 || step === 3) && (
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {t('common.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillDoctorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { fetchSkills } = useSkillStore();
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  useEffect(() => {
    api.checkSkillConsistency().then((r) => {
      setResult(r);
      setChecking(false);
    });
  }, []);

  const handleFixAll = async () => {
    setFixing(true);
    try {
      const r = await api.fixSkillConsistency();
      setFixResult(r);
      await fetchSkills();
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t('skill.doctor.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#x2715;</button>
        </div>

        {checking ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        ) : fixResult ? (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="text-center py-6">
              <div className="text-green-600 text-lg font-medium">{t('skill.doctor.fixComplete')}</div>
            </div>
            {fixResult.synced.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700">{t('skill.doctor.synced', { count: fixResult.synced.length })}</p>
                <p className="text-xs text-green-600 mt-1">{fixResult.synced.join(', ')}</p>
              </div>
            )}
            {fixResult.deleted.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">{t('skill.doctor.deleted', { count: fixResult.deleted.length })}</p>
                <p className="text-xs text-red-600 mt-1">{fixResult.deleted.join(', ')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4">
            <p className="text-sm text-gray-500">
              {t('skill.doctor.summary', { dirCount: result.directoryCount, dbCount: result.databaseCount })}
            </p>

            {result.consistent ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-lg font-medium">{t('skill.doctor.consistent')}</div>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm">{t('common.name')}</th>
                      <th className="px-3 py-2 text-left text-sm">{t('common.status')}</th>
                      <th className="px-3 py-2 text-left text-sm">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-sm font-medium">{item.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.location === 'directory' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.location === 'directory' ? t('skill.doctor.locationDir') : t('skill.doctor.locationDb')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.action === 'sync' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.action === 'sync' ? t('skill.doctor.actionSync') : t('skill.doctor.actionDelete')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={handleFixAll}
                  disabled={fixing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {fixing ? t('skill.doctor.fixing') : t('skill.doctor.fixAll')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Skills() {
  const { t } = useTranslation();
  const { skills, loading, fetchSkills, deleteSkill } = useSkillStore();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showReverseScan, setShowReverseScan] = useState(false);
  const [showDoctor, setShowDoctor] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt'>('name');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'tag' | 'apply' | 'unapply' | 'delete' | null>(null);
  const [bulkApplyResources, setBulkApplyResources] = useState<ApplyResource[] | null>(null);
  const [bulkUnapplyResources, setBulkUnapplyResources] = useState<ApplyResource[] | null>(null);
  const [appliedAgentsMap, setAppliedAgentsMap] = useState<Map<string, Array<{ agentId: string; agentName: string }>>>(new Map());

  const toggleBulk = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBulkAll = () => {
    if (bulkSelected.size === filtered.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleBulkAction = async (action: 'tag' | 'apply' | 'unapply' | 'delete') => {
    setBulkAction(action);
    const selected = skills.filter((s) => bulkSelected.has(s.id));
    const mapped = selected.map((s) => ({ id: s.id, name: s.name }));
    if (action === 'apply') {
      setBulkApplyResources(mapped);
    } else if (action === 'unapply') {
      setBulkUnapplyResources(mapped);
    } else {
      setShowBulkConfirm(true);
    }
  };

  const confirmBulkAction = async () => {
    if (!bulkAction) return;
    if (bulkAction === 'delete') {
      for (const id of bulkSelected) {
        await deleteSkill(id);
      }
    } else if (bulkAction === 'tag') {
      const tag = prompt('Enter tag name:');
      if (tag) {
        for (const id of bulkSelected) {
          await api.addSkillTag(id, tag);
        }
      }
    }
    await fetchSkills();
    setBulkSelected(new Set());
    setShowBulkConfirm(false);
    setBulkAction(null);
  };

  useEffect(() => {
    const loadAll = async () => {
      await fetchSkills();
    };
    loadAll();
  }, [fetchSkills]);

  useEffect(() => {
    if (skills.length === 0) return;
    const loadAppliedAgents = async () => {
      const map = new Map<string, Array<{ agentId: string; agentName: string }>>();
      for (const skill of skills) {
        try {
          const agents = await api.getAppliedAgentsForSkill(skill.id);
          map.set(skill.id, agents);
        } catch {
          map.set(skill.id, []);
        }
      }
      setAppliedAgentsMap(map);
    };
    loadAppliedAgents();
  }, [skills]);

  const allTags = Array.from(new Set(skills.flatMap((s) => s.tags)));

  const filtered = skills
    .filter((s) => !filterTag || s.tags.includes(filterTag))
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt));

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('skill.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDoctor(true)}
            className="px-4 py-2 border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50"
          >
            {t('skill.doctor.button')}
          </button>
          <button
            onClick={() => setShowReverseScan(true)}
            className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            {t('dashboard.reverseScan')}
          </button>
          <button
            onClick={() => setShowTagManager(true)}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            {t('skill.tagManager.title')}
          </button>
          <button
            onClick={() => setShowAddWizard(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('skill.addSkill')}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('common.filter')}:</span>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-1 text-sm border rounded-lg"
          >
            <option value="">{t('common.none')}</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('common.sort')}:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'updatedAt')}
            className="px-3 py-1 text-sm border rounded-lg"
          >
            <option value="name">{t('skill.name')}</option>
            <option value="updatedAt">{t('common.status')}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {filtered.length === 0 ? (
            <p className="text-gray-600">{t('common.noData')}</p>
          ) : (
            <table className="w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={bulkSelected.size === filtered.length && filtered.length > 0}
                      onChange={toggleBulkAll}
                    />
                  </th>
                  <th className="px-4 py-2 text-left">{t('skill.name')}</th>
                  <th className="px-4 py-2 text-left">{t('skill.description')}</th>
                  <th className="px-4 py-2 text-left">{t('skill.tags')}</th>
                  <th className="px-4 py-2 text-left">{t('skill.appliedAgents')}</th>
                  <th className="px-4 py-2 text-left">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((skill) => (
                  <tr
                    key={skill.id}
                    className={`border-t cursor-pointer hover:bg-gray-50 ${selectedSkill?.id === skill.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedSkill(skill)}
                  >
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(skill.id)}
                        onChange={() => toggleBulk(skill.id)}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{skill.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-[200px]">{skill.description ?? '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{tag}</span>
                        ))}
                        {skill.tags.length > 3 && <span className="text-xs text-gray-400">+{skill.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(appliedAgentsMap.get(skill.id) ?? []).slice(0, 3).map((a) => (
                          <span key={a.agentId} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{a.agentName}</span>
                        ))}
                        {(appliedAgentsMap.get(skill.id) ?? []).length > 3 && (
                          <span className="text-xs text-gray-400">+{(appliedAgentsMap.get(skill.id) ?? []).length - 3}</span>
                        )}
                        {(appliedAgentsMap.get(skill.id) ?? []).length === 0 && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t('skill.deleteConfirm'))) {
                            deleteSkill(skill.id);
                            if (selectedSkill?.id === skill.id) setSelectedSkill(null);
                          }
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedSkill && (
          <SkillDetail skill={selectedSkill} onClose={() => setSelectedSkill(null)} onApply={() => setShowApplyDialog(true)} />
        )}
      </div>

      {showAddWizard && <SkillAddWizard onClose={() => setShowAddWizard(false)} />}
      {showTagManager && <TagManager onClose={() => setShowTagManager(false)} />}
      {showReverseScan && <ReverseScanWizard onClose={() => setShowReverseScan(false)} />}
      {showDoctor && <SkillDoctorDialog onClose={() => setShowDoctor(false)} />}
      {showApplyDialog && selectedSkill && (
        <ApplyToAgentDialog
          resourceType="skill"
          resources={[{ id: selectedSkill.id, name: selectedSkill.name }]}
          onClose={() => setShowApplyDialog(false)}
        />
      )}

      {bulkApplyResources && (
        <ApplyToAgentDialog
          resourceType="skill"
          resources={bulkApplyResources}
          onClose={() => {
            setBulkApplyResources(null);
            setBulkAction(null);
            setBulkSelected(new Set());
            fetchSkills();
          }}
        />
      )}

      {bulkUnapplyResources && (
        <UnapplyFromAgentDialog
          resources={bulkUnapplyResources}
          onClose={() => {
            setBulkUnapplyResources(null);
            setBulkAction(null);
            setBulkSelected(new Set());
            fetchSkills();
          }}
        />
      )}

      <BulkActionBar
        selectedCount={bulkSelected.size}
        onTag={() => handleBulkAction('tag')}
        onApply={() => handleBulkAction('apply')}
        onUnapply={() => handleBulkAction('unapply')}
        onDelete={() => handleBulkAction('delete')}
      />

      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">{t('bulk.confirmAction')}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {bulkAction === 'delete'
                ? t('bulk.confirmDelete', { count: bulkSelected.size })
                : `${bulkAction} ${bulkSelected.size} items?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmBulkAction}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
