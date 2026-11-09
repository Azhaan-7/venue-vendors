import { validatePhone } from "../utils/validation";
import { AppDataSource } from "../data-source";
import { HirerDocument } from "../entity/HirerDocument";
import { Profile } from "../entity/Profile";

export function completenessScore(profile: Pick<Profile, "name" | "phoneNumber"> | undefined, types: string[]): number {
  const phone = profile?.phoneNumber?.trim() || "";
  const validPhone = validatePhone(phone);
  const documents = new Set(types);
  return Number(Boolean(profile?.name?.trim())) + Number(validPhone) +
    ["driverLicense", "publicLiabilityInsurance", "businessRegistration"].filter(type => documents.has(type)).length;
}

export async function savedCompleteness(userId: number, profile: Pick<Profile, "name" | "phoneNumber"> | undefined): Promise<number> {
  const documents = await AppDataSource.getRepository(HirerDocument).find({
    where: { hirer: { id: userId } }, select: { documentType: true },
  });
  return completenessScore(profile, documents.map(document => document.documentType));
}
