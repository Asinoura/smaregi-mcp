# smaregi-mcp

スマレジ Platform API の MCPサーバー。

## 設計方針
- P2（遅延ロード）+ 構造的バリデーション方式
- ツールは最小限（search_tools + execute + 認証系4個）
- ドメイン知識は search_tools で自動注入される（AIがスキップ不可能）
- パラメータは Zod スキーマで検証（不正パラメータはエラー）

## コマンド
- `pnpm build` — ビルド
- `pnpm test` — テスト実行
- `pnpm dev` — 開発モード

## ルール
- APIキーやシークレットをコードにハードコードしない
- トークンは ~/.config/smaregi-mcp/tokens.json に保存
- ドメイン知識は skills/smaregi-api-skill/domain/*.md に記述
- 変更内容は何をなぜ変えたか日本語で説明する
