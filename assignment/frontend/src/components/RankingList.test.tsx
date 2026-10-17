import React from "react";
import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { RankingList } from "./RankingList";
import { venues } from "./test-venues";

function renderComponent(ui: React.ReactElement) {
  return render(<ChakraProvider>{ui}</ChakraProvider>);
}

describe("RankingList", () => {
  test("Disable the Up button for first item and the Down button for last item", () => {
    const selectedVenues = [venues[0], venues[1], venues[2]];

    renderComponent(
      <RankingList
        selectedVenues={selectedVenues}
        moveUp={jest.fn()}
        moveDown={jest.fn()}
      />
    );

    const upButtons = screen.getAllByRole("button", { name: "Up" });
    const downButtons = screen.getAllByRole("button", { name: "Down" });

    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[2]).toBeDisabled();
    expect(upButtons[1]).not.toBeDisabled();
    expect(downButtons[0]).not.toBeDisabled();
  });

  test("Show fallback message when there are no venues selected", () => {
    renderComponent(
      <RankingList
        selectedVenues={[]}
        moveUp={jest.fn()}
        moveDown={jest.fn()}
      />
    );

    expect(screen.getByText("No venues ranked at the moment")).toBeInTheDocument();
  });
});