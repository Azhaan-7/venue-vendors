import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import VendorApplicationModal from "./VendorApplicationModal";

test("approval choices keep foreign and blocked venues unselectable", async () => {
  const select = jest.fn();
  const noop = jest.fn();
  render(<ChakraProvider><VendorApplicationModal
    isOpen onClose={noop}
    selectedApplication={{ id: 1, event: { eventName: "Sample", date: "2099-11-20", time: "12:00", guests: 10, duration: 2 }, venues: [1, 2, 3], dateApplied: "2099-11-01", hirerID: 1, hirerEmail: "sample@example.test", status: "pending" }}
    comment="" setComment={noop} editComment={false} showActions modalMessage="" errorMessage=""
    selectedVenueId={null} setSelectedVenueId={select}
    handleEditComment={noop} handleCancelEdit={noop} saveComment={noop} handleActOnApplication={noop} approve={noop} reject={noop}
    getStatusColor={() => "yellow"} getHirerProfile={() => ({ name: "Sample", phoneNumber: "0400000000", isBusiness: false, abn: "", credibilityScore: 2 })}
    canApproveVenue={id => id !== 2} getVenueName={id => ["", "Own venue", "Other venue", "Blocked venue"][id]} getVenueLocation={() => "Melbourne"}
    getReputation={() => null} isVenueBlocked={id => id === 3} getBlockReason={() => "Unavailable"} getHireHistory={() => []}
    getHistorySummary={() => ({ totalEvents: 0, uniqueLocations: 0, avgRating: "0" })}
  /></ChakraProvider>);
  await screen.findByText("Select which venue should be approved");
  const clickLast = (label: string) => { const matches = screen.getAllByText(label); fireEvent.click(matches[matches.length - 1]); };
  clickLast("Other venue"); clickLast("Blocked venue");
  expect(select).not.toHaveBeenCalled();
  clickLast("Own venue");
  expect(select).toHaveBeenCalledWith(1);
});
