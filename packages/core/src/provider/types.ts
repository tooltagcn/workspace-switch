export interface Provider {
  id: string;
  name: string;
  baseUrl: string | null;
  apiKeyRef: string | null;
  defaultModel: string | null;
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderInput {
  id?: string;
  name: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  models?: string[];
}

export interface UpdateProviderInput {
  name?: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  models?: string[];
}

export interface ProviderListFilter {
  name?: string;
}
