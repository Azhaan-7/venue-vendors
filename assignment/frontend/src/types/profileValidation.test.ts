import { validateProfile } from "./profileValidation";
import { Profile } from "./profiles";

describe("validateProfile", () => {
  test("Return an ABN error if ABN isn't exactly 11 digits", () => {
    const profile: Profile = {
      name: "Alice",
      phoneNumber: "0400000000",
      isBusiness: true,
      abn: "12345",
      driverLicense: undefined,
      publicLiabilityInsurance: undefined,
      businessRegistration: undefined,
      credibilityScore: 0,
    };

    const errors = validateProfile(profile);

    expect(errors.abn).toBe("ABN must be exactly 11 digits");
  });

  test("Return a phone error if letters are entered in the phone number", () => {
    const profile: Profile = {
      name: "Charlie",
      phoneNumber: "0400000000xyzabc",
      isBusiness: false,
      abn: "",
      driverLicense: undefined,
      publicLiabilityInsurance: undefined,
      businessRegistration: undefined,
      credibilityScore: 0,
    };

    const errors = validateProfile(profile);

    expect(errors.phone).toBe("Phone number can only contain digits, spaces, and +");
  });
});