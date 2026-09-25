export type Profile = {
    name: string;
    phoneNumber: string;
    isBusiness: boolean;
    abn: string;
    driverLicense?: UploadedFile;
    publicLiabilityInsurance?: UploadedFile;
    businessRegistration?: UploadedFile;
    credibilityScore: number;
}
export type UploadedFile = {
    name: string;
    type: string;
    size: number;
    data: string;
};