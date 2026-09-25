import axios from "axios";
import { EventApplication } from "@/types/EventApplication";
// import { Profile } from "@/types/profiles";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

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

  getProfile: async (id: number) => {
    const response = await api.get(`/profile/${id}`);
    return response.data;
  },

  updateProfile: async (id: number, data: any) => {
    const response = await api.put(`/profile/${id}`, data);
    return response.data;
  }
};
export const applicationApi = {
  hirerApplications: async (hirerId: number) => {
    const response = await api.get(`/applications/hirer/${hirerId}`);
    return response.data;
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
  uploadDocument: async (hirerId: number, document: any) => {
    const response = await api.post(`/hirer-documents/${hirerId}`, document);
    return response.data;
  },

  getDocuments: async (hirerId: number) => {
    const response = await api.get(`/hirer-documents/${hirerId}`);
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

  saveDraft: async (hirerId: number, event: any, venues: number[]) => {
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