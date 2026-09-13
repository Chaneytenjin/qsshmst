export const TEST_ACCOUNT_USERNAME_PATTERN = /^(?:login_test|pin_test|ui_test|test_profile|trpc_profile|no_temp)_[A-Za-z0-9._-]+$/i;
export const TEST_ACCOUNT_OPEN_ID_PATTERN = /^upsert_open_[A-Za-z0-9_-]+$/i;

export type AccountIdentityForClassification = {
  username?: string | null;
  openId?: string | null;
};

/**
 * 僅辨識由既有自動化測試命名規則建立的帳號；不以姓名或 Email 推測，避免把正式帳號誤列為測試帳號。
 */
export function isTestAccount(identity: AccountIdentityForClassification): boolean {
  return TEST_ACCOUNT_USERNAME_PATTERN.test(identity.username?.trim() ?? "")
    || TEST_ACCOUNT_OPEN_ID_PATTERN.test(identity.openId?.trim() ?? "");
}
