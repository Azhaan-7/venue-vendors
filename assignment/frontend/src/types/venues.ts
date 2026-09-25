export interface Venue {
    id: number;
    name: string;
    location: string;
    capacity: number;
    // this should serve as description 
    // suitability: string[];
    price: number;
    image: string;
    description: string;
    venueSuitabilities?: {
        id: number;
        keyword: string;
    }[];
    isFeatured: boolean;

}
