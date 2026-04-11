import func2url from "../../backend/func2url.json";

const AUTH_URL = (func2url as Record<string, string>).auth;
const LOTS_URL = (func2url as Record<string, string>).lots;
const BIDS_URL = (func2url as Record<string, string>).bids;
const NOTIF_URL = (func2url as Record<string, string>).notifications;
const SOCIAL_URL = (func2url as Record<string, string>).social;

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
    switchRole: (role: "customer" | "contractor") =>
      request(`${AUTH_URL}?action=switch_role`, { method: "POST", body: JSON.stringify({ role }) }),
    logout: () => request(`${AUTH_URL}?action=logout`, { method: "POST" }),
    contractors: (params: Record<string, string | number | undefined> = {}) => {
      const q = new URLSearchParams({ action: "contractors" });
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.append(k, String(v));
      });
      return request(`${AUTH_URL}?${q.toString()}`);
    },
    contractor: (id: number) => request(`${AUTH_URL}?action=contractor&id=${id}`),
    uploadPhoto: (data: string, ext: string) =>
      request(`${AUTH_URL}?action=upload_photo`, { method: "POST", body: JSON.stringify({ data, ext }) }),
    removePhoto: (url: string) =>
      request(`${AUTH_URL}?action=remove_photo`, { method: "POST", body: JSON.stringify({ url }) }),
    verifyUpload: (body: { data: string; filename: string; doc_type: string }) =>
      request(`${AUTH_URL}?action=verify_upload`, { method: "POST", body: JSON.stringify(body) }),
    verifyPending: () => request(`${AUTH_URL}?action=verify_pending`),
    verifyReview: (body: { user_id: number; approve: boolean; comment?: string }) =>
      request(`${AUTH_URL}?action=verify_review`, { method: "POST", body: JSON.stringify(body) }),
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
    uploadFile: (body: { data: string; filename: string; kind: string }) =>
      request(`${LOTS_URL}?action=upload_file`, { method: "POST", body: JSON.stringify(body) }),
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
    awardBadge: (user_id: number, badge: string, grant: boolean) =>
      request(`${AUTH_URL}?action=award_badge`, { method: "POST", body: JSON.stringify({ user_id, badge, grant }) }),
  },
  notifications: {
    list: () => request(`${NOTIF_URL}?action=list`),
    read: (id?: number) =>
      request(`${NOTIF_URL}?action=read`, { method: "POST", body: JSON.stringify(id ? { id } : {}) }),
  },
  social: {
    reviews: (user_id: number) => request(`${SOCIAL_URL}?action=reviews&user_id=${user_id}`),
    reviewCreate: (body: { lot_id: number; target_id: number; rating: number; comment?: string }) =>
      request(`${SOCIAL_URL}?action=review_create`, { method: "POST", body: JSON.stringify(body) }),
    reviewCheck: (lot_id: number, target_id: number) =>
      request(`${SOCIAL_URL}?action=review_check&lot_id=${lot_id}&target_id=${target_id}`),
    complaintCreate: (body: { target_type: "lot" | "user"; target_id: number; reason: string; message?: string }) =>
      request(`${SOCIAL_URL}?action=complaint_create`, { method: "POST", body: JSON.stringify(body) }),
    complaintsAdmin: (status?: string) =>
      request(`${SOCIAL_URL}?action=complaints_admin${status ? `&status=${status}` : ""}`),
    complaintResolve: (body: { id: number; status: string; comment?: string }) =>
      request(`${SOCIAL_URL}?action=complaint_resolve`, { method: "POST", body: JSON.stringify(body) }),
    favLot: (lot_id: number, add: boolean) =>
      request(`${SOCIAL_URL}?action=fav_lot`, { method: "POST", body: JSON.stringify({ lot_id, add }) }),
    favLots: () => request(`${SOCIAL_URL}?action=fav_lots`),
    favCheck: (lot_id: number) => request(`${SOCIAL_URL}?action=fav_check&lot_id=${lot_id}`),
    favContractor: (contractor_id: number, add: boolean) =>
      request(`${SOCIAL_URL}?action=fav_contractor`, { method: "POST", body: JSON.stringify({ contractor_id, add }) }),
    favContractors: () => request(`${SOCIAL_URL}?action=fav_contractors`),
    favContractorCheck: (id: number) =>
      request(`${SOCIAL_URL}?action=fav_contractor_check&id=${id}`),
    subCreate: (body: { category_id?: number; city?: string }) =>
      request(`${SOCIAL_URL}?action=sub_create`, { method: "POST", body: JSON.stringify(body) }),
    subList: () => request(`${SOCIAL_URL}?action=sub_list`),
    subArchive: (id: number) =>
      request(`${SOCIAL_URL}?action=sub_archive`, { method: "POST", body: JSON.stringify({ id }) }),
    dashboardContractor: () => request(`${SOCIAL_URL}?action=dashboard_contractor`),
    dashboardCustomer: () => request(`${SOCIAL_URL}?action=dashboard_customer`),
    homeStats: () => request(`${SOCIAL_URL}?action=home_stats`),
  },
};

export function saveToken(token: string) {
  localStorage.setItem("auction_token", token);
}
export function clearToken() {
  localStorage.removeItem("auction_token");
}
export { getToken };