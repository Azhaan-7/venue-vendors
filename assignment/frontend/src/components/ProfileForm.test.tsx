import { useState } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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


test("a failed profile save can be retried after a document was removed", async () => {
  jest.mocked(hirerDocumentApi.deleteDocument).mockResolvedValue({});
  saveProfile.mockRejectedValueOnce(new Error("Temporary failure")).mockResolvedValue(undefined);
  render(<Form />);
  await screen.findByText("Uploaded: sample.jpg");
  fireEvent.click(screen.getByRole("button", { name: "Remove File" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
  await screen.findByText("Profile changes could not be fully saved.");
  await waitFor(() => expect(screen.getByRole("button", { name: "Save Profile" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
  await screen.findByText("Your profile has been updated successfully.");
  expect(hirerDocumentApi.deleteDocument).toHaveBeenCalledTimes(1);
  expect(saveProfile).toHaveBeenCalledTimes(2);
});

test("turning off business status removes its saved registration on save", async () => {
  jest.mocked(hirerDocumentApi.getDocuments).mockResolvedValue([{ id: 2, documentType: "businessRegistration", fileName: "business.pdf", mimeType: "application/pdf", downloadUrl: "/api/hirer-documents/1/businessRegistration/content" }]);
  jest.mocked(hirerDocumentApi.deleteDocument).mockResolvedValue({});
  render(<Form />);
  const business = screen.getByRole("checkbox", { name: "Applying as a Business / Corporation" });
  fireEvent.click(business);
  await screen.findByText("Uploaded: business.pdf");
  fireEvent.click(business);
  fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
  await waitFor(() => expect(hirerDocumentApi.deleteDocument).toHaveBeenCalledWith(1, "businessRegistration"));
});


test("a delayed file read preserves profile edits made after selecting the file", async () => {
  const read = jest.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(() => undefined);
  try {
    render(<Form />);
    await screen.findByText("Uploaded: sample.jpg");
    fireEvent.change(screen.getByLabelText("Driver's License (JPG)"), { target: { files: [new File(["sample"], "new.jpg", { type: "image/jpeg" })] } });
    fireEvent.change(screen.getByRole("textbox", { name: /^Name$/ }), { target: { value: "Edited during upload" } });
    act(() => {
      const reader = read.mock.contexts[0] as FileReader;
      Object.defineProperty(reader, "result", { value: "data:image/jpeg;base64,c2FtcGxl" });
      reader.dispatchEvent(new ProgressEvent("load"));
    });
    expect(screen.getByRole("textbox", { name: /^Name$/ })).toHaveValue("Edited during upload");
    expect(screen.getByText("Uploaded: new.jpg")).toBeInTheDocument();
  } finally { read.mockRestore(); }
});
