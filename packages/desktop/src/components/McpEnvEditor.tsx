import { useTranslation } from 'react-i18next';

const ENV_REF_PREFIX = 'env:';

export interface EnvVarRow {
  key: string;
  value: string;
  secret: boolean;
}

/** Secret-backed rows come back from the store as an `env:VAR` reference with no value. */
export function rowsFromEnv(env: Record<string, string>): EnvVarRow[] {
  return Object.entries(env).map(([key, value]) =>
    value.startsWith(ENV_REF_PREFIX)
      ? { key, value: '', secret: true }
      : { key, value, secret: false },
  );
}

/**
 * Splits editor rows into plain env values and values that must be written to the
 * secret store. Secret rows whose value is untouched keep their existing reference
 * instead of creating a dangling `env:VAR` with nothing stored behind it.
 */
export function buildEnvPayload(
  rows: EnvVarRow[],
  previous: Record<string, string> = {},
): { env: Record<string, string>; secretEnv: Record<string, string> } {
  const env: Record<string, string> = {};
  const secretEnv: Record<string, string> = {};

  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;

    if (row.secret) {
      const hadRef = (previous[key] ?? '').startsWith(ENV_REF_PREFIX);
      if (!row.value && !hadRef) continue;
      env[key] = `${ENV_REF_PREFIX}${key}`;
      if (row.value) secretEnv[key] = row.value;
    } else {
      env[key] = row.value;
    }
  }

  return { env, secretEnv };
}

export function isEnvRef(value: string): boolean {
  return value.startsWith(ENV_REF_PREFIX);
}

export default function McpEnvEditor({
  rows,
  onChange,
}: {
  rows: EnvVarRow[];
  onChange: (rows: EnvVarRow[]) => void;
}) {
  const { t } = useTranslation();

  const patchRow = (index: number, patch: Partial<EnvVarRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {t('mcp.envVars')}
        </label>
        <button
          type="button"
          onClick={() => onChange([...rows, { key: '', value: '', secret: false }])}
          className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600"
        >
          + {t('mcp.addEnvVar')}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('mcp.noEnvVars')}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={row.key}
                onChange={(e) => patchRow(index, { key: e.target.value })}
                placeholder={t('mcp.envKey')}
                className="w-2/5 px-2 py-1.5 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
              <input
                type={row.secret ? 'password' : 'text'}
                value={row.value}
                onChange={(e) => patchRow(index, { value: e.target.value })}
                placeholder={row.secret && !row.value ? t('mcp.masked') : t('mcp.envValue')}
                className="flex-1 px-2 py-1.5 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
              <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0" title={t('mcp.secretEnvVar')}>
                <input
                  type="checkbox"
                  checked={row.secret}
                  onChange={(e) => patchRow(index, { secret: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {t('mcp.envSecret')}
              </label>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-500"
                title={t('mcp.removeEnvVar')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('mcp.envVarsHint')}</p>
    </div>
  );
}
