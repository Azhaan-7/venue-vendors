import axios from "axios";
import { DocumentMetadata, DocumentUpload } from "@/types/documents";
import { Profile } from "@/types/profiles";
import { EventDetails } from "@/types/EventApplication";
import { EventApplication } from "@/types/EventApplication";
// import { Profile } from "@/types/profiles";
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Preserve array-based screens while bounding each database query and the total client workload.
export async function getCollection<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const response = await api.get<T[]>(path, { params: { limit: 100, offset } });
    results.push(...response.data);
    if (response.data.length < 100) return results;
  }
  throw new Error("This collection needs a paginated screen before loading 5000 or more records");
}

export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export const authApi = {
  signIn: async (data: SignInData) => {
    const response = await api.post("/auth/signin", data);
    return response.data;
  },

  signUp: async (data: SignUpData) => {
    const response = await api.post("/auth/signup", data);
    return response.data;
  },

  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  signOut: async () => {
    await api.post("/auth/signout");
  },

  getProfile: async (id: number) => {
    const response = await api.get(`/profile/${id}`);
    return response.data;
  },

  updateProfile: async (id: number, data: Pick<Profile, "name" | "phoneNumber" | "isBusiness" | "abn">) => {
    const response = await api.put(`/profile/${id}`, data);
    return response.data;
  }
};
export const applicationApi = {
  hirerApplications: async (hirerId: number) => {
    return getCollection<EventApplication>(`/applications/hirer/${hirerId}`);
  },

  createApplication: async (application: EventApplication) => {
    const response = await api.post("/applications", application);
    return response.data;
  },

  updateApplication: async (id: number, application: EventApplication) => {
    const response = await api.put(`/applications/${id}`, application);
    return response.data;
  },

  deleteApplication: async (id: number) => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  }
};
export const hirerDocumentApi = {
  uploadDocument: async (hirerId: number, document: DocumentUpload) => {
    const response = await api.post(`/hirer-documents/${hirerId}`, document);
    return response.data;
  },

  getDocuments: async (hirerId: number) => {
    const response = await api.get<DocumentMetadata[]>(`/hirer-documents/${hirerId}`);
    return response.data;
  },
  deleteDocument: async (hirerId: number, documentType: string) => {
    const response = await api.delete(`/hirer-documents/${hirerId}/${documentType}`);
    return response.data;
  }

};
export const applicationDraftApi = {
  getDraft: async (hirerId: number) => {
    const response = await api.get(`/application-drafts/${hirerId}`);
    return response.data;
  },

  saveDraft: async (hirerId: number, event: EventDetails, venues: number[]) => {
    const response = await api.put(`/application-drafts/${hirerId}`, {
      event,
      venues,
    });
    return response.data;
  },

  deleteDraft: async (hirerId: number) => {
    const response = await api.delete(`/application-drafts/${hirerId}`);
    return response.data;
  },
};
