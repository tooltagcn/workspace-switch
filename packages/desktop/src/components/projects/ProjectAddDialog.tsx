import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProjectAddDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { createProject } = useProjectStore();
  const [projectPath, setProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!projectPath.trim()) {
      setError(t('project.pathRequired'));
      return;
    }
    try {
      await createProject({ path: projectPath.trim(), name: projectName.trim() || undefined });
      setProjectPath('');
      setProjectName('');
      setError('');
      onClose();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{t('project.addProject')}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('project.path')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/project"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.name')} <span className="text-gray-400">({t('project.nameOptional')})</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Project"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('project.addProject')}
          </button>
        </div>
      </div>
    </div>
  );
}
