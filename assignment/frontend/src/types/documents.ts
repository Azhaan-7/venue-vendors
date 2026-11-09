type DocumentType = "driverLicense" | "publicLiabilityInsurance" | "businessRegistration";
export interface DocumentMetadata {
  id: number;
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
}
export interface DocumentUpload {
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  fileData: string;
}
