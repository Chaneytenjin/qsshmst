export const loginUsernamePattern = /^[A-Za-z0-9]+$/;
export const loginPasswordPattern = /^[\x21-\x7E]+$/;
export const legacyUsernamePattern = /^[A-Za-z0-9._-]+$/;

export function sanitizeLoginUsername(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "");
}

export function sanitizeLoginPassword(value: string) {
  return value.replace(/[^\x21-\x7E]/g, "");
}

export function isValidLoginUsername(value: string) {
  return loginUsernamePattern.test(value);
}

export function isLegacyUsername(value: string) {
  return legacyUsernamePattern.test(value);
}

export function isValidLoginPassword(value: string) {
  return loginPasswordPattern.test(value);
}
