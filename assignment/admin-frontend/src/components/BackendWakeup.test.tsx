import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import BackendWakeup from "./BackendWakeup";

const paths = ["/api/healthz", "/api/admin-healthz"];
const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

test("warms each API once through effect replay and route rerenders", async () => {
  const view = render(<StrictMode><BackendWakeup /></StrictMode>);
  view.rerender(<StrictMode><BackendWakeup /></StrictMode>);
  await act(async () => {});
  expect(fetchMock.mock.calls.map(call => call[0])).toEqual(paths);
  for (const [, options] of fetchMock.mock.calls) {
    expect(options).toMatchObject({ cache: "no-store", credentials: "omit" });
    expect(options.signal.aborted).toBe(false);
  }
  act(() => jest.advanceTimersByTime(70_000));
  expect(fetchMock.mock.calls.every(call => !call[1].signal.aborted)).toBe(true);
});

test("failed wake-up leaves the page usable and does not retry", async () => {
  fetchMock.mockRejectedValue(new Error("Backend sleeping"));
  const view = render(<><BackendWakeup /><button>Continue</button></>);
  await act(async () => {});
  expect(view.getByRole("button", { name: "Continue" })).toBeEnabled();
  act(() => jest.advanceTimersByTime(120_000));
  expect(fetchMock).toHaveBeenCalledTimes(paths.length);
});

test("abandons a stalled wake-up after 70 seconds", async () => {
  fetchMock.mockImplementation((_path, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("Aborted")));
  }));
  render(<BackendWakeup />);
  const signals = fetchMock.mock.calls.map(call => call[1].signal as AbortSignal);
  act(() => jest.advanceTimersByTime(69_999));
  expect(signals.every(signal => !signal.aborted)).toBe(true);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(signals.every(signal => signal.aborted)).toBe(true);
});
