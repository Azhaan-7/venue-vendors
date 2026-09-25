export type HireHistory = {
  id: string;
  hirer: {
    id: number;
    email: string;
  };
  venue: {
    id: number;
    venueName: string;
    location: string;
  }; 
  eventName: string;
  eventDate: string;
  eventTime: string;
  durationHours: number;
  rating: number;
  documents: string[];
};

