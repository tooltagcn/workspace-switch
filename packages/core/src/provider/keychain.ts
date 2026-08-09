import { platform } from 'node:os';

const SERVICE_PREFIX = 'workspace-switch';

let keytarModule: typeof import('keytar') | null = null;
let keytarLoadAttempted = false;

async function loadKeytar(): Promise<typeof import('keytar') | null> {
  if (keytarLoadAttempted) return keytarModule;

  keytarLoadAttempted = true;
  if (platform() !== 'darwin') return null;

  try {
    keytarModule = await import('keytar');
    return keytarModule;
  } catch {
    return null;
  }
}

export function isKeytarSupported(): boolean {
  return platform() === 'darwin';
}

function serviceForProvider(providerName: string): string {
  return `${SERVICE_PREFIX}:${providerName}`;
}

export async function setApiKey(providerName: string, apiKey: string): Promise<void> {
  const keytar = await loadKeytar();
  if (!keytar) {
    throw new Error('Keychain storage is not available on this platform');
  }
  await keytar.setPassword(serviceForProvider(providerName), 'api-key', apiKey);
}

export async function getApiKey(providerName: string): Promise<string | null> {
  const keytar = await loadKeytar();
  if (!keytar) {
    throw new Error('Keychain storage is not available on this platform');
  }
  return keytar.getPassword(serviceForProvider(providerName), 'api-key');
}

export async function deleteApiKey(providerName: string): Promise<boolean> {
  const keytar = await loadKeytar();
  if (!keytar) {
    throw new Error('Keychain storage is not available on this platform');
  }
  return keytar.deletePassword(serviceForProvider(providerName), 'api-key');
}

export function getServiceName(providerName: string): string {
  return serviceForProvider(providerName);
}
