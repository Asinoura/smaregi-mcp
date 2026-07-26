export function assertMutationsEnabled(confirm: true): void {
  if (confirm !== true || process.env.SMAREGI_ENABLE_MUTATIONS !== "true") {
    throw new Error(
      "変更系APIは無効です。運用者が SMAREGI_ENABLE_MUTATIONS=true を設定し、confirm=true を明示してください。"
    );
  }
}
