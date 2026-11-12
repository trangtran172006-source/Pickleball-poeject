import { env } from "./env";

/** CRC16/CCITT-FALSE for the EMVCo trailer. */
function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const tlv = (id: string, value: string) => id + value.length.toString().padStart(2, "0") + value;

/**
 * Builds a dynamic VietQR (EMVCo) payload: bank BIN + account, amount, and the
 * booking code as the transfer description. Rendered to an image by the client.
 */
export function vietQrPayload(amount: number, content: string): string {
  const acc = tlv("00", env.bank.bin) + tlv("01", env.bank.account);
  const merchant = tlv("00", "A000000727") + tlv("01", acc) + tlv("02", "QRIBFTTA");
  let s =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("38", merchant) +
    tlv("53", "704") +
    tlv("54", String(Math.round(amount))) +
    tlv("58", "VN") +
    tlv("62", tlv("08", content.slice(0, 25)));
  s += "6304";
  return s + crc16(s);
}

export function bankInfo() {
  return {
    bankName: env.bank.name,
    bankBin: env.bank.bin,
    accountNumber: env.bank.account,
    accountHolder: env.bank.holder,
  };
}
