export const DOCUMENT_TYPES = ["driverLicense", "publicLiabilityInsurance", "businessRegistration"] as const;
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

export function inspectDocument(input: { documentType?: unknown; fileName?: unknown; mimeType?: unknown; fileData?: unknown }) {
  const { documentType, fileName, mimeType, fileData } = input;
  if (!DOCUMENT_TYPES.includes(documentType as typeof DOCUMENT_TYPES[number])) throw new Error("Invalid document type");
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 255 || /[\x00-\x1f\x7f/\\]/.test(fileName)) {
    throw new Error("Invalid file name");
  }
  const jpeg = documentType === "driverLicense";
  const expectedMime = jpeg ? "image/jpeg" : "application/pdf";
  if (mimeType !== expectedMime || !(jpeg ? /\.jpe?g$/i : /\.pdf$/i).test(fileName)) {
    throw new Error(jpeg ? "Driver's license must be a JPG file" : "This file must be a PDF");
  }
  if (typeof fileData !== "string" || fileData.length > Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4 + 100) {
    throw new Error("File size must be between 1 byte and 2MB");
  }
  const prefix = `data:${expectedMime};base64,`;
  const encoded = fileData.startsWith(prefix) ? fileData.slice(prefix.length) : fileData;
  if (!encoded || encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(encoded)) {
    throw new Error("File contents must be valid Base64 for the supported file type");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded || !bytes.length || bytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error("File size must be between 1 byte and 2MB");
  }
  const valid = jpeg
    ? bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]))
    : /^%PDF-(1\.[0-7]|2\.0)[\r\n]/.test(bytes.subarray(0, 10).toString("ascii")) && /%%EOF\s*$/.test(bytes.subarray(-1024).toString("ascii"));
  if (!valid) throw new Error("File contents do not match the supported document type");
  // Signature checks reject obvious spoofing; they are not malware or identity verification.
  return { documentType: documentType as string, fileName: fileName.trim(), mimeType: expectedMime, fileData: prefix + encoded, bytes };
}
