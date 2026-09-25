import { gql } from "graphql-tag";
import { AppDataSource } from "./data-source";
import { Venue } from "./entity/Venue";
import { User } from "./entity/User";
import { UserRole } from "./entity/UserRole";
import { VenueSuitability } from "./entity/VenueSuitability";
import { Application } from "./entity/Application";
import { ApplicationStatus } from "./entity/ApplicationStatus";

export const typeDefs = gql`
  type VenueSuitability {
    id: ID!
    keyword: String!
  }

  type Vendor {
    id: ID!
    email: String!
  }

  type Venue {
    id: ID!
    name: String!
    location: String!
    capacity: Int!
    price: Float!
    description: String!
    image: String!
    vendor: Vendor
    venueSuitabilities: [VenueSuitability!]!
    isFeatured: Boolean!
  }

  type PopularVenueReport {
    venueId: ID!
    venueName: String!
    successfulBookings: Int!
    popularDay: String!
    popularTime: String!
  }

  type ActiveApplicantReport {
    hirerId: ID!
    hirerEmail: String!
    applicationsSubmitted: Int!
    successfulBookings: Int!
  }

  type AdminReports {
    popularVenues: [PopularVenueReport!]!
    activeApplicants: [ActiveApplicantReport!]!
  }

  type Query {
  status: String!
  venues: [Venue!]!
  vendors: [Vendor!]!
  adminReports: AdminReports!

}

type Mutation {
  createVenue(
    name: String!
    location: String!
    capacity: Int!
    price: Float!
    description: String!
    image: String!
    vendorId: ID!
    suitabilities: [String!]
    isFeatured: Boolean
  ): Venue!

  updateVenue(
  id: ID!
  name: String!
  location: String!
  capacity: Int!
  price: Float!
  description: String!
  image: String!
  vendorId: ID!
  suitabilities: [String!]
  isFeatured: Boolean
): Venue!
deleteVenue(id: ID!): Boolean!
}
`;

