export interface AppState {
  contractId: string | null;
  activeStoreId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  clientId: string | null;
  clientSecret: string | null;
}

export const state: AppState = {
  contractId: null,
  activeStoreId: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  clientId: null,
  clientSecret: null,
};
