import type { SmaregiPlatformSDK } from "@asinoura/pfapi-sdk";

export interface AppState {
  contractId: string | null;
  activeStoreId: string | null;
  sdk: SmaregiPlatformSDK | null;
  authenticatedAt: number | null;
}

export const state: AppState = {
  contractId: null,
  activeStoreId: null,
  sdk: null,
  authenticatedAt: null,
};
