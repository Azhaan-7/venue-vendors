import { Request } from "express";

export function positiveId(value: unknown): boolean {
  return (typeof value === "string" || typeof value === "number") && /^\d+$/.test(String(value)) &&
    Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

export function validDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && Number(value.slice(0, 4)) >= 1753;
}

export function eventInputError(event: any, venues: unknown): string | undefined {
  if (!event || typeof event !== "object" || Array.isArray(event)) return "Event details are required";
  if (typeof event.eventName !== "string" || !event.eventName.trim() || event.eventName.length > 150) return "Event name must contain 1 to 150 characters";
  if (!validDate(event.date)) return "A valid event date is required";
  if (typeof event.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(event.time)) return "A valid event time is required";
  if (!Number.isInteger(Number(event.guests)) || Number(event.guests) < 1 || Number(event.guests) > 100000) return "Guests must be an integer from 1 to 100000";
  if (!Number.isInteger(Number(event.duration)) || Number(event.duration) < 1 || Number(event.duration) > 168) return "Duration must be an integer from 1 to 168 hours";
  if (!Array.isArray(venues) || !venues.length || venues.length > 10 || !venues.every(positiveId) || new Set(venues.map(Number)).size !== venues.length) return "Select 1 to 10 distinct valid venues";
}

export function venueInputError(input: any): string | undefined {
  for (const [name, max] of [["name", 150], ["location", 255], ["description", 5000], ["image", 255]] as const) {
    if (typeof input[name] !== "string" || !input[name].trim() || input[name].length > max) return `${name} must contain 1 to ${max} characters`;
  }
  if (!Number.isInteger(Number(input.capacity)) || Number(input.capacity) < 1 || Number(input.capacity) > 100000) return "Capacity must be an integer from 1 to 100000";
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0 || Number(input.price) > 99999999.99 || input.price === "") return "Invalid venue price";
  if (!(/^(https?:\/\/|\/images\/)/i.test(input.image))) return "Use an HTTP(S) image URL or a local /images/ path";
  if (input.suitabilities !== undefined && (!Array.isArray(input.suitabilities) || input.suitabilities.length > 4 || input.suitabilities.some((value: unknown) => typeof value !== "string" || !value.trim() || value.length > 50))) return "Use at most 4 suitability keywords of 1 to 50 characters";
}

export function pagination(req: Request) {
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
    const error = new Error("Invalid pagination");
    Object.assign(error, { status: 400 });
    throw error;
  }
  return { take: limit, skip: offset, order: { id: "ASC" as const } };
}
