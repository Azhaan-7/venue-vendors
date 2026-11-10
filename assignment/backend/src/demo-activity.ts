import argon2 from "argon2";
import { DataSource } from "typeorm";
import { demoUsers, demoVenues } from "./demo-seed";
import { User } from "./entity/User";
import { Venue } from "./entity/Venue";
import { Application } from "./entity/Application";
import { ApplicationVenue } from "./entity/ApplicationVenue";
import { ApplicationStatus } from "./entity/ApplicationStatus";
import { Comment } from "./entity/Comment";
import { HireHistory } from "./entity/HireHistory";
import { Review } from "./entity/Review";
import { assertVenueAvailable, bookingInterval } from "./security/booking";

export const demoApplications = [
  { eventName: "Demo community fundraiser", hirerEmail: "hirer.demo@example.com", status: ApplicationStatus.PENDING, dayOffset: 14, guest: 80, venues: ["Demo Riverside Hall", "Demo Garden Pavilion"] },
  { eventName: "Demo team planning day", hirerEmail: "hirer.demo@example.com", status: ApplicationStatus.APPROVED, dayOffset: 21, guest: 60, venues: ["Demo Harbour Room"] },
  { eventName: "Demo intimate celebration", hirerEmail: "hirer.demo@example.com", status: ApplicationStatus.REJECTED, dayOffset: 28, guest: 40, venues: ["Demo City Lounge"] },
  { eventName: "Demo creative workshop", hirerEmail: "hirer.demo@example.com", status: ApplicationStatus.APPROVED, dayOffset: -7, guest: 24, venues: ["Demo Northside Studio"] },
  { eventName: "Demo launch reception", hirerEmail: "hirer.events@example.com", status: ApplicationStatus.PENDING, dayOffset: 16, guest: 50, venues: ["Demo City Lounge", "Demo Coastal Retreat"] },
  { eventName: "Demo community dinner", hirerEmail: "hirer.events@example.com", status: ApplicationStatus.APPROVED, dayOffset: 24, guest: 180, venues: ["Demo Riverside Hall"] },
  { eventName: "Demo coastal team day", hirerEmail: "hirer.events@example.com", status: ApplicationStatus.REJECTED, dayOffset: 30, guest: 40, venues: ["Demo Coastal Retreat"] },
  { eventName: "Demo spring celebration", hirerEmail: "hirer.events@example.com", status: ApplicationStatus.APPROVED, dayOffset: -10, guest: 100, venues: ["Demo Willow Barn"] },
];

// Date offsets use Sydney's calendar date; event times are venue-local wall times.
export function demoEventDate(now: Date, offset: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  const day = new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day;
}

