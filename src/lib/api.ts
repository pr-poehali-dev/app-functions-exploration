import func2url from "../../backend/func2url.json";

const AUTH_URL = (func2url as Record<string, string>).auth;
const LOTS_URL = (func2url as Record<string, string>).lots;
const BIDS_URL = (func2url as Record<string, string>).bids;
const NOTIF_URL = (func2url as Record<string, string>).notifications;

type JsonValue = Record<string, unknown>;

function getToken(): string | null {
  return localStorage.getItem("auction_token");
}

async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["X-Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as JsonValue).error as string || `Ошибка ${res.status}`);
  }
  return data as T;
}

export const api = {
  auth: {
    register: (body: JsonValue) =>
      request(`${AUTH_URL}?action=register`, { method: "POST", body: JSON.stringify(body) }),
    login: (body: { login: string; password: string }) =>
      request(`${AUTH_URL}?action=login`, { method: "POST", body: JSON.stringify(body) }),
    me: () => request(`${AUTH_URL}?action=me`),
    updateProfile: (body: JsonValue) =>
      request(`${AUTH_URL}?action=profile`, { method: "PUT", body: JSON.stringify(body) }),
    logout: () => request(`${AUTH_URL}?action=logout`, { method: "POST" }),
  },
  lots: {
    list: (params: Record<string, string | number | undefined> = {}) => {
      const q = new URLSearchParams({ action: "list" });
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.append(k, String(v));
      });
      return request(`${LOTS_URL}?${q.toString()}`);
    },
    get: (id: number) => request(`${LOTS_URL}?action=get&id=${id}`),
    categories: () => request(`${LOTS_URL}?action=categories`),
    create: (body: JsonValue) =>
      request(`${LOTS_URL}?action=create`, { method: "POST", body: JSON.stringify(body) }),
    update: (body: JsonValue) =>
      request(`${LOTS_URL}?action=update`, { method: "PUT", body: JSON.stringify(body) }),
    my: (status?: string) =>
      request(`${LOTS_URL}?action=my${status ? `&status=${status}` : ""}`),
    delete: (id: number) =>
      request(`${LOTS_URL}?action=delete&id=${id}`, { method: "DELETE" }),
    adminList: (params: Record<string, string | number | undefined> = {}) => {
      const q = new URLSearchParams({ action: "admin_list" });
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.append(k, String(v));
      });
      return request(`${LOTS_URL}?${q.toString()}`);
    },
    approve: (body: { id: number; action: string; reason?: string }) =>
      request(`${LOTS_URL}?action=approve`, { method: "POST", body: JSON.stringify(body) }),
    adminCategory: (body: JsonValue) =>
      request(`${LOTS_URL}?action=admin_category`, { method: "POST", body: JSON.stringify(body) }),
    adminStats: () => request(`${LOTS_URL}?action=admin_stats`),
  },
  bids: {
    place: (body: { lot_id: number; amount: number; comment?: string }) =>
      request(`${BIDS_URL}?action=place`, { method: "POST", body: JSON.stringify(body) }),
    list: (lot_id: number) => request(`${BIDS_URL}?action=list&lot_id=${lot_id}`),
    my: () => request(`${BIDS_URL}?action=my`),
    selectWinner: (body: { lot_id: number; contractor_id: number }) =>
      request(`${BIDS_URL}?action=select_winner`, { method: "POST", body: JSON.stringify(body) }),
    rejectAll: (body: { lot_id: number; reason?: string }) =>
      request(`${BIDS_URL}?action=reject_all`, { method: "POST", body: JSON.stringify(body) }),
    adminList: (params: Record<string, string | number | undefined> = {}) => {
      const q = new URLSearchParams({ action: "admin_bids" });
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.append(k, String(v));
      });
      return request(`${BIDS_URL}?${q.toString()}`);
    },
    cancelBid: (bid_id: number) =>
      request(`${BIDS_URL}?action=cancel_bid`, { method: "POST", body: JSON.stringify({ bid_id }) }),
  },
  admin: {
    users: (params: Record<string, string | number | undefined> = {}) => {
      const q = new URLSearchParams({ action: "admin_users" });
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.append(k, String(v));
      });
      return request(`${AUTH_URL}?${q.toString()}`);
    },
    blockUser: (user_id: number, block: boolean) =>
      request(`${AUTH_URL}?action=block_user`, { method: "POST", body: JSON.stringify({ user_id, block }) }),
    changeRole: (user_id: number, role: string) =>
      request(`${AUTH_URL}?action=change_role`, { method: "POST", body: JSON.stringify({ user_id, role }) }),
  },
  notifications: {
    list: () => request(`${NOTIF_URL}?action=list`),
    read: (id?: number) =>
      request(`${NOTIF_URL}?action=read`, { method: "POST", body: JSON.stringify(id ? { id } : {}) }),
  },
};

export function saveToken(token: string) {
  localStorage.setItem("auction_token", token);
}
export function clearToken() {
  localStorage.removeItem("auction_token");
}
export { getToken };