export const resolvers = {
  Query: {
    status: () => "Admin GraphQL backend is working",

    venues: async () => {
      return await AppDataSource.getRepository(Venue).find({
        relations: {
          vendor: true,
          venueSuitabilities: true,
        },
        order: {
          id: "ASC",
        },
      });
    },

    vendors: async () => {
      return await AppDataSource.getRepository(User).find({
        where: {
          role: UserRole.VENDOR,
        },
        order: {
          id: "ASC",
        },
      });
    },

    adminReports: async () => {
      const applicationRepository = AppDataSource.getRepository(Application);

      const applications = await applicationRepository.find({
        relations: {
          hirer: true,
          approvedVenue: true,
        },
      });

      const venueReports: any = {};
      const hirerReports: any = {};

      for (const application of applications) {
        const hirer = application.hirer;

        if (hirer) {
          if (!hirerReports[hirer.id]) {
            hirerReports[hirer.id] = {
              hirerId: hirer.id.toString(),
              hirerEmail: hirer.email,
              applicationsSubmitted: 0,
              successfulBookings: 0,
            };
          }

          hirerReports[hirer.id].applicationsSubmitted++;

          if (application.status === ApplicationStatus.APPROVED) {
            hirerReports[hirer.id].successfulBookings++;
          }
        }

        if (application.status === ApplicationStatus.APPROVED) {
          const venue = application.approvedVenue;

          if (venue) {
            if (!venueReports[venue.id]) {
              venueReports[venue.id] = {
                venueId: venue.id.toString(),
                venueName: venue.name,
                successfulBookings: 0,
                dateCounts: {},
                timeCounts: {},
              };
            }

            venueReports[venue.id].successfulBookings++;

            const eventDate = String(application.eventDate);
            const eventTime = application.eventTime;

            if (!venueReports[venue.id].dateCounts[eventDate]) {
              venueReports[venue.id].dateCounts[eventDate] = 0;
            }

            venueReports[venue.id].dateCounts[eventDate]++;

            if (!venueReports[venue.id].timeCounts[eventTime]) {
              venueReports[venue.id].timeCounts[eventTime] = 0;
            }

            venueReports[venue.id].timeCounts[eventTime]++;
          }
        }
      }

      const popularVenues: any[] = [];

      for (const venueId in venueReports) {
        const venue = venueReports[venueId];

        let popularDate = "N/A";
        let popularDateCount = 0;

        for (const date in venue.dateCounts) {
          if (venue.dateCounts[date] > popularDateCount) {
            popularDateCount = venue.dateCounts[date];
            popularDate = date;
          }
        }

        let popularTime = "N/A";
        let popularTimeCount = 0;

        for (const time in venue.timeCounts) {
          if (venue.timeCounts[time] > popularTimeCount) {
            popularTimeCount = venue.timeCounts[time];
            popularTime = time;
          }
        }

        popularVenues.push({
          venueId: venue.venueId,
          venueName: venue.venueName,
          successfulBookings: venue.successfulBookings,
          popularDay: popularDate,
          popularTime: popularTime,
        });
      }

      popularVenues.sort((a, b) => {
        return b.successfulBookings - a.successfulBookings;
      });

      const activeApplicants: any[] = [];

      for (const hirerId in hirerReports) {
        activeApplicants.push(hirerReports[hirerId]);
      }

      activeApplicants.sort((a, b) => {
        if (b.successfulBookings !== a.successfulBookings) {
          return b.successfulBookings - a.successfulBookings;
        }

        return b.applicationsSubmitted - a.applicationsSubmitted;
      });

      const topVenues: any[] = [];
      const topApplicants: any[] = [];

      for (let i = 0; i < popularVenues.length && i < 3; i++) {
        topVenues.push(popularVenues[i]);
      }

      for (let i = 0; i < activeApplicants.length && i < 3; i++) {
        topApplicants.push(activeApplicants[i]);
      }

      return {
        popularVenues: topVenues,
        activeApplicants: topApplicants,
      };
    },

  },
  Mutation: {
    createVenue: async (_: any, args: any) => {

      if (!args.name?.trim()) {
        throw new Error("Venue name is required");
      }

      if (!args.location?.trim()) {
        throw new Error("Venue location is required");
      }

      if (!args.description?.trim()) {
        throw new Error("Venue description is required");
      }

      if (!args.image?.trim()) {
        throw new Error("Venue image is required");
      }

      if (args.capacity <= 0) {
        throw new Error("Capacity must be greater than 0");
      }

      if (args.price < 0) {
        throw new Error("Price cannot be negative");
      }

      const venueRepository = AppDataSource.getRepository(Venue);
      const userRepository = AppDataSource.getRepository(User);
      const suitabilityRepository = AppDataSource.getRepository(VenueSuitability);

      //adding check to see if there are any duplicate venues, none should have the same namme and location
      const existingVenues = await venueRepository.find();

      const duplicateVenue = existingVenues.find((existingVenue) =>
        existingVenue.name.trim().toLowerCase() === args.name.trim().toLowerCase() &&
        existingVenue.location.trim().toLowerCase() === args.location.trim().toLowerCase()
      );

      if (duplicateVenue) {
        throw new Error("A venue with this name and location already exists");
      }

      const venue = new Venue();
      venue.name = args.name;
      venue.location = args.location;
      venue.capacity = args.capacity;
      venue.price = args.price;
      venue.description = args.description;
      venue.image = args.image;
      venue.isFeatured = args.isFeatured === true;

      if (args.vendorId) {
        const vendor = await userRepository.findOne({
          where: {
            id: Number(args.vendorId),
            role: UserRole.VENDOR,
          },
        });

        if (vendor) {
          venue.vendor = vendor;
        }
      }

      const savedVenue = await venueRepository.save(venue);
      //adding suitabilities, max 4
      if (Array.isArray(args.suitabilities)) {
        let suitabilityCount = 0;
        for (const keyword of args.suitabilities) {
          if (keyword.trim().length > 0 && suitabilityCount < 4) {
            const suitability = new VenueSuitability();
            suitability.keyword = keyword.trim();
            suitability.venue = savedVenue;
            await suitabilityRepository.save(suitability);
            suitabilityCount++;
          }
        }
      }

      return await venueRepository.findOne({
        where: { id: savedVenue.id },
        relations: {
          vendor: true,
          venueSuitabilities: true,
        },
      });
    },
    updateVenue: async (_: any, args: any) => {
      const venueRepository = AppDataSource.getRepository(Venue);
      const userRepository = AppDataSource.getRepository(User);
      const suitabilityRepository = AppDataSource.getRepository(VenueSuitability);

      const venue = await venueRepository.findOne({
        where: { id: Number(args.id) },
        relations: {
          vendor: true,
          venueSuitabilities: true,
        },
      });

      if (!venue) {
        throw new Error("Venue not found");
      }

      if (!args.name?.trim()) {
        throw new Error("Venue name is required");
      }

      if (!args.location?.trim()) {
        throw new Error("Venue location is required");
      }

      if (!args.description?.trim()) {
        throw new Error("Venue description is required");
      }

      if (!args.image?.trim()) {
        throw new Error("Venue image is required");
      }

      if (args.capacity <= 0) {
        throw new Error("Capacity must be greater than 0");
      }

      if (args.price < 0) {
        throw new Error("Price cannot be negative");
      }

      venue.name = args.name;
      venue.location = args.location;
      venue.capacity = args.capacity;
      venue.price = args.price;
      venue.description = args.description;
      venue.image = args.image;
      venue.isFeatured = args.isFeatured === true;

      if (args.vendorId) {
        const vendor = await userRepository.findOne({
          where: {
            id: Number(args.vendorId),
            role: UserRole.VENDOR,
          },
        });

        if (vendor) {
          venue.vendor = vendor;
        }
      }

      const savedVenue = await venueRepository.save(venue);
      // remove the previous suitabilities before adding new ones
      await suitabilityRepository.delete({
        venue: {
          id: savedVenue.id,
        },
      });
      if (Array.isArray(args.suitabilities)) {
        let suitabilityCount = 0;
        for (const suitabilityText of args.suitabilities) {
          const keyword = suitabilityText.trim();
          if (keyword.length > 0 && suitabilityCount < 4) {
            const suitability = new VenueSuitability();
            suitability.keyword = keyword;
            suitability.venue = savedVenue;
            await suitabilityRepository.save(suitability);
            suitabilityCount++;
          }
        }
      }

      return await venueRepository.findOne({
        where: { id: savedVenue.id },
        relations: {
          vendor: true,
          venueSuitabilities: true,
        },
      });
    },
    deleteVenue: async (_: any, { id }: { id: string }) => {
      const venueRepository = AppDataSource.getRepository(Venue);
      const result = await venueRepository.delete(Number(id));
      return result.affected === 1;
    },
  },
};