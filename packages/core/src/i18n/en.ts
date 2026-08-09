export const en = {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
  provider: {
    notFound: 'Provider not found: {{id}}',
    alreadyExists: 'Provider already exists: {{name}}',
    apiKeyNotAvailable: 'Keychain storage is not available on this platform',
    applied: 'Provider "{{name}}" applied to agent',
    currentProvider: 'Current provider: {{name}}',
  },
  workspace: {
    initialized: 'Workspace initialized at {{path}}',
    integrityOk: 'Workspace integrity check passed',
    integrityFailed: 'Workspace integrity check failed: {{reason}}',
    missingDir: 'Missing required directory: {{dir}}',
    dbNotReadable: 'Database is not readable',
  },
  sync: {
    symlinkCreated: 'Symlink created: {{from}} -> {{to}}',
    symlinkRemoved: 'Symlink removed: {{path}}',
    brokenSymlinksFound: 'Found {{count}} broken symlink(s)',
    unsupportedPlatform: 'Unsupported platform: {{platform}}',
  },
  tag: {
    alreadyExists: 'Tag already exists: {{name}}',
    nameInUse: 'Tag name already in use: {{name}}',
    merged: 'Tag "{{source}}" merged into "{{target}}"',
  },
  search: {
    noResults: 'No results found for "{{query}}"',
  },
  plugin: {
    loaded: 'Loaded {{count}} plugin(s)',
    incompatible: 'Plugin "{{name}}" is incompatible (apiVersion {{version}})',
  },
};

export type TranslationKeys = typeof en;
