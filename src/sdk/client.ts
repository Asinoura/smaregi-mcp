import {
  SmaregiPlatformSDK,
  type Environment,
  type HttpMethod,
  type JsonValue,
  type QueryParams,
} from "@asinoura/pfapi-sdk";

import { state } from "../state.js";

const DEFAULT_SCOPE = [
  "pos.stores:read",
  "pos.transactions:read",
  "pos.products:read",
  "pos.stock:read",
];

export type ConfigureSdkInput = {
  clientId: string;
  clientSecret: string;
  contractId: string;
};

export async function configureSdk(input: ConfigureSdkInput): Promise<void> {
  const sdk = new SmaregiPlatformSDK({
    contractId: input.contractId,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    environment: resolveEnvironment(),
    scope: resolveScopes(),
  });

  // Force the first token exchange now so authenticate fails immediately on bad credentials.
  await sdk.pos.stores.list({ limit: 1 });

  state.sdk = sdk;
  state.contractId = input.contractId;
  state.authenticatedAt = Date.now();
}

export function getSdk(): SmaregiPlatformSDK {
  if (!state.sdk) {
    throw new Error("未認証です。authenticateツールで認証してください。");
  }
  return state.sdk;
}

export async function requestWithSdk(input: {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: JsonValue;
}): Promise<unknown> {
  const response = await getSdk().pos.http.request<unknown>(input);
  return response.data;
}

function resolveEnvironment(): Environment {
  return process.env.SMAREGI_ENV === "production" ? "production" : "sandbox";
}

function resolveScopes(): string[] {
  const configured = process.env.SMAREGI_SCOPE?.trim();
  return configured ? configured.split(/\s+/).filter(Boolean) : DEFAULT_SCOPE;
}
