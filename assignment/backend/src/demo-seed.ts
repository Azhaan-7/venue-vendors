import argon2 from "argon2";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { UserRole } from "./entity/UserRole";
import { Venue } from "./entity/Venue";
import { VenueSuitability } from "./entity/VenueSuitability";

// Intentionally public demo logins. Never use these passwords for real accounts.
export const demoUsers = [
  { email: "hirer.demo@example.com", name: "Alex Demo", role: UserRole.HIRER, password: "HirerDemo!2026" },
  { email: "hirer.events@example.com", name: "Sam Demo", role: UserRole.HIRER, password: "EventsDemo!2026" },
  { email: "vendor.demo@example.com", name: "Taylor Demo", role: UserRole.VENDOR, password: "VendorDemo!2026" },
  { email: "vendor.spaces@example.com", name: "Jordan Demo", role: UserRole.VENDOR, password: "SpacesDemo!2026" },
];

export const demoVenues = [
  { name: "Demo Willow Barn", location: "Yarra Valley, VIC", capacity: 180, price: 2400, image: "/images/v1.jpg", isFeatured: true, vendorEmail: "vendor.demo@example.com", suitabilities: ["Weddings", "Celebrations"], description: "A fictional timber barn with room for a seated reception and dancing. Sample listing for exploring wedding and celebration bookings." },
  { name: "Demo City Lounge", location: "Melbourne CBD, VIC", capacity: 60, price: 750, image: "/images/v2.jpg", isFeatured: false, vendorEmail: "vendor.demo@example.com", suitabilities: ["Small Gatherings", "Corporate Events"], description: "A fictional city lounge for smaller celebrations and informal team events. Sample listing; no real venue or availability is represented." },
  { name: "Demo Garden Pavilion", location: "Richmond, VIC", capacity: 100, price: 1200, image: "/images/v3.jpg", isFeatured: true, vendorEmail: "vendor.demo@example.com", suitabilities: ["Weddings", "Community Events"], description: "A fictional pavilion for daytime receptions and community gatherings. Sample listing for comparing medium-sized event spaces." },
  { name: "Demo Harbour Room", location: "Docklands, VIC", capacity: 150, price: 1800, image: "/images/v4.jpg", isFeatured: false, vendorEmail: "vendor.demo@example.com", suitabilities: ["Corporate Events", "Conferences"], description: "A fictional event room for presentations, networking and seated dinners. Sample listing for trying corporate event applications." },
  { name: "Demo Northside Studio", location: "Brunswick, VIC", capacity: 40, price: 350, image: "/images/v5.jpg", isFeatured: false, vendorEmail: "vendor.spaces@example.com", suitabilities: ["Workshops", "Small Gatherings"], description: "A fictional compact studio for workshops and small group sessions. Sample listing for exploring lower-capacity venues." },
  { name: "Demo Riverside Hall", location: "Southbank, VIC", capacity: 250, price: 2100, image: "/images/v6.jpg", isFeatured: true, vendorEmail: "vendor.spaces@example.com", suitabilities: ["Community Events", "Celebrations"], description: "A fictional large hall for community functions and celebrations. Sample listing for comparing capacity and daily hire prices." },
  { name: "Demo Coastal Retreat", location: "St Kilda, VIC", capacity: 80, price: 950, image: "/images/v7.jpg", isFeatured: false, vendorEmail: "vendor.spaces@example.com", suitabilities: ["Corporate Events", "Workshops"], description: "A fictional retreat space for team planning days and workshops. Sample listing; the photos are illustrative only." },
  { name: "Demo Grand Ballroom", location: "Carlton, VIC", capacity: 320, price: 3200, image: "/images/v8.jpg", isFeatured: true, vendorEmail: "vendor.spaces@example.com", suitabilities: ["Weddings", "Conferences", "Celebrations"], description: "A fictional ballroom for larger receptions and conferences. Sample listing for testing searches with higher guest counts." },
];

export async function seedDemoData(source: DataSource, apply = false) {
  return source.transaction("SERIALIZABLE", async manager => {
    const users = manager.getRepository(User);
    const venues = manager.getRepository(Venue);
    const suitabilities = manager.getRepository(VenueSuitability);
    const owners = new Map<string, User>();
    const result = { mode: apply ? "apply" : "dry-run", usersToCreate: 0, venuesToCreate: 0 };

    // Check every collision before writing. Never reset passwords or change existing roles.
    for (const fixture of demoUsers) {
      const existing = await users.findOne({ where: { email: fixture.email }, select: { id: true, email: true, role: true, password: true } });
      if (existing) {
        if (existing.role !== fixture.role || !existing.password?.startsWith("$argon2id$") || !await argon2.verify(existing.password, fixture.password)) {
          throw new Error(`Demo email already belongs to a different account: ${fixture.email}`);
        }
        owners.set(fixture.email, existing);
      } else result.usersToCreate++;
    }
    const missingVenues: typeof demoVenues = [];
    for (const fixture of demoVenues) {
      const existing = await venues.findOne({ where: { name: fixture.name, location: fixture.location }, relations: { vendor: true } });
      if (existing && (!owners.has(fixture.vendorEmail) || existing.vendor?.id !== owners.get(fixture.vendorEmail)?.id)) {
        throw new Error(`Demo venue already belongs to a different vendor: ${fixture.name}`);
      }
      if (!existing) missingVenues.push(fixture);
    }
    result.venuesToCreate = missingVenues.length;
    if (!apply) return result;

    for (const fixture of demoUsers) {
      if (owners.has(fixture.email)) continue;
      const password = await argon2.hash(fixture.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
      const user = users.create({ email: fixture.email, role: fixture.role, password, profile: { name: fixture.name, phoneNumber: "0400000000", isBusiness: false } });
      owners.set(fixture.email, await users.save(user));
    }
    for (const { vendorEmail, suitabilities: keywords, ...fixture } of missingVenues) {
      const venue = await venues.save(venues.create({ ...fixture, vendor: owners.get(vendorEmail) }));
      for (const keyword of keywords) await suitabilities.save(suitabilities.create({ venue, keyword }));
    }
    return result;
  });
}

if (require.main === module) {
  (async () => {
    if (process.argv.slice(2).some(arg => arg !== "--apply")) throw new Error("Usage: npm run seed:demo -- [--apply]");
    const { AppDataSource } = await import("./data-source");
    for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) if (!process.env[key]) throw new Error(`Missing ${key}`);
    try {
      await AppDataSource.initialize();
      console.log(JSON.stringify(await seedDemoData(AppDataSource, process.argv.includes("--apply")), null, 2));
    } finally {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
