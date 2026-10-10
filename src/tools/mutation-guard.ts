/** 運用者が変更系API（POST/PUT/PATCH/DELETE）を明示的に有効にしたか */
export function mutationsEnabled(): boolean {
  return process.env.SMAREGI_ENABLE_MUTATIONS === "true";
}

export function assertMutationsEnabled(confirm: true): void {
  if (confirm !== true || !mutationsEnabled()) {
    throw new Error(
      "変更系APIは無効です。運用者が SMAREGI_ENABLE_MUTATIONS=true を設定し、confirm=true を明示してください。"
    );
  }
}
