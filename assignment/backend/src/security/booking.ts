import { EntityManager } from "typeorm";
import { Application } from "../entity/Application";
import { ApplicationStatus } from "../entity/ApplicationStatus";
import { BlockedPeriod } from "../entity/BlockedPeriod";
import { HttpError } from "../utils/HttpError";

// Compare venue-local wall times consistently, independent of the server's timezone.
// UTC here is a calculation convention, not a conversion of the event's timezone.
export function bookingInterval(date: string | Date, time: string, hours: number) {
  const day = date instanceof Date ? date.toISOString().slice(0, 10) : date;
  const start = new Date(`${day}T${time}Z`);
  const end = new Date(start.getTime() + hours * 3600000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || hours <= 0) {
    throw new HttpError(409, "The application has invalid booking dates or duration");
  }
  return { start, end };
}

export async function assertNoApprovedBooking(manager: EntityManager, venueId: number, start: Date, end: Date) {
  const eventStart = "DATEADD(second, DATEDIFF(second, CAST('00:00:00' AS time), booking.eventTime), CAST(booking.eventDate AS datetime2))";
  const count = await manager.getRepository(Application).createQueryBuilder("booking")
    .where("booking.approvedVenue = :venueId", { venueId })
    .andWhere("booking.status = :status", { status: ApplicationStatus.APPROVED })
    .andWhere(`${eventStart} < CAST(:end AS datetime2)`, { end: end.toISOString().slice(0, 19) })
    .andWhere(`DATEADD(hour, booking.durationHours, ${eventStart}) > CAST(:start AS datetime2)`, { start: start.toISOString().slice(0, 19) })
    .getCount();
  if (count) throw new HttpError(409, "The venue already has a booking during this period");
}

// Caller must hold the venue's pessimistic write lock until its transaction commits.
export async function assertVenueAvailable(manager: EntityManager, venueId: number, start: Date, end: Date) {
  const blocked = await manager.getRepository(BlockedPeriod).createQueryBuilder("block")
    .where("block.venue = :venueId", { venueId })
    .andWhere("block.startDate <= :lastDay", { lastDay: new Date(end.getTime() - 1).toISOString().slice(0, 10) })
    .andWhere("block.endDate >= :firstDay", { firstDay: start.toISOString().slice(0, 10) })
    .getCount();
  if (blocked) throw new HttpError(409, "The venue is blocked during this period");
  await assertNoApprovedBooking(manager, venueId, start, end);
}

export function assertFutureEvent(start: Date, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  const venueNow = new Date(`${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}Z`);
  if (start <= venueNow) throw new HttpError(400, "Event date and time must be in the future (Australia/Sydney)");
}
