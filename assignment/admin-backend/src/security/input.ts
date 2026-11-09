export function positiveId(value: unknown): boolean {
  return (typeof value === "string" || typeof value === "number") && /^\d+$/.test(String(value)) &&
    Number.isSafeInteger(Number(value)) && Number(value) > 0;
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
