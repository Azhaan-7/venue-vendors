import { isFutureVenueEvent } from "./venueTime";

test("future Sydney events are independent of the browser's timezone", () => {
  const now = new Date("2026-11-09T08:00:00Z"); // 19:00 in Sydney, 22:00 in Kiritimati.
  expect(isFutureVenueEvent("2026-11-09", "21:00", now)).toBe(true);
  expect(isFutureVenueEvent("2026-11-09", "18:00", now)).toBe(false);
  expect(isFutureVenueEvent("2026-11-09", "19:00:00", now)).toBe(false);
});

test("Sydney winter offset and invalid fields are handled explicitly", () => {
  const now = new Date("2026-07-09T08:00:00Z");
  expect(isFutureVenueEvent("2026-07-09", "18:01", now)).toBe(true);
  expect(isFutureVenueEvent("", "", now)).toBe(false);
});
