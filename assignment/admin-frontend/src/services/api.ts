import axios from "axios";

export interface SignInData {
  email: string;
  password: string;
}

export interface SignedUser {
  id: number;
  email: string;
  role: string;
  name?: string;
}

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const authApi = {
  signIn: async (data: SignInData): Promise<SignedUser> => {
    const response = await api.post<SignedUser>("/auth/signin", data);
    return response.data;
  },
  me: async (): Promise<SignedUser> => {
    const response = await api.get<SignedUser>("/auth/me");
    return response.data;
  },
  signOut: async (): Promise<void> => {
    await api.post("/auth/signout");
  },
};
