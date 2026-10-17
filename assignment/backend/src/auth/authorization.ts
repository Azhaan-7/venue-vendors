import { AppDataSource } from "../data-source";
import { Application } from "../entity/Application";
import { EntityManager } from "typeorm";

export async function vendorCanAccessHirer(vendorId: number, hirerId: number): Promise<boolean> {
  const count = await AppDataSource.getRepository(Application)
    .createQueryBuilder("application")
    .innerJoin("application.hirer", "hirer")
    .innerJoin("application.applicationVenues", "applicationVenue")
    .innerJoin("applicationVenue.venue", "venue")
    .innerJoin("venue.vendor", "vendor")
    .where("hirer.id = :hirerId", { hirerId })
    .andWhere("vendor.id = :vendorId", { vendorId })
    .getCount();
  return count > 0;
}

export async function vendorOwnsApplication(vendorId: number, applicationId: number, manager?: EntityManager): Promise<boolean> {
  const count = await (manager || AppDataSource).getRepository(Application)
    .createQueryBuilder("application")
    .innerJoin("application.applicationVenues", "applicationVenue")
    .innerJoin("applicationVenue.venue", "venue")
    .innerJoin("venue.vendor", "vendor")
    .where("application.id = :applicationId", { applicationId })
    .andWhere("vendor.id = :vendorId", { vendorId })
    .getCount();
  return count > 0;
}
