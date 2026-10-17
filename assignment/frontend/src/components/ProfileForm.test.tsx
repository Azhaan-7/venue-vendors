import { useState } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileForm } from "./ProfileForm";
import { Profile } from "@/types/profiles";
import { hirerDocumentApi } from "@/services/api";

jest.mock("@/services/api", () => ({ hirerDocumentApi: {
  getDocuments: jest.fn(), uploadDocument: jest.fn(), deleteDocument: jest.fn(),
} }));
const saveProfile = jest.fn();
function Form() {
  const [profile, setProfile] = useState<Profile>({ name: "Sample", phoneNumber: "0400000000", isBusiness: false, abn: "", credibilityScore: 1.5 });
  return <ChakraProvider><ProfileForm profile={profile} setProfile={setProfile} saveProfile={saveProfile} email="sample@example.test" userId={1} /></ChakraProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(hirerDocumentApi.getDocuments).mockResolvedValue([{ id: 1, documentType: "driverLicense", fileName: "sample.jpg", mimeType: "image/jpeg", downloadUrl: "/api/hirer-documents/1/driverLicense/content" }]);
  saveProfile.mockResolvedValue(undefined);
});

test("existing metadata is displayed without reuploading contents or recalculating server reputation", async () => {
  render(<Form />);
  expect(await screen.findByText("Uploaded: sample.jpg")).toBeInTheDocument();
  expect(screen.getByText("1.5 / 5")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
  await waitFor(() => expect(saveProfile).toHaveBeenCalled());
  expect(hirerDocumentApi.uploadDocument).not.toHaveBeenCalled();
  expect(saveProfile.mock.calls[0][0].credibilityScore).toBe(1.5);
});

test("failed profile persistence shows an error instead of a success message", async () => {
  saveProfile.mockRejectedValue(new Error("sample failure"));
  render(<Form />);
  await screen.findByText("Uploaded: sample.jpg");
  fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
  expect(await screen.findByText("Profile changes could not be fully saved.")).toBeInTheDocument();
  expect(screen.queryByText("Your profile has been updated successfully.")).not.toBeInTheDocument();
});
