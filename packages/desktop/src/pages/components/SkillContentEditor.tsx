import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useSkillStore, type Skill } from '../../stores/skillStore.js';
import SkillCodeEditor from './SkillCodeEditor.js';

export default function SkillContentEditor({
  skill,
  onClose,
}: {
  skill: Skill;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { getSkillContent, saveSkillContent } = useSkillStore();
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getSkillContent(skill.id)
      .then((result) => {
        if (!result) {
          setLoadError(t('skill.editor.loadError'));
          return;
        }
        setPath(result.path);
        setContent(result.content);
        setInitialContent(result.content);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [skill.id, getSkillContent, t]);

  const dirty = content !== initialContent;

  const handleClose = () => {
    if (dirty && !window.confirm(t('skill.editor.unsavedConfirm'))) return;
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    setSaved(false);
    try {
      const result = await saveSkillContent(skill.id, content);
      if (!result.saved) {
        setErrors(result.validation?.errors ?? [t('skill.editor.saveFailed')]);
        return;
      }
      setSaved(true);
      setInitialContent(content);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[864px] max-w-[90vw] h-[96vh] flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{t('skill.editor.title', { name: skill.name })}</h3>
          <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            ✕
          </button>
        </div>
        {path && (
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate mb-2">
            {t('skill.editor.filePath')}: {path}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('skill.editor.hint')}</p>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <SkillCodeEditor
                value={content}
                onChange={(val) => {
                  setContent(val);
                  setSaved(false);
                }}
              />
            </div>
            {errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {t('skill.editor.validationFailed')}
                </p>
                <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {saved && errors.length === 0 && (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                {t('skill.editor.saveSuccess')}
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !!loadError}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? t('skill.editor.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
