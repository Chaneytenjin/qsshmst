export type PasswordStrength = {
  score: number;
  level: "empty" | "weak" | "medium" | "strong";
  label: "尚未輸入" | "弱" | "中" | "強";
  validByPolicy: boolean;
  suggestions: string[];
};

export function assessPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, level: "empty", label: "尚未輸入", validByPolicy: false, suggestions: ["請輸入新密碼"] };
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isLongEnough = password.length >= 6;
  const isLonger = password.length >= 10;
  const score = Number(isLongEnough) + Number(isLonger) + Number(hasLower && hasUpper) + Number(hasNumber) + Number(hasSymbol);
  const validByPolicy = isLongEnough && (hasLower || hasUpper);
  const level = score >= 4 ? "strong" : score >= 2 ? "medium" : "weak";
  const suggestions: string[] = [];
  if (!isLongEnough) suggestions.push("至少使用 6 個字元");
  if (!hasLower && !hasUpper) suggestions.push("加入英文大小寫字母");
  if (!hasNumber) suggestions.push("加入數字可提高強度");
  if (!hasSymbol) suggestions.push("加入符號可提高強度");
  if (password.length < 10) suggestions.push("使用 10 個以上字元會更安全");
  return { score, level, label: level === "strong" ? "強" : level === "medium" ? "中" : "弱", validByPolicy, suggestions };
}