export async function seedDemoActivity(source: DataSource, apply = false, now = new Date()) {
  return source.transaction("SERIALIZABLE", async manager => {
    const users = manager.getRepository(User);
    const venueRepo = manager.getRepository(Venue);
    const applications = manager.getRepository(Application);
    const preferences = manager.getRepository(ApplicationVenue);
    const comments = manager.getRepository(Comment);
    const histories = manager.getRepository(HireHistory);
    const reviews = manager.getRepository(Review);
    const accounts = new Map<string, User>();
    const venues = new Map<string, Venue>();

    for (const fixture of demoUsers) {
      const user = await users.findOne({ where: { email: fixture.email }, select: { id: true, email: true, role: true, password: true } });
      if (!user || user.role !== fixture.role || !user.password?.startsWith("$argon2id$") || !await argon2.verify(user.password, fixture.password)) throw new Error(`Run seed:demo first; demo account missing or changed: ${fixture.email}`);
      accounts.set(fixture.email, user);
    }
    for (const fixture of demoVenues) {
      const venue = await venueRepo.findOne({ where: { name: fixture.name, location: fixture.location }, relations: { vendor: true } });
      if (!venue || venue.vendor?.id !== accounts.get(fixture.vendorEmail)?.id) throw new Error(`Run seed:demo first; demo venue missing or reassigned: ${fixture.name}`);
      venues.set(fixture.name, venue);
    }
    // Use the same ID order as normal approvals when acquiring venue locks.
    if (apply) for (const venue of [...venues.values()].sort((a, b) => a.id - b.id)) await venueRepo.findOne({ where: { id: venue.id }, lock: { mode: "pessimistic_write" } });

    const result = { mode: apply ? "apply" : "dry-run", applicationsToCreate: 0, bookingsToCreate: 0, historiesToCreate: 0 };
    for (const fixture of demoApplications) {
      const hirer = accounts.get(fixture.hirerEmail)!;
      const selected = fixture.venues.map(name => venues.get(name)!);
      if (selected.some(venue => venue.capacity < fixture.guest)) throw new Error(`Demo venue capacity changed: ${fixture.eventName}`);
      let application = await applications.findOne({ where: { eventName: fixture.eventName, hirer: { id: hirer.id } }, relations: { approvedVenue: { vendor: true } } });
      const approved = fixture.status === ApplicationStatus.APPROVED;
      const historical = fixture.dayOffset < 0;
      if (!application) {
        const eventDate = demoEventDate(now, fixture.dayOffset);
        const { start, end } = bookingInterval(eventDate, "12:00:00", 3);
        if (approved) await assertVenueAvailable(manager, selected[0].id, start, end);
        result.applicationsToCreate++;
        if (approved) result.bookingsToCreate++;
        if (apply) {
          const rejection = fixture.status === ApplicationStatus.REJECTED ? "Sample rejection: this event needs a different layout." : null;
          application = await applications.save(applications.create({
            eventName: fixture.eventName, hirer, guest: fixture.guest, eventDate, eventTime: "12:00:00", durationHours: 3,
            status: fixture.status, approvedVenue: approved ? selected[0] : null, rejectReason: rejection,
            dateApplied: demoEventDate(now, historical ? fixture.dayOffset - 7 : -3),
            decisionDate: fixture.status === ApplicationStatus.PENDING ? null : demoEventDate(now, historical ? fixture.dayOffset - 5 : -1),
          }));
          for (const [index, venue] of selected.entries()) await preferences.save(preferences.create({ application, venue, rankOrder: index + 1 }));
          if (fixture.status !== ApplicationStatus.PENDING) await comments.save(comments.create({ application, vendor: selected[0].vendor, commentText: rejection || "Sample booking confirmed. This is fictional demo activity." }));
        }
      }
      // Preserve decisions and dates changed by visitors instead of recreating them.
      if (!historical || (application && (application.status !== ApplicationStatus.APPROVED || application.approvedVenue?.id !== selected[0].id || new Date(application.eventDate) >= demoEventDate(now, 0)))) continue;
      const history = await histories.findOne({ where: { eventName: fixture.eventName, hirer: { id: hirer.id } } });
      if (!history) {
        result.historiesToCreate++;
        if (apply) await histories.save(histories.create({ hirer, venue: application!.approvedVenue, eventName: fixture.eventName, eventDate: application!.eventDate, eventTime: application!.eventTime, durationHours: application!.durationHours, rating: 5, documents: [] }));
      }
      if (apply && !await reviews.findOne({ where: { application: { id: application!.id } } })) await reviews.save(reviews.create({ application, hirer, vendor: application!.approvedVenue.vendor, rating: 5 }));
    }
    return result;
  });
}

if (require.main === module) {
  (async () => {
    if (process.argv.slice(2).some(arg => arg !== "--apply")) throw new Error("Usage: npm run seed:demo-activity -- [--apply]");
    const { AppDataSource } = await import("./data-source");
    for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) if (!process.env[key]) throw new Error(`Missing ${key}`);
    try {
      await AppDataSource.initialize();
      console.log(JSON.stringify(await seedDemoActivity(AppDataSource, process.argv.includes("--apply")), null, 2));
    } finally { if (AppDataSource.isInitialized) await AppDataSource.destroy(); }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
