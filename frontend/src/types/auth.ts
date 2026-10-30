export type Role = "ADMIN_RH" | "RESPONSABLE";

export interface LoginPayload {
  email: string;
  password: string;
}
