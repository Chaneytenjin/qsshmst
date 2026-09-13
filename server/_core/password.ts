import bcryptjs from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * 生成密碼雜湊
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * 驗證密碼是否正確
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * 生成臨時密碼（8 位英數混合）
 */
export function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * 驗證密碼複雜度（至少 6 字元，包含大小寫或數字）
 */
export function validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: "密碼至少需要 6 個字元" };
  }
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase && !hasLowerCase) {
    return { valid: false, message: "密碼需要包含英文字母" };
  }
  if (!hasNumber && !hasUpperCase && !hasLowerCase) {
    return { valid: false, message: "密碼需要包含英文或數字" };
  }
  return { valid: true };
}
