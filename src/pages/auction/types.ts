export type Page = "home" | "lots" | "lot_detail" | "my_lots" | "my_bids" | "profile" | "auth" | "faq" | "contacts" | "admin" | "contractors" | "contractor_detail" | "favorites" | "subscriptions" | "dashboard";
export type Role = "customer" | "contractor" | "admin";

export type Badge = "vip" | "gost";

export const BADGE_INFO: Record<Badge, { label: string; description: string; icon: string; cls: string }> = {
  vip: {
    label: "VIP",
    description: "Исполнитель работает с премиум сегментом",
    icon: "Crown",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30"
  },
  gost: {
    label: "Русский стандарт",
    description: "Исполнитель выполняет работы строго по ГОСТу и СНиПам",
    icon: "ShieldCheck",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30"
  }
};

export interface User {
  id: number;
  email?: string;
  phone?: string;
  role: Role;
  full_name: string;
  company_name?: string;
  city?: string;
  region?: string;
  rating?: number;
  reviews_count?: number;
  deals_count?: number;
  is_verified?: boolean;
  about?: string;
  specializations?: string[];
  experience_years?: number;
  entity_type?: string;
  inn?: string;
  rating_points?: number;
  badges?: Badge[];
  work_photos?: string[];
  verification_status?: "none" | "pending" | "verified" | "rejected";
  verification_docs?: Array<{ type: string; url: string; name: string }>;
  verification_comment?: string;
}

export interface LotAttachment {
  url: string;
  name: string;
  size?: number;
}

export interface Review {
  id: number;
  lot_id: number;
  author_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  author_name: string;
  author_company?: string;
  author_role: Role;
  lot_title?: string;
}

export interface Contractor {
  id: number;
  full_name: string;
  company_name?: string;
  city?: string;
  region?: string;
  entity_type?: string;
  avatar_url?: string;
  about?: string;
  specializations?: string[];
  experience_years?: number;
  rating?: number;
  reviews_count?: number;
  deals_count?: number;
  is_verified?: boolean;
  rating_points: number;
  badges: Badge[];
  work_photos: string[];
  created_at?: string;
}

export interface Lot {
  id: number;
  customer_id: number;
  title: string;
  category_id?: number;
  category_name?: string;
  description?: string;
  object_type?: string;
  object_area?: number;
  address?: string;
  city?: string;
  region?: string;
  start_price: number;
  current_min_bid?: number;
  bid_step: number;
  work_duration_days?: number;
  auction_end_at: string;
  payment_terms?: string;
  materials_by?: string;
  warranty_months?: number;
  status: string;
  bids_count: number;
  views_count: number;
  customer_name?: string;
  winner_id?: number;
  created_at: string;
  object_photos?: string[];
  attachments?: LotAttachment[];
}

export interface Bid {
  id: number;
  lot_id?: number;
  contractor_id?: number;
  amount: number;
  comment?: string;
  created_at: string;
  contractor_name?: string;
  company_name?: string;
  rating?: number;
  deals_count?: number;
  is_verified?: boolean;
  city?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

export interface ExtendedBid extends Bid {
  about?: string;
  specializations?: string[];
  experience_years?: number;
  entity_type?: string;
  reviews_count?: number;
  rating_points?: number;
  badges?: Badge[];
  work_photos?: string[];
}

export const formatPrice = (n?: number) => {
  if (!n) return "—";
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
};

export const formatDate = (d?: string) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
};

export const timeLeft = (end?: string): string => {
  if (!end) return "—";
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return "Завершён";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
};

export const statusLabel: Record<string, { label: string; cls: string }> = {
  active: { label: "Активный", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  moderation: { label: "На модерации", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  draft: { label: "Черновик", cls: "bg-muted text-muted-foreground border-border" },
  completed: { label: "Завершён", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  cancelled: { label: "Отменён", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  in_work: { label: "В работе", cls: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  done: { label: "Выполнен", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};