import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api, saveToken, clearToken, getToken } from "@/lib/api";
import { toast } from "sonner";

type Page = "home" | "lots" | "lot_detail" | "my_lots" | "my_bids" | "profile" | "auth" | "faq" | "contacts";
type Role = "customer" | "contractor" | "admin";

interface User {
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
}

interface Lot {
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
}

interface Bid {
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

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

const formatPrice = (n?: number) => {
  if (!n) return "—";
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
};

const formatDate = (d?: string) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
};

const timeLeft = (end?: string): string => {
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

const statusLabel: Record<string, { label: string; cls: string }> = {
  active: { label: "Активный", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  moderation: { label: "На модерации", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  draft: { label: "Черновик", cls: "bg-muted text-muted-foreground border-border" },
  completed: { label: "Завершён", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  cancelled: { label: "Отменён", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  in_work: { label: "В работе", cls: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  done: { label: "Выполнен", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-xs ${s <= Math.round(rating) ? "text-primary" : "text-muted-foreground/30"}`}>★</span>
      ))}
      <span className="ml-1 text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = statusLabel[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

// ============ AUTH PAGE ============
function AuthPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    login: "",
    email: "",
    password: "",
    full_name: "",
    role: "customer" as Role,
    entity_type: "individual",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.auth.login({ login: form.login, password: form.password }) as { token: string; user: User };
        saveToken(res.token);
        onAuth(res.user);
        toast.success("Добро пожаловать!");
      } else {
        const res = await api.auth.register({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          entity_type: form.entity_type,
        }) as { token: string; user: User };
        saveToken(res.token);
        onAuth(res.user);
        toast.success("Регистрация успешна!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Icon name="Lock" size={12} />
            {mode === "login" ? "Вход в систему" : "Создание аккаунта"}
          </div>
          <h1 className="text-3xl font-black mb-2">
            {mode === "login" ? "С возвращением" : "Регистрация"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Войдите чтобы участвовать в торгах" : "Начните работать на площадке"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Я...</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["customer", "contractor"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.role === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {r === "customer" ? "Заказчик" : "Подрядчик"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ФИО / Название</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Тип лица</label>
                <select
                  value={form.entity_type}
                  onChange={(e) => setForm({ ...form, entity_type: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="individual">Физическое лицо</option>
                  <option value="self_employed">Самозанятый</option>
                  <option value="ip">ИП</option>
                  <option value="legal">Юридическое лицо</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <input
              required
              type="email"
              value={mode === "login" ? form.login : form.email}
              onChange={(e) =>
                mode === "login"
                  ? setForm({ ...form, login: e.target.value })
                  : setForm({ ...form, email: e.target.value })
              }
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="you@company.ru"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Пароль</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Минимум 6 символов"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ HOME PAGE ============
function HomePage({ onNavigate, user }: { onNavigate: (p: Page) => void; user: User | null }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [stats, setStats] = useState({ active: 0 });

  useEffect(() => {
    api.lots.list({ status: "active", per_page: 4, sort: "ending" }).then((res) => {
      const data = res as { lots: Lot[]; total: number };
      setLots(data.lots);
      setStats({ active: data.total });
    }).catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">
      <section className="relative py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Icon name="Gavel" size={12} />
            Обратный аукцион · Подрядные работы
          </div>
          <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-6 tracking-tight max-w-3xl">
            Выбирай подрядчика<br />
            по <span className="text-primary">честной цене</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Размещайте лоты, получайте ставки с понижением от проверенных подрядчиков и выбирайте лучшего исполнителя.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("lots")}
              className="bg-primary text-primary-foreground font-semibold px-7 py-3.5 rounded-lg hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Смотреть {stats.active} лотов
            </button>
            {!user ? (
              <button
                onClick={() => onNavigate("auth")}
                className="bg-secondary text-secondary-foreground font-semibold px-7 py-3.5 rounded-lg hover:bg-secondary/80 transition-all border border-border"
              >
                Начать работать
              </button>
            ) : user.role === "customer" ? (
              <button
                onClick={() => onNavigate("my_lots")}
                className="bg-secondary text-secondary-foreground font-semibold px-7 py-3.5 rounded-lg hover:bg-secondary/80 transition-all border border-border"
              >
                Разместить лот
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-12 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-8">Как это работает</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "FileText", title: "1. Заказчик размещает лот", text: "Описание работ, бюджет, сроки и срок приёма ставок" },
              { icon: "TrendingDown", title: "2. Торги на понижение", text: "Подрядчики делают ставки — побеждает лучшее предложение по цене и репутации" },
              { icon: "Handshake", title: "3. Выбор исполнителя", text: "Заказчик видит профили всех участников и сам выбирает подрядчика" },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-5 animate-slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon name={s.icon} size={18} className="text-primary" />
                </div>
                <div className="font-semibold mb-1">{s.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hot lots */}
      <section className="px-6 py-12 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Торги заканчиваются</h2>
            <button onClick={() => onNavigate("lots")} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Все лоты <Icon name="ArrowRight" size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => {
                  (window as Window & { __selectedLotId?: number }).__selectedLotId = lot.id;
                  onNavigate("lot_detail");
                }}
                className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category_name}</span>
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <Icon name="Clock" size={11} /> {timeLeft(lot.auction_end_at)}
                  </span>
                </div>
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{lot.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {lot.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{lot.city}</span>}
                  <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids_count} ставок</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Текущая ставка</div>
                    <div className="text-primary font-bold text-lg">{formatPrice(lot.current_min_bid || lot.start_price)}</div>
                  </div>
                  <Icon name="ArrowRight" size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ============ LOTS LIST PAGE ============
function LotsPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    category_id: "",
    city: "",
    sort: "new",
  });

  const loadLots = useCallback(() => {
    setLoading(true);
    api.lots.list({
      status: "active",
      search: filters.search,
      category_id: filters.category_id,
      city: filters.city,
      sort: filters.sort,
    }).then((res) => {
      setLots((res as { lots: Lot[] }).lots);
    }).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    api.lots.categories().then((res) => setCategories((res as { categories: Category[] }).categories));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadLots, 200);
    return () => clearTimeout(t);
  }, [loadLots]);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-black">Лоты на аукционе</h1>
        <span className="text-sm text-muted-foreground">{lots.length} активных</span>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-3 mb-3">
          <div className="relative md:col-span-2">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по описанию..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <input
            type="text"
            placeholder="Город"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="new">Сначала новые</option>
            <option value="ending">Скоро завершатся</option>
            <option value="price_asc">По цене ↑</option>
            <option value="price_desc">По цене ↓</option>
            <option value="bids">Больше ставок</option>
          </select>
        </div>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilters({ ...filters, category_id: "" })}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              !filters.category_id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilters({ ...filters, category_id: String(cat.id) })}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                filters.category_id === String(cat.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка лотов...
        </div>
      )}

      {!loading && lots.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
          <p>По вашему запросу лотов не найдено</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {lots.map((lot, i) => (
          <button
            key={lot.id}
            onClick={() => onOpenLot(lot.id)}
            className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-200 group animate-slide-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category_name}</span>
              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                <Icon name="Clock" size={11} /> {timeLeft(lot.auction_end_at)}
              </span>
            </div>
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{lot.title}</h3>
            {lot.description && (
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">{lot.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
              {lot.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{lot.city}</span>}
              {lot.work_duration_days && <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{lot.work_duration_days} дн.</span>}
              <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids_count} ставок</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <div className="text-[11px] text-muted-foreground">
                  {lot.current_min_bid ? "Текущая" : "Начальная"}
                </div>
                <div className="text-primary font-bold text-lg">
                  {formatPrice(lot.current_min_bid || lot.start_price)}
                </div>
              </div>
              {lot.current_min_bid && lot.current_min_bid < lot.start_price && (
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground line-through">{formatPrice(lot.start_price)}</div>
                  <div className="text-[11px] text-emerald-400 font-medium">
                    −{Math.round((1 - lot.current_min_bid / lot.start_price) * 100)}%
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ CONTRACTOR CARD (for selection screen) ============
interface ExtendedBid extends Bid {
  about?: string;
  specializations?: string[];
  experience_years?: number;
  entity_type?: string;
  reviews_count?: number;
}

function ContractorCard({
  bid,
  isWinner,
  onSelect,
  selecting,
}: {
  bid: ExtendedBid;
  isWinner: boolean;
  onSelect: () => void;
  selecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const entityLabel: Record<string, string> = {
    individual: "Физ. лицо",
    self_employed: "Самозанятый",
    ip: "ИП",
    legal: "Юр. лицо",
  };

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${
        isWinner ? "border-emerald-500/40 shadow-lg shadow-emerald-500/10" : "border-border hover:border-primary/30"
      }`}
    >
      {isWinner && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-5 py-2 flex items-center gap-2">
          <Icon name="Trophy" size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">Выбранный подрядчик</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
            {(bid.company_name || bid.contractor_name || "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{bid.company_name || bid.contractor_name}</span>
              {bid.is_verified && (
                <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
                  <Icon name="BadgeCheck" size={10} /> Проверен
                </span>
              )}
            </div>
            {bid.city && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Icon name="MapPin" size={10} /> {bid.city}
                {bid.entity_type && <span className="ml-2">{entityLabel[bid.entity_type] || bid.entity_type}</span>}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              {bid.rating !== undefined && bid.rating > 0 && <StarRating rating={bid.rating} />}
              <span className="text-xs text-muted-foreground">{bid.deals_count || 0} сделок</span>
              <span className="text-xs text-muted-foreground">{bid.reviews_count || 0} отзывов</span>
              {bid.experience_years !== undefined && bid.experience_years > 0 && (
                <span className="text-xs text-muted-foreground">{bid.experience_years} лет опыта</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-primary">{formatPrice(bid.amount)}</div>
          </div>
        </div>

        {bid.comment && (
          <div className="mt-3 bg-muted/50 rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Комментарий к ставке</div>
            <p className="text-sm">{bid.comment}</p>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border animate-fade-in space-y-3">
            {bid.about && (
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">О компании</div>
                <p className="text-sm leading-relaxed">{bid.about}</p>
              </div>
            )}
            {bid.specializations && bid.specializations.length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Специализация</div>
                <div className="flex gap-1.5 flex-wrap">
                  {bid.specializations.map((s) => (
                    <span key={s} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold">{bid.deals_count || 0}</div>
                <div className="text-[11px] text-muted-foreground">Сделок</div>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold">{bid.rating?.toFixed(1) || "—"}</div>
                <div className="text-[11px] text-muted-foreground">Рейтинг</div>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold">{bid.experience_years || 0}</div>
                <div className="text-[11px] text-muted-foreground">Лет опыта</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} />
            {expanded ? "Свернуть" : "Подробнее"}
          </button>
          {!isWinner && (
            <button
              onClick={onSelect}
              disabled={selecting}
              className="ml-auto bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {selecting ? "Выбор..." : "Выбрать подрядчика"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ LOT DETAIL PAGE ============
function LotDetailPage({ lotId, user, onBack }: { lotId: number; user: User | null; onBack: () => void }) {
  const [lot, setLot] = useState<Lot | null>(null);
  const [bids, setBids] = useState<ExtendedBid[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [bidComment, setBidComment] = useState("");
  const [placing, setPlacing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [confirmSelect, setConfirmSelect] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [sortBids, setSortBids] = useState<"price" | "rating" | "deals">("price");

  const load = useCallback(() => {
    api.lots.get(lotId).then((res) => setLot((res as { lot: Lot }).lot));
    api.bids.list(lotId).then((res) => setBids((res as { bids: ExtendedBid[] }).bids));
  }, [lotId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const placeBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Необходимо войти");
      return;
    }
    setPlacing(true);
    try {
      await api.bids.place({ lot_id: lotId, amount: parseFloat(bidAmount), comment: bidComment || undefined });
      toast.success("Ставка принята!");
      setBidAmount("");
      setBidComment("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  const selectWinner = async (contractorId: number) => {
    setSelecting(true);
    try {
      await api.bids.selectWinner({ lot_id: lotId, contractor_id: contractorId });
      toast.success("Подрядчик выбран! Уведомление отправлено.");
      setConfirmSelect(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSelecting(false);
    }
  };

  const rejectAll = async () => {
    setSelecting(true);
    try {
      await api.bids.rejectAll({ lot_id: lotId, reason: rejectReason });
      toast.success("Все предложения отклонены.");
      setShowReject(false);
      load();
    } catch {
      toast.error("Ошибка при отклонении");
    } finally {
      setSelecting(false);
    }
  };

  if (!lot) {
    return (
      <div className="text-center py-16">
        <Icon name="Loader2" size={24} className="animate-spin mx-auto" />
      </div>
    );
  }

  const currentMin = lot.current_min_bid || lot.start_price;
  const isOwner = user?.id === lot.customer_id;
  const canBid = user?.role === "contractor" && !isOwner && lot.status === "active";
  const isCompleted = lot.status === "completed";
  const isInWork = lot.status === "in_work";
  const canSelectWinner = isOwner && isCompleted && bids.length > 0;

  const sortedBids = [...bids].sort((a, b) => {
    if (sortBids === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBids === "deals") return (b.deals_count || 0) - (a.deals_count || 0);
    return a.amount - b.amount;
  });

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <Icon name="ArrowLeft" size={16} /> Назад к списку
      </button>

      {/* Winner selection banner */}
      {canSelectWinner && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Trophy" size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">Торги завершены — выберите подрядчика</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bids.length} подрядчиков подали ставки. Изучите профили, рейтинги и опыт каждого, затем выберите исполнителя. Вы не обязаны выбирать самую низкую цену.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category_name}</span>
                <h1 className="text-2xl md:text-3xl font-black mt-3 mb-2">{lot.title}</h1>
              </div>
              <StatusBadge status={lot.status} />
            </div>
            {lot.description && (
              <div className="mt-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">ОПИСАНИЕ</div>
                <p className="text-sm leading-relaxed text-foreground/90">{lot.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              {lot.city && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Город</div>
                  <div className="text-sm font-medium mt-1">{lot.city}</div>
                </div>
              )}
              {lot.object_area && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Площадь</div>
                  <div className="text-sm font-medium mt-1">{lot.object_area} м²</div>
                </div>
              )}
              {lot.work_duration_days && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Срок работ</div>
                  <div className="text-sm font-medium mt-1">{lot.work_duration_days} дн.</div>
                </div>
              )}
              {lot.warranty_months && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Гарантия</div>
                  <div className="text-sm font-medium mt-1">{lot.warranty_months} мес.</div>
                </div>
              )}
            </div>
          </div>

          {/* === CONTRACTOR SELECTION (completed lot + owner) === */}
          {canSelectWinner && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Icon name="Users" size={20} className="text-primary" />
                  Участники торгов ({bids.length})
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Сортировка:</span>
                  {(["price", "rating", "deals"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBids(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        sortBids === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {s === "price" ? "По цене" : s === "rating" ? "По рейтингу" : "По опыту"}
                    </button>
                  ))}
                </div>
              </div>

              {sortedBids.map((bid) => (
                <div key={bid.id}>
                  {confirmSelect === bid.contractor_id && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-2 animate-fade-in">
                      <p className="text-sm font-medium mb-3">
                        Вы уверены, что хотите выбрать <strong>{bid.company_name || bid.contractor_name}</strong> за <strong className="text-primary">{formatPrice(bid.amount)}</strong>?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectWinner(bid.contractor_id!)}
                          disabled={selecting}
                          className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {selecting ? "Подтверждение..." : "Подтвердить выбор"}
                        </button>
                        <button
                          onClick={() => setConfirmSelect(null)}
                          className="bg-secondary text-secondary-foreground text-sm px-4 py-2 rounded-lg border border-border"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                  <ContractorCard
                    bid={bid}
                    isWinner={lot.winner_id === bid.contractor_id}
                    onSelect={() => setConfirmSelect(bid.contractor_id!)}
                    selecting={selecting}
                  />
                </div>
              ))}

              {/* Reject all */}
              <div className="mt-4 pt-4 border-t border-border">
                {!showReject ? (
                  <button
                    onClick={() => setShowReject(true)}
                    className="text-sm text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Icon name="X" size={14} /> Отклонить все предложения
                  </button>
                ) : (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 animate-fade-in">
                    <p className="text-sm font-medium text-red-400 mb-3">Вы уверены? Лот будет отменён.</p>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Укажите причину (опционально)"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-red-500/50 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={rejectAll}
                        disabled={selecting}
                        className="bg-red-500/15 text-red-400 border border-red-500/20 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-500/25 disabled:opacity-50"
                      >
                        Отклонить всех
                      </button>
                      <button onClick={() => setShowReject(false)} className="text-sm text-muted-foreground px-4 py-2">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Winner result (in_work) */}
          {isInWork && lot.winner_id && bids.length > 0 && (
            <div className="animate-fade-in">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Icon name="Trophy" size={20} className="text-emerald-400" />
                Выбранный подрядчик
              </h2>
              {bids
                .filter((b) => b.contractor_id === lot.winner_id)
                .map((bid) => (
                  <ContractorCard key={bid.id} bid={bid} isWinner={true} onSelect={() => {}} selecting={false} />
                ))}
            </div>
          )}

          {/* Bids history (for active lots or non-owners) */}
          {!canSelectWinner && !(isInWork && lot.winner_id) && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <Icon name="TrendingDown" size={18} className="text-primary" />
                История ставок ({bids.length})
              </h2>
              {bids.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Icon name="Inbox" size={32} className="mx-auto mb-2 opacity-30" />
                  Пока нет ставок. Будьте первым!
                </div>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid, i) => {
                    const showName = bid.contractor_name && (isOwner || lot.status !== "active");
                    return (
                      <div
                        key={bid.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          i === 0 ? "bg-primary/5 border-primary/20" : "bg-background border-border"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {showName ? (
                              <span className="flex items-center gap-1.5 flex-wrap">
                                {bid.company_name || bid.contractor_name}
                                {bid.is_verified && <Icon name="BadgeCheck" size={14} className="text-primary flex-shrink-0" />}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Подрядчик #{bid.id}</span>
                            )}
                          </div>
                          {bid.comment && <div className="text-xs text-muted-foreground mt-0.5">{bid.comment}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-primary">{formatPrice(bid.amount)}</div>
                          {showName && bid.rating !== undefined && bid.rating > 0 && (
                            <StarRating rating={bid.rating} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-20">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
              {lot.current_min_bid ? "Минимальная ставка" : "Начальная цена"}
            </div>
            <div className="text-3xl font-black text-primary">{formatPrice(currentMin)}</div>
            {lot.current_min_bid && lot.current_min_bid < lot.start_price && (
              <div className="text-xs text-muted-foreground mt-1">
                Было: <span className="line-through">{formatPrice(lot.start_price)}</span>
                <span className="ml-2 text-emerald-400 font-medium">
                  −{Math.round((1 - lot.current_min_bid / lot.start_price) * 100)}%
                </span>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-border space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="Clock" size={14} /> Статус торгов</span>
                <span className={`font-semibold ${lot.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                  {lot.status === "active" ? timeLeft(lot.auction_end_at) : statusLabel[lot.status]?.label || lot.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="Users" size={14} /> Участников</span>
                <span className="font-semibold">{lot.bids_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="TrendingDown" size={14} /> Шаг</span>
                <span className="font-semibold">{formatPrice(lot.bid_step)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="Eye" size={14} /> Просмотров</span>
                <span className="font-semibold">{lot.views_count}</span>
              </div>
            </div>

            {canBid && (
              <form onSubmit={placeBid} className="mt-5 pt-5 border-t border-border space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    За сколько вы готовы выполнить эту работу? (₽)
                  </label>
                  <input
                    required
                    type="number"
                    step="1"
                    min="1"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Введите вашу цену"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                  />
                  <div className="text-[11px] text-muted-foreground mt-1.5 space-y-0.5">
                    <div>Текущая мин. ставка: <span className="font-medium text-foreground">{formatPrice(currentMin)}</span></div>
                    <div>Ваша цена должна быть ниже на {formatPrice(lot.bid_step)} или больше</div>
                  </div>
                  {bidAmount && parseFloat(bidAmount) >= currentMin && (
                    <div className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                      <Icon name="AlertCircle" size={11} /> Цена должна быть ниже {formatPrice(currentMin)}
                    </div>
                  )}
                  {bidAmount && parseFloat(bidAmount) > 0 && parseFloat(bidAmount) < currentMin && (
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Icon name="Check" size={11} /> Снижение на {Math.round((1 - parseFloat(bidAmount) / lot.start_price) * 100)}% от начальной цены
                    </div>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={bidComment}
                  onChange={(e) => setBidComment(e.target.value)}
                  placeholder="Комментарий (опционально)"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
                />
                <button
                  type="submit"
                  disabled={placing || !bidAmount || parseFloat(bidAmount) >= currentMin}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {placing ? "Отправка..." : `Предложить ${bidAmount ? formatPrice(parseFloat(bidAmount)) : "свою цену"}`}
                </button>
              </form>
            )}

            {!user && (
              <div className="mt-5 pt-5 border-t border-border text-center">
                <p className="text-xs text-muted-foreground mb-2">Войдите, чтобы подать ставку</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Заказчик</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold">
                {lot.customer_name?.[0] || "?"}
              </div>
              <div>
                <div className="font-semibold text-sm">{lot.customer_name}</div>
                <div className="text-xs text-muted-foreground">На платформе с {formatDate(lot.created_at)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MY LOTS PAGE ============
function MyLotsPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    object_type: "",
    object_area: "",
    city: "",
    address: "",
    start_price: "",
    bid_step: "1000",
    work_duration_days: "",
    auction_days: "7",
    payment_terms: "staged",
    materials_by: "customer",
    warranty_months: "12",
  });

  const load = useCallback(() => {
    api.lots.my().then((res) => setLots((res as { lots: Lot[] }).lots));
  }, []);

  useEffect(() => {
    load();
    api.lots.categories().then((res) => setCategories((res as { categories: Category[] }).categories));
  }, [load]);

  const createLot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const auctionEnd = new Date();
      auctionEnd.setDate(auctionEnd.getDate() + parseInt(form.auction_days));
      await api.lots.create({
        title: form.title,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        description: form.description,
        object_type: form.object_type,
        object_area: form.object_area ? parseFloat(form.object_area) : null,
        city: form.city,
        address: form.address,
        start_price: parseFloat(form.start_price),
        bid_step: parseFloat(form.bid_step),
        work_duration_days: form.work_duration_days ? parseInt(form.work_duration_days) : null,
        auction_end_at: auctionEnd.toISOString().replace("T", " ").slice(0, 19),
        payment_terms: form.payment_terms,
        materials_by: form.materials_by,
        warranty_months: parseInt(form.warranty_months),
        status: "active",
      });
      toast.success("Лот отправлен на модерацию!");
      setShowForm(false);
      setForm({
        ...form,
        title: "",
        description: "",
        start_price: "",
        work_duration_days: "",
      });
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-black">Мои лоты</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Icon name={showForm ? "X" : "Plus"} size={16} />
          {showForm ? "Отмена" : "Разместить лот"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createLot} className="bg-card border border-border rounded-2xl p-6 mb-8 animate-fade-in">
          <h3 className="font-bold mb-5">Новый лот</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Название работ *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Монтаж кровли 800 м²"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Категория *</label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="">Выберите</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Город *</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Москва"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Начальная стоимость (₽) *</label>
              <input
                required
                type="number"
                value={form.start_price}
                onChange={(e) => setForm({ ...form, start_price: e.target.value })}
                placeholder="1500000"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Шаг снижения (₽)</label>
              <input
                type="number"
                value={form.bid_step}
                onChange={(e) => setForm({ ...form, bid_step: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Срок работ (дней)</label>
              <input
                type="number"
                value={form.work_duration_days}
                onChange={(e) => setForm({ ...form, work_duration_days: e.target.value })}
                placeholder="30"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Длительность торгов (дней)</label>
              <select
                value={form.auction_days}
                onChange={(e) => setForm({ ...form, auction_days: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="1">1 день</option>
                <option value="3">3 дня</option>
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание работ</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Подробно опишите объём и специфику работ..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>
          </div>
          <button type="submit" className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all">
            Отправить на модерацию
          </button>
        </form>
      )}

      {lots.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Icon name="Package" size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">У вас пока нет лотов. Нажмите «Разместить лот», чтобы начать.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {lots.map((lot) => (
            <button
              key={lot.id}
              onClick={() => onOpenLot(lot.id)}
              className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="font-semibold group-hover:text-primary transition-colors">{lot.title}</div>
                <StatusBadge status={lot.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>{lot.category_name}</span>
                <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids_count} ставок</span>
                <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{lot.views_count}</span>
                <span className="ml-auto text-primary font-bold">{formatPrice(lot.current_min_bid || lot.start_price)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MY BIDS PAGE (contractor) ============
function MyBidsPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [bids, setBids] = useState<Bid[]>([]);

  useEffect(() => {
    api.bids.my().then((res) => setBids((res as { bids: Bid[] }).bids));
  }, []);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-8">Мои ставки</h1>
      {bids.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Icon name="Gavel" size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Вы пока не делали ставок.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bids.map((b) => {
            const bb = b as Bid & { lot_title: string; lot_status: string; is_winner: boolean; current_min_bid: number };
            return (
              <button
                key={b.id}
                onClick={() => bb.lot_id && onOpenLot(bb.lot_id)}
                className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="font-semibold group-hover:text-primary transition-colors">{bb.lot_title}</div>
                  <div className="flex gap-2">
                    {bb.is_winner && <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Победа</span>}
                    <StatusBadge status={bb.lot_status} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span>Ваша ставка: <strong className="text-primary">{formatPrice(b.amount)}</strong></span>
                  {bb.current_min_bid && <span>Мин. ставка: {formatPrice(bb.current_min_bid)}</span>}
                  <span className="ml-auto">{formatDate(b.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ PROFILE PAGE ============
function ProfilePage({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    company_name: user.company_name || "",
    city: user.city || "",
    about: user.about || "",
    inn: user.inn || "",
    experience_years: user.experience_years || 0,
  });

  const save = async () => {
    try {
      await api.auth.updateProfile(form);
      const res = await api.auth.me() as { user: User };
      onUpdate(res.user);
      toast.success("Профиль обновлён");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-8">Профиль</h1>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-black text-2xl flex-shrink-0">
            {user.full_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{user.full_name}</h2>
              {user.is_verified && <Icon name="BadgeCheck" size={18} className="text-primary" />}
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                {user.role === "customer" ? "Заказчик" : user.role === "contractor" ? "Подрядчик" : "Администратор"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email || user.phone}</p>
            {(user.rating ?? 0) > 0 && (
              <div className="mt-2">
                <StarRating rating={user.rating || 0} />
                <span className="text-xs text-muted-foreground ml-2">{user.reviews_count} отзывов · {user.deals_count} сделок</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-6 border-t border-border">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ФИО / Название</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Компания</label>
            <input
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Город</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ИНН</label>
            <input
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          {user.role === "contractor" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Опыт (лет)</label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">О себе / О компании</label>
            <textarea
              rows={3}
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
        </div>

        <button onClick={save} className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all">
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ============ FAQ PAGE ============
function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);
  const items = [
    { q: "Как работает обратный аукцион?", a: "Заказчик указывает максимальную цену, подрядчики делают ставки с понижением. По истечении срока торгов заказчик выбирает исполнителя — не обязательно с самой низкой ценой." },
    { q: "Как разместить лот?", a: "Зарегистрируйтесь как заказчик, перейдите в «Мои лоты» и нажмите «Разместить лот». Заполните описание, цену и сроки — лот отправится на модерацию." },
    { q: "Что такое шаг снижения?", a: "Минимальная величина, на которую новая ставка должна быть ниже предыдущей. Например, при шаге 5 000 ₽ и текущей ставке 2 000 000 ₽ следующая может быть максимум 1 995 000 ₽." },
    { q: "Видят ли подрядчики друг друга?", a: "До завершения торгов все ставки анонимны. После окончания заказчик получает полные профили всех участников." },
    { q: "Можно ли выбрать не самую низкую цену?", a: "Да. Заказчик может выбрать любого подрядчика на основе цены, рейтинга, портфолио и отзывов." },
    { q: "Какая комиссия у платформы?", a: "Комиссия 2.5% от суммы сделки, взимается только при успешном завершении работ." },
  ];
  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">Частые вопросы</h1>
      <p className="text-muted-foreground text-sm mb-10">Всё о работе платформы обратных аукционов</p>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all">
            <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
              <span className="font-semibold text-sm pr-4">{item.q}</span>
              <Icon name="ChevronDown" size={16} className={`text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4 animate-fade-in">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ CONTACTS PAGE ============
function ContactsPage() {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">Поддержка</h1>
      <p className="text-muted-foreground text-sm mb-10">Свяжитесь с нами любым удобным способом</p>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { icon: "Phone", label: "Телефон", value: "+7 (800) 555-04-71", sub: "Пн–Пт 9:00–18:00" },
          { icon: "Mail", label: "Email", value: "support@podrad.ru", sub: "Ответ в течение 2 часов" },
          { icon: "MessageSquare", label: "Telegram", value: "@podrad_support", sub: "Быстрый ответ 24/7" },
          { icon: "MapPin", label: "Офис", value: "Москва, Строителей 12", sub: "По записи" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:border-primary/30 transition-all">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name={c.icon} size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">{c.label}</div>
              <div className="font-semibold text-sm">{c.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN ============
const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const loadMe = useCallback(() => {
    if (!getToken()) return;
    api.auth.me().then((res) => setUser((res as { user: User }).user)).catch(() => clearToken());
  }, []);

  const loadNotifications = useCallback(() => {
    if (!getToken()) return;
    api.notifications.list().then((res) => {
      const d = res as { notifications: Notification[]; unread_count: number };
      setNotifications(d.notifications);
      setUnread(d.unread_count);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const t = setInterval(loadNotifications, 15000);
    return () => clearInterval(t);
  }, [user, loadNotifications]);

  const handleAuth = (u: User) => {
    setUser(u);
    setPage("home");
  };

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
    setPage("home");
    toast.success("Вы вышли из системы");
  };

  const openLot = (id: number) => {
    setSelectedLotId(id);
    setPage("lot_detail");
  };

  const markAllRead = async () => {
    await api.notifications.read();
    loadNotifications();
  };

  const navItems: { id: Page; label: string; icon: string; show: boolean }[] = [
    { id: "home", label: "Главная", icon: "Home", show: true },
    { id: "lots", label: "Лоты", icon: "Briefcase", show: true },
    { id: "my_lots", label: "Мои лоты", icon: "FolderOpen", show: user?.role === "customer" },
    { id: "my_bids", label: "Мои ставки", icon: "Gavel", show: user?.role === "contractor" },
    { id: "profile", label: "Профиль", icon: "User", show: !!user },
    { id: "faq", label: "FAQ", icon: "HelpCircle", show: true },
  ];

  return (
    <div className="min-h-screen bg-background font-golos">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <button onClick={() => setPage("home")} className="flex items-center gap-2.5 font-black text-lg tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Gavel" size={16} className="text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">ПодрядБиржа</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.filter((n) => n.show).map((n) => (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
                  page === n.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Icon name="Bell" size={18} className="text-muted-foreground" />
                    {unread > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center badge-glow">
                        {unread}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 z-50 animate-fade-in overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="font-semibold text-sm">Уведомления</span>
                        {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Прочитать все</button>}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">Уведомлений пока нет</div>
                        ) : notifications.map((n) => (
                          <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 ${!n.is_read ? "bg-primary/4" : ""}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{n.title}</p>
                              {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                              <span className="text-[11px] text-muted-foreground mt-0.5 block">{formatDate(n.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary hidden sm:block"
                  title="Выйти"
                >
                  <Icon name="LogOut" size={16} />
                </button>
                <div
                  onClick={() => setPage("profile")}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold cursor-pointer"
                >
                  {user.full_name[0]}
                </div>
              </>
            ) : (
              <button
                onClick={() => setPage("auth")}
                className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all"
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main onClick={() => notifOpen && setNotifOpen(false)}>
        {page === "home" && <HomePage onNavigate={setPage} user={user} />}
        {page === "lots" && <LotsPage onOpenLot={openLot} />}
        {page === "lot_detail" && selectedLotId && (
          <LotDetailPage lotId={selectedLotId} user={user} onBack={() => setPage("lots")} />
        )}
        {page === "my_lots" && user?.role === "customer" && <MyLotsPage onOpenLot={openLot} />}
        {page === "my_bids" && user?.role === "contractor" && <MyBidsPage onOpenLot={openLot} />}
        {page === "profile" && user && <ProfilePage user={user} onUpdate={setUser} />}
        {page === "auth" && <AuthPage onAuth={handleAuth} />}
        {page === "faq" && <FAQPage />}
        {page === "contacts" && <ContactsPage />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40">
        <div className="flex">
          {navItems.filter((n) => n.show).slice(0, 5).map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
                page === n.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon name={n.icon} size={18} />
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="md:hidden h-16" />

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-6">
        <div className="max-w-5xl mx-auto text-center text-xs text-muted-foreground">
          © 2026 ПодрядБиржа · Электронная торговая площадка ·{" "}
          <button onClick={() => setPage("faq")} className="hover:text-primary transition-colors">FAQ</button> ·{" "}
          <button onClick={() => setPage("contacts")} className="hover:text-primary transition-colors">Контакты</button>
        </div>
      </footer>
    </div>
  );
};

export default Index;