/** 96 x 96 PNG product mark, base64. */
export const LOGO_PNG_96_BASE64: string;
/** 128 x 128 JPEG product mark, base64, for the PDF DCTDecode XObject. */
export const LOGO_JPEG_128_BASE64: string;
/** Ready-to-use data URI for the printable HTML report. */
export const LOGO_PNG_96_DATA_URI: string;
/** Decode base64 to bytes without atob or Buffer. */
export function decodeBase64(value: string): Uint8Array;
/** The PDF header logo as JPEG bytes. */
export function logoJpegBytes(): Uint8Array;
