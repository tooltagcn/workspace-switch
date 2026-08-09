import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore.js';

export default function ProjectList() {
  const { t } = useTranslation();
  const { projects, loading, fetchProjects, selectProject, deleteProject, selectedProject } = useProjectStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects(search || undefined);
  }, [search, fetchProjects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder={t('project.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('project.noProjects')}</div>
      ) : (
        <table className="w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">{t('common.name')}</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">{t('project.path')}</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className={`border-b cursor-pointer hover:bg-gray-50 ${
                  selectedProject?.id === project.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => selectProject(project.id)}
              >
                <td className="px-4 py-3 font-medium">{project.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{project.path}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t('project.deleteConfirm', { name: project.name }))) {
                        deleteProject(project.id);
                      }
                    }}
                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
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
  );
}
