import React, { useState, useRef, useEffect } from "react";
import { Box, VStack, FormControl, FormLabel, Input, Button, Heading, FormErrorMessage, Checkbox, Text, HStack, Badge } from "@chakra-ui/react";
import { Profile, UploadedFile } from "../types/profiles";
import { useToast } from "@chakra-ui/react";
import { validateProfile } from "@/types/profileValidation";
import { hirerDocumentApi } from "@/services/api";

type ProfileFormProps = {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    saveProfile: (updatedProfile: Profile) => void;
    email: string;
    userId: number;
};

// Profile form for hirers.
// This component allows the user to update profile details,
// upload user documents, apply as a business, and view calculated credibility score.
export function ProfileForm({ profile, setProfile, saveProfile, email, userId }: ProfileFormProps) {
    const toast = useToast();
    // File input refs are used to clear the selected filename properly
    // when an uploaded file is removed from the form
    const driverLicenseRef = useRef<HTMLInputElement | null>(null);
    const insuranceRef = useRef<HTMLInputElement | null>(null);
    const businessRegistrationRef = useRef<HTMLInputElement | null>(null);
    const [errors, setErrors] = useState<{
        name?: string;
        phone?: string;
        abn?: string;
        driverLicense?: string;
        publicLiabilityInsurance?: string;
        businessRegistration?: string;
    }>({});
    type DocumentType = "driverLicense" | "publicLiabilityInsurance" | "businessRegistration";
    const [removedDocuments, setRemovedDocuments] = useState<DocumentType[]>([]);
    // Credibility score is based on how many compliant documents are uploaded
    // Driver's license and insurance contribute for all hirers,
    // but business registration only contributes for business applications
    // The final score is scaled to a value out of 5
    function calculateCredibilityScore(updatedProfile: Profile): number {
        let score = 0;

        if (updatedProfile.driverLicense) {
            score++;
        }

        if (updatedProfile.publicLiabilityInsurance) {
            score++;
        }

        if (updatedProfile.isBusiness && updatedProfile.businessRegistration) {
            score++;
        }

        const maxUploads = updatedProfile.isBusiness ? 3 : 2;
        const totalScore = (score / maxUploads) * 5;

        return Number(totalScore.toFixed(1));
    }


    type HirerDocument = {
        id: number;
        documentType: DocumentType;
        fileName: string;
        mimeType: string;
        fileData: string;
    };

    useEffect(() => {
        async function loadDocuments() {
            const documents = await hirerDocumentApi.getDocuments(userId);

            setProfile((prev) => {
                const updatedProfile: Profile = { ...prev };

                documents.forEach((doc: HirerDocument) => {
                    const documentType: DocumentType = doc.documentType;

                    updatedProfile[documentType] = {
                        name: doc.fileName,
                        type: doc.mimeType,
                        size: 0,
                        data: doc.fileData,
                    };
                });

                updatedProfile.credibilityScore = calculateCredibilityScore(updatedProfile);

                return updatedProfile;
            });
        }

        if (userId) {
            loadDocuments();
        }
    }, [userId, setProfile]);

    function fileUpload(
        e: React.ChangeEvent<HTMLInputElement>,
        field: "driverLicense" | "publicLiabilityInsurance" | "businessRegistration"
    ) {
        // Read the first selected file from the input element
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) {
            return;
        }
        let fileError = "";
        //User story specifies that all file uploads must be under 2MB
        if (selectedFile.size > 2 * 1024 * 1024) {
            fileError = "File size can't exceed 2MB";

        }
        if (field === "driverLicense") {
            const isJpg =
                // Driver license has to be JPG or JPEG image
                selectedFile.type === "image/jpeg" ||
                selectedFile.name.toLowerCase().endsWith(".jpg") ||
                selectedFile.name.toLowerCase().endsWith(".jpeg");
            if (!isJpg) {
                fileError = "Driver's license must be a JPG file";
            }
        }
        if (field === "publicLiabilityInsurance" || field === "businessRegistration") {
            const isPdf =
                // Insurance and business registration documents must be uploaded as PDF.
                selectedFile.type === "application/pdf" ||
                selectedFile.name.toLowerCase().endsWith(".pdf");

            if (!isPdf) {
                fileError = "This file must be a PDF";
            }
        }

        // Stop processing if file validation fails and show the relevant error
        if (fileError !== "") {
            setErrors((prev) => ({
                ...prev,
                [field]: fileError,
            }));
            return;
        }
        const reader = new FileReader();

        // Once the file is read, save its details and content in a format
        // that can be stored in localStorage as part of the profile.
        reader.onload = async () => {
            const uploadedFile: UploadedFile = {
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                data: reader.result as string,
            };

            const updatedProfile: Profile = {
                ...profile,
                [field]: uploadedFile,
            };

            updatedProfile.credibilityScore = calculateCredibilityScore(updatedProfile);

            setRemovedDocuments((prev) => prev.filter((documentType) => documentType !== field));

            setProfile(updatedProfile);

            setErrors((prev) => ({
                ...prev,
                [field]: undefined,
            }));
        };

        reader.readAsDataURL(selectedFile);
    }
    //Removing uploaded file and recalculating the credibility score
    function removeFile(field: "driverLicense" | "publicLiabilityInsurance" | "businessRegistration") {
        const updatedProfile = {
            ...profile,
            [field]: undefined,
        } as Profile;

        updatedProfile.credibilityScore = calculateCredibilityScore(updatedProfile);
        setProfile(updatedProfile);

        setRemovedDocuments((prev) => {
            if (prev.includes(field)) {
                return prev;
            }

            return [...prev, field];
        });

        if (field === "driverLicense" && driverLicenseRef.current) {
            driverLicenseRef.current.value = "";
        }

        if (field === "publicLiabilityInsurance" && insuranceRef.current) {
            insuranceRef.current.value = "";
        }

        if (field === "businessRegistration" && businessRegistrationRef.current) {
            businessRegistrationRef.current.value = "";
        }
    }
    async function saveProfileWithDocuments() {
        const validationErrors = validateProfile(profile);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            return;
        }
        try {
            for (const documentType of removedDocuments) {
                await hirerDocumentApi.deleteDocument(userId, documentType);
            }
            const documentFields: DocumentType[] = [
                "driverLicense",
                "publicLiabilityInsurance",
                "businessRegistration",
            ];
            for (const documentType of documentFields) {
                const document = profile[documentType];

                if (document) {
                    await hirerDocumentApi.uploadDocument(userId, {
                        documentType: documentType,
                        fileName: document.name,
                        mimeType: document.type,
                        fileData: document.data,
                    });
                }
            }
            saveProfile(profile);
            setRemovedDocuments([]);
            toast({
                title: "Profile saved.",
                description: "Your profile has been updated successfully.",
                status: "success",
                duration: 2500,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Profile could not be saved.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    }
    return (
        <Box p={6} borderWidth="1px" borderRadius="lg">
            <Heading size={"md"} mb={4}>Your Profile</Heading>
            <VStack spacing={4}>
                <FormControl isInvalid={!!errors.name}>
                    <FormLabel>Name</FormLabel>
                    <Input
                        value={profile.name}
                        onChange={(e) => {
                            setProfile({ ...profile, name: e.target.value });
                            if (errors.name) {
                                setErrors({ ...errors, name: undefined });
                            }
                        }}
                    />
                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>
                <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input
                        value={email}
                        isReadOnly
                        isDisabled
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>Password</FormLabel>
                    <Input value="••••••••" isReadOnly isDisabled />
                    {/* • looks better than * */}
                </FormControl>
                <FormControl isInvalid={!!errors.phone}>
                    <FormLabel>Phone</FormLabel>
                    <Input
                        value={profile.phoneNumber}
                        onChange={(e) => {
                            setProfile({ ...profile, phoneNumber: e.target.value });
                            if (errors.phone) {
                                setErrors({ ...errors, phone: undefined });
                            }
                        }}
                    />
                    <FormErrorMessage>{errors.phone}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.driverLicense}>
                    <FormLabel>Driver's License (JPG)</FormLabel>
                    <Input
                        ref={driverLicenseRef}
                        type="file"
                        accept=".jpg,.jpeg,image/jpeg"
                        onChange={(e) => fileUpload(e, "driverLicense")}
                        p={1}
                    />
                    {profile.driverLicense && (
                        <>
                            <Text fontSize="sm" color="green.600">
                                Uploaded: {profile.driverLicense.name}
                            </Text>
                            <Button size="xs" onClick={() => removeFile("driverLicense")}>
                                Remove File
                            </Button>
                        </>
                    )}
                    <FormErrorMessage>{errors.driverLicense}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.publicLiabilityInsurance}>
                    <FormLabel>Public Liability Insurance (PDF, optional)</FormLabel>
                    <Input
                        ref={insuranceRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => fileUpload(e, "publicLiabilityInsurance")}
                        p={1}
                    />
                    {profile.publicLiabilityInsurance && (
                        <>
                            <Text fontSize="sm" color="green.600">
                                Uploaded: {profile.publicLiabilityInsurance.name}
                            </Text>
                            <Button size="xs" onClick={() => removeFile("publicLiabilityInsurance")}>
                                Remove File
                            </Button>
                        </>
                    )}
                    <FormErrorMessage>{errors.publicLiabilityInsurance}</FormErrorMessage>
                </FormControl>
                <FormControl>
                    <Checkbox
                        isChecked={profile.isBusiness}
                        onChange={(e) => {
                            const checked = e.target.checked;

                            const updatedProfile: Profile = {
                                ...profile,
                                isBusiness: checked,
                                abn: checked ? profile.abn : "",
                                businessRegistration: checked ? profile.businessRegistration : undefined,
                            };

                            updatedProfile.credibilityScore = calculateCredibilityScore(updatedProfile);
                            setProfile(updatedProfile);

                            if (!checked) {
                                setErrors((prev) => ({
                                    ...prev,
                                    abn: undefined,
                                    businessRegistration: undefined,
                                }));
                            }
                        }}
                    >
                        Applying as a Business / Corporation
                    </Checkbox>
                </FormControl>
                {profile.isBusiness && (
                    <>
                        <FormControl isInvalid={!!errors.abn}>
                            <FormLabel>ABN</FormLabel>
                            <Input
                                value={profile.abn}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "");
                                    setProfile({ ...profile, abn: value });

                                    if (errors.abn) {
                                        setErrors({ ...errors, abn: undefined });
                                    }
                                }}
                            />
                            <FormErrorMessage>{errors.abn}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.businessRegistration}>
                            <FormLabel>Business Registration (PDF)</FormLabel>
                            <Input
                                ref={businessRegistrationRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={(e) => fileUpload(e, "businessRegistration")}
                                p={1}
                            />
                            {profile.businessRegistration && (
                                <>
                                    <Text fontSize="sm" color="green.600">
                                        Uploaded: {profile.businessRegistration.name}
                                    </Text>
                                    <Button size="xs" onClick={() => removeFile("businessRegistration")}>
                                        Remove File
                                    </Button>
                                </>
                            )}
                            <FormErrorMessage>{errors.businessRegistration}</FormErrorMessage>
                        </FormControl>
                    </>
                )}
                <HStack alignSelf="flex-start">
                    <Text fontWeight="semibold">Credibility Score:</Text>
                    <Badge colorScheme="purple" fontSize="0.9em" px={2} py={1}>
                        {profile.credibilityScore} / 5
                    </Badge>
                </HStack>
                <Button
                    colorScheme="blue"
                    onClick={saveProfileWithDocuments}
                >
                    Save Profile
                </Button>
            </VStack>
        </Box >
    );
}