export type EquipmentCode = {
  id: number;
  qrCodeId: string | null;
};

export const USER_QR_CODE_PREFIX = "QSSH-USER:";

export function buildUserQrCodeValue(userId: number): string {
  return `${USER_QR_CODE_PREFIX}${userId}`;
}

function normalizeCodeValue(value: string): string {
  return value.trim().replace(/[\u200B-\u200D\uFEFF]/g, "").toUpperCase();
}

export function findEquipmentByCodeId<T extends EquipmentCode>(
  equipmentList: readonly T[] | undefined,
  codeValue: string,
): T | undefined {
  const normalizedCodeValue = normalizeCodeValue(codeValue);
  return equipmentList?.find((equipment) => normalizeCodeValue(equipment.qrCodeId || "") === normalizedCodeValue);
}

/** @deprecated QR 與 Barcode 均使用同一器材識別碼，請改用 findEquipmentByCodeId */
export const findEquipmentByQrCodeId = findEquipmentByCodeId;

export function parseBorrowerId(value: string): number | null {
  const normalizedValue = normalizeCodeValue(value);
  const userQrMatch = normalizedValue.match(/^QSSH-USER:(\d+)$/);
  const parsedFromUserQr = userQrMatch?.[1] ?? normalizedValue;
  if (!/^\d+$/.test(parsedFromUserQr)) return null;

  const parsedValue = Number(parsedFromUserQr);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}
