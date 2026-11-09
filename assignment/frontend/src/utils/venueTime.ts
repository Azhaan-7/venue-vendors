// Event fields are Sydney wall times, regardless of the viewer's timezone.
export function isFutureVenueEvent(date: string, time: string, now = new Date()): boolean {
  const start = new Date(`${date}T${time}Z`);
  if (!Number.isFinite(start.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  const venueNow = new Date(`${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}Z`);
  return start > venueNow;
}
