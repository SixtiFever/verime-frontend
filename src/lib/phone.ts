export function isValidUkPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("44")) return digits.length === 12 && digits[2] === "7";
  if (digits.startsWith("0")) return digits.length === 11 && digits[1] === "7";
  return false;
}
