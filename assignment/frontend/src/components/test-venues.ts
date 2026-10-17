// Synthetic fixtures only; production venue data comes from the API.
import type { Venue } from "@/types/venues";
export const venues: Venue[] = [1, 2, 3, 5].map(id => ({
  id, name: `Sample Venue ${id}`, location: "Sample suburb", capacity: 150,
  price: 100, description: "Sample venue for component tests", image: "/images/v1.jpg", isFeatured: false,
}));
