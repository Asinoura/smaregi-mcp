import { z } from "zod";
import { DEFAULT_IDP_HOST, DEFAULT_API_HOST, DEFAULT_SCOPES } from "../constants.js";

export const ConfigSchema = z.object({
  contractId: z.string(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  idpHost: z.string().default(DEFAULT_IDP_HOST),
  apiHost: z.string().default(DEFAULT_API_HOST),
  scopes: z.array(z.string()).default(DEFAULT_SCOPES),
});

export type Config = z.infer<typeof ConfigSchema>;
/** 保存用の設定。ホストとスコープは省略でき、省略すると環境変数か既定値が使われる */
export type ConfigInput = z.input<typeof ConfigSchema>;

export const TokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  obtained_at: z.number(),
  /** どの設定（ホスト・契約・クライアント・スコープ）で取得したトークンか */
  cache_key: z.string().optional(),
});

export type Token = z.infer<typeof TokenSchema>;
