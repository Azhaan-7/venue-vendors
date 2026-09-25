//Validation errors are tied to field names, 
//so they can precisely inform the user of what they have to change
import { Profile } from "../types/profiles";

export type ProfileValidationErrors = {
    name?: string;
    phone?: string;
    abn?: string;
};
// Validate hirer profile fields before saving or submitting an application.
// Rules:
// 1) Name is required.
// 2) Phone number is required.
// 3) Phone number may contain digits, spaces, and + only.
// 4) Phone number must be between 8 and 12 characters after spaces are removed.
// 5) ABN is required only when applying as a business.
// 6) ABN must contain numbers only.
// 7) ABN must be exactly 11 digits.
// Compliant documents are not mandatory for submission.
// Instead, missing documents reduce the credibility score, which can be 0/5.


// File-specific validation (e.g, file type and size) is handled separately in ProfileForm.tsx during upload
// since it requires access to the File object.
export function validateProfile(profile: Profile): ProfileValidationErrors {
    const errors: ProfileValidationErrors = {};

    if (profile.name.trim() === "") {
        errors.name = "Name is required";
    }

    const phone = profile.phoneNumber.trim();

    if (phone === "") {
        errors.phone = "Phone number is required";
    } else if (!/^[+\d\s]+$/.test(phone)) {
        // Regex ensures only digits, spaces, and + are allowed
        errors.phone = "Phone number can only contain digits, spaces, and +";
        // phone.replace(/\s/g, "").length removes all whitespaces in string and returns length
    } else if (phone.replace(/\s/g, "").length < 8) {
        errors.phone = "Phone number is too short";
    } else if (phone.replace(/\s/g, "").length > 12) {
        errors.phone = "Phone number is too long";
    }

    if (profile.isBusiness) {
        const abn = profile.abn.trim();

        if (abn === "") {
            errors.abn = "ABN is required for business applications";
        } else if (!/^\d+$/.test(abn)) {
            // Regex for ABN allows only numberic characters
            errors.abn = "ABN must contain numbers only";
        } else if (abn.length !== 11) {
            errors.abn = "ABN must be exactly 11 digits";
        }

    }

    return errors;
}