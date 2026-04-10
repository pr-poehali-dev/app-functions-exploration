import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lot, Category, formatPrice, formatDate, timeLeft, statusLabel } from "./types";

type Tab = "stats" | "lots" | "users" | "bids" | "categories";

interface AdminUser {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  city?: string;
  rating?: number;
  deals_count?: number;
  created_at: string;
  is_blocked?: boolean;
  company_name?: string;
}

interface AdminBid {
  id: number;
  lot_id: number;
  lot_title?: string;
  contractor_id?: number;
  contractor_name?: string;
  company_name?: string;
  amount: number;
  created_at: string;
  is_withdrawn?: boolean;
}

interface StatsData {
  users: {
    total: number;
    customers: number;
    contractors: number;
    new_week: number;
    by_day: { date: string; count: number }[];
  };
  lots: {
    total: number;
    active: number;
    moderation: number;
    completed: number;
    new_week: number;
    avg_price: number;
    avg_bids: number;
    total_views: number;
    by_day: { date: string; count: number }[];
  };
  bids: {
    total: number;
    new_week: number;
  };
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "bg-primary/10"}`}>
          <Icon name={icon} size={20} className={color ? "text-white" : "text-primary"} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function MiniChart({ data }: { data: { date: string; count: number }[] }) {
  const last7 = data.slice(-7);
  const max = Math.max(...last7.map((d) => d.count), 1);
  return (
    <div className="space-y-1.5">
      {last7.map((d) => (
        <div key={d.date} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-20 text-right shrink-0">
            {new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
          </span>
          <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full flex items-center justify-end pr-2 transition-all"
              style={{ width: `${Math.max((d.count / max) * 100, 8)}%` }}
            >
              <span className="text-[10px] font-bold text-primary-foreground">{d.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.lots
      .adminStats()
      .then((res) => setStats(res as StatsData))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
        Загрузка статистики...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Icon name="AlertCircle" size={32} className="mx-auto mb-3 opacity-30" />
        <p>Не удалось загрузить статистику</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          icon="Users"
          label="Всего пользователей"
          value={stats.users.total}
          sub={`Заказчики: ${stats.users.customers} / Подрядчики: ${stats.users.contractors}`}
        />
        <StatCard
          icon="Package"
          label="Всего лотов"
          value={stats.lots.total}
          sub={`Активных: ${stats.lots.active} / На модерации: ${stats.lots.moderation}`}
        />
        <StatCard
          icon="Gavel"
          label="Всего ставок"
          value={stats.bids.total}
          sub={`Новых за неделю: ${stats.bids.new_week}`}
        />
        <StatCard
          icon="TrendingUp"
          label="Средняя цена лота"
          value={formatPrice(stats.lots.avg_price)}
        />
        <StatCard
          icon="Eye"
          label="Всего просмотров"
          value={stats.lots.total_views}
        />
        <StatCard
          icon="BarChart3"
          label="Ср. ставок на лот"
          value={stats.lots.avg_bids?.toFixed(1) || "0"}
        />
        <StatCard
          icon="UserPlus"
          label="Новые пользователи (нед.)"
          value={stats.users.new_week}
        />
        <StatCard
          icon="PlusCircle"
          label="Новые лоты (нед.)"
          value={stats.lots.new_week}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Icon name="UserPlus" size={16} className="text-primary" />
            Регистрации за неделю
          </h3>
          <MiniChart data={stats.users.by_day || []} />
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Icon name="PlusCircle" size={16} className="text-primary" />
            Новые лоты за неделю
          </h3>
          <MiniChart data={stats.lots.by_day || []} />
        </div>
      </div>
    </div>
  );
}

function LotsTab({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    city: "",
    start_price: "",
    bid_step: "1000",
    work_duration_days: "",
    auction_days: "7",
    payment_terms: "staged",
    materials_by: "customer",
    warranty_months: "12",
    status: "active",
  });

  const load = useCallback(() => {
    setLoading(true);
    api.lots
      .adminList({
        status: filters.status,
        search: filters.search,
        per_page: 50,
      })
      .then((res) => {
        const d = res as { lots: Lot[]; total: number };
        setLots(d.lots);
        setTotal(d.total);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    api.lots
      .categories()
      .then((res) => setCategories((res as { categories: Category[] }).categories));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const deleteLot = async (id: number) => {
    try {
      await api.lots.delete(id);
      toast.success("Лот удалён");
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const approveLot = async (id: number) => {
    try {
      await api.lots.approve({ id, action: "approve" });
      toast.success("Лот одобрен");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const rejectLot = async (id: number) => {
    try {
      await api.lots.approve({ id, action: "reject", reason: "Отклонено администратором" });
      toast.success("Лот отклонён");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const createLot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const auctionEnd = new Date();
      auctionEnd.setDate(auctionEnd.getDate() + parseInt(form.auction_days));
      await api.lots.create({
        title: form.title,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        description: form.description,
        city: form.city,
        start_price: parseFloat(form.start_price),
        bid_step: parseFloat(form.bid_step),
        work_duration_days: form.work_duration_days ? parseInt(form.work_duration_days) : null,
        auction_end_at: auctionEnd.toISOString().replace("T", " ").slice(0, 19),
        payment_terms: form.payment_terms,
        materials_by: form.materials_by,
        warranty_months: parseInt(form.warranty_months),
        status: form.status,
      });
      toast.success("Лот создан!");
      setShowForm(false);
      setForm({ ...form, title: "", description: "", start_price: "", work_duration_days: "", city: "" });
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const statuses = [
    { value: "all", label: "Все" },
    { value: "active", label: "Активные" },
    { value: "moderation", label: "На модерации" },
    { value: "completed", label: "Завершённые" },
    { value: "in_work", label: "В работе" },
    { value: "cancelled", label: "Отменённые" },
    { value: "draft", label: "Черновики" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">Всего лотов: {total}</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Icon name={showForm ? "X" : "Plus"} size={16} />
          {showForm ? "Отмена" : "Добавить лот"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createLot} className="bg-card border border-border rounded-2xl p-6 mb-6 animate-fade-in">
          <h3 className="font-bold mb-5">Новый лот (от администратора)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Название *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Монтаж кровли 800 м²"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Категория</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="">Без категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Город</label>
              <input
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Длительность торгов</label>
              <select
                value={form.auction_days}
                onChange={(e) => setForm({ ...form, auction_days: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="1">1 день</option>
                <option value="3">3 дня</option>
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
                <option value="30">30 дней</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Статус при создании</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="active">Сразу активный</option>
                <option value="draft">Черновик</option>
                <option value="moderation">На модерацию</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Подробное описание работ..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all"
          >
            Создать лот
          </button>
        </form>
      )}

      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilters({ ...filters, status: s.value })}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  filters.status === s.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && lots.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="Package" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Лотов не найдено</p>
        </div>
      )}

      {!loading && lots.length > 0 && (
        <div className="grid gap-3">
          {lots.map((lot) => {
            const st = statusLabel[lot.status] || {
              label: lot.status,
              cls: "bg-muted text-muted-foreground border-border",
            };
            return (
              <div key={lot.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onOpenLot(lot.id)}
                      className="font-semibold hover:text-primary transition-colors text-left"
                    >
                      {lot.title}
                    </button>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>#{lot.id}</span>
                      {lot.category_name && <span>{lot.category_name}</span>}
                      {lot.city && (
                        <span className="flex items-center gap-1">
                          <Icon name="MapPin" size={10} />
                          {lot.city}
                        </span>
                      )}
                      {lot.customer_name && <span>Заказчик: {lot.customer_name}</span>}
                      <span>{formatDate(lot.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="text-primary font-bold">{formatPrice(lot.current_min_bid || lot.start_price)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Icon name="Users" size={11} />
                    {lot.bids_count} ставок
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Eye" size={11} />
                    {lot.views_count} просмотров
                  </span>
                  {lot.status === "active" && (
                    <span className="flex items-center gap-1">
                      <Icon name="Clock" size={11} />
                      {timeLeft(lot.auction_end_at)}
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    {lot.status === "moderation" && (
                      <>
                        <button
                          onClick={() => approveLot(lot.id)}
                          className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                        >
                          <Icon name="Check" size={12} /> Одобрить
                        </button>
                        <button
                          onClick={() => rejectLot(lot.id)}
                          className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg font-medium hover:bg-red-500/20 transition-all flex items-center gap-1"
                        >
                          <Icon name="X" size={12} /> Отклонить
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onOpenLot(lot.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary flex items-center gap-1"
                    >
                      <Icon name="ExternalLink" size={12} /> Открыть
                    </button>
                    {confirmDelete === lot.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => deleteLot(lot.id)}
                          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-all"
                        >
                          Да, удалить
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground px-2 py-1.5">
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(lot.id)}
                        className="text-xs text-red-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <Icon name="Trash2" size={12} /> Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [blockedFilter, setBlockedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmBlock, setConfirmBlock] = useState<number | null>(null);
  const perPage = 20;

  const load = useCallback(() => {
    setLoading(true);
    api.admin
      .users({
        role: roleFilter === "all" ? undefined : roleFilter,
        search: search || undefined,
        blocked: blockedFilter === "all" ? undefined : blockedFilter,
        page,
        per_page: perPage,
      })
      .then((res) => {
        const d = res as { users: AdminUser[]; total: number };
        setUsers(d.users || []);
        setTotal(d.total || 0);
      })
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [search, roleFilter, blockedFilter, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggleBlock = async (user: AdminUser) => {
    try {
      await api.admin.blockUser(user.id, !user.is_blocked);
      toast.success(user.is_blocked ? "Пользователь разблокирован" : "Пользователь заблокирован");
      setConfirmBlock(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const changeRole = async (userId: number, role: string) => {
    try {
      await api.admin.changeRole(userId, role);
      toast.success("Роль изменена");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const roles = [
    { value: "all", label: "Все роли" },
    { value: "customer", label: "Заказчики" },
    { value: "contractor", label: "Подрядчики" },
    { value: "admin", label: "Админы" },
  ];

  const roleLabels: Record<string, string> = {
    customer: "Заказчик",
    contractor: "Подрядчик",
    admin: "Админ",
  };

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-muted-foreground mb-4">Всего пользователей: {total}</p>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по имени, email, телефону..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setRoleFilter(r.value);
                  setPage(1);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  roleFilter === r.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[
              { value: "all", label: "Все" },
              { value: "true", label: "Заблокированные" },
              { value: "false", label: "Активные" },
            ].map((b) => (
              <button
                key={b.value}
                onClick={() => {
                  setBlockedFilter(b.value);
                  setPage(1);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  blockedFilter === b.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="Users" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Пользователей не найдено</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="grid gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`bg-card border rounded-xl p-5 transition-all ${
                user.is_blocked ? "border-red-500/30 bg-red-500/5" : "border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{user.full_name || "Без имени"}</span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                      {roleLabels[user.role] || user.role}
                    </span>
                    {user.is_blocked && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/20">
                        Заблокирован
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                    <span>#{user.id}</span>
                    {user.email && (
                      <span className="flex items-center gap-1">
                        <Icon name="Mail" size={10} />
                        {user.email}
                      </span>
                    )}
                    {user.phone && (
                      <span className="flex items-center gap-1">
                        <Icon name="Phone" size={10} />
                        {user.phone}
                      </span>
                    )}
                    {user.city && (
                      <span className="flex items-center gap-1">
                        <Icon name="MapPin" size={10} />
                        {user.city}
                      </span>
                    )}
                    {user.company_name && (
                      <span className="flex items-center gap-1">
                        <Icon name="Building2" size={10} />
                        {user.company_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {user.rating != null && (
                      <span className="flex items-center gap-1">
                        <Icon name="Star" size={10} className="text-amber-400" />
                        {user.rating?.toFixed(1)}
                      </span>
                    )}
                    {user.deals_count != null && (
                      <span className="flex items-center gap-1">
                        <Icon name="Handshake" size={10} />
                        {user.deals_count} сделок
                      </span>
                    )}
                    <span>Регистрация: {formatDate(user.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="customer">Заказчик</option>
                    <option value="contractor">Подрядчик</option>
                    <option value="admin">Админ</option>
                  </select>
                  {confirmBlock === user.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleBlock(user)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                          user.is_blocked
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                      >
                        {user.is_blocked ? "Да, разблокировать" : "Да, заблокировать"}
                      </button>
                      <button onClick={() => setConfirmBlock(null)} className="text-xs text-muted-foreground px-2 py-1.5">
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmBlock(user.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                        user.is_blocked
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
                          : "text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      }`}
                    >
                      <Icon name={user.is_blocked ? "Unlock" : "Lock"} size={12} />
                      {user.is_blocked ? "Разблокировать" : "Заблокировать"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Icon name="ChevronLeft" size={14} />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Icon name="ChevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function BidsTab() {
  const [bids, setBids] = useState<AdminBid[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lotIdFilter, setLotIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const perPage = 30;

  const load = useCallback(() => {
    setLoading(true);
    api.bids
      .adminList({
        lot_id: lotIdFilter ? parseInt(lotIdFilter) : undefined,
        search: search || undefined,
        page,
        per_page: perPage,
      })
      .then((res) => {
        const d = res as { bids: AdminBid[]; total: number };
        setBids(d.bids || []);
        setTotal(d.total || 0);
      })
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [search, lotIdFilter, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const cancelBid = async (bidId: number) => {
    try {
      await api.bids.cancelBid(bidId);
      toast.success("Ставка отменена");
      setConfirmCancel(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-muted-foreground mb-4">Всего ставок: {total}</p>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по подрядчику, компании..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="w-40">
            <input
              type="number"
              placeholder="ID лота"
              value={lotIdFilter}
              onChange={(e) => {
                setLotIdFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && bids.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="Gavel" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Ставок не найдено</p>
        </div>
      )}

      {!loading && bids.length > 0 && (
        <div className="grid gap-3">
          {bids.map((bid) => (
            <div
              key={bid.id}
              className={`bg-card border rounded-xl p-5 transition-all ${
                bid.is_withdrawn ? "border-red-500/30 opacity-60" : "border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-primary">{formatPrice(bid.amount)}</span>
                    {bid.is_withdrawn && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/20">
                        Отменена
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                    <span>#{bid.id}</span>
                    {bid.lot_title && (
                      <span className="flex items-center gap-1">
                        <Icon name="Package" size={10} />
                        Лот #{bid.lot_id}: {bid.lot_title}
                      </span>
                    )}
                    {!bid.lot_title && bid.lot_id && (
                      <span className="flex items-center gap-1">
                        <Icon name="Package" size={10} />
                        Лот #{bid.lot_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {bid.contractor_name && (
                      <span className="flex items-center gap-1">
                        <Icon name="User" size={10} />
                        {bid.contractor_name}
                      </span>
                    )}
                    {bid.company_name && (
                      <span className="flex items-center gap-1">
                        <Icon name="Building2" size={10} />
                        {bid.company_name}
                      </span>
                    )}
                    <span>{formatDate(bid.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!bid.is_withdrawn && (
                    <>
                      {confirmCancel === bid.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => cancelBid(bid.id)}
                            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-all"
                          >
                            Да, отменить
                          </button>
                          <button
                            onClick={() => setConfirmCancel(null)}
                            className="text-xs text-muted-foreground px-2 py-1.5"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancel(bid.id)}
                          className="text-xs text-red-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 flex items-center gap-1"
                        >
                          <Icon name="XCircle" size={12} /> Отменить ставку
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Icon name="ChevronLeft" size={14} />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Icon name="ChevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<(Category & { sort_order?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.lots
      .categories()
      .then((res) => {
        const d = res as { categories: (Category & { sort_order?: number })[] };
        setCategories(d.categories || []);
      })
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.lots.adminCategory({
        cat_action: "create",
        name: newName.trim(),
        sort_order: newSort ? parseInt(newSort) : undefined,
      });
      toast.success("Категория создана");
      setNewName("");
      setNewSort("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const updateCategory = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api.lots.adminCategory({
        cat_action: "update",
        id,
        name: editName.trim(),
        sort_order: editSort ? parseInt(editSort) : undefined,
      });
      toast.success("Категория обновлена");
      setEditId(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await api.lots.adminCategory({ cat_action: "delete", id });
      toast.success("Категория удалена");
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const startEdit = (cat: Category & { sort_order?: number }) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditSort(cat.sort_order?.toString() || "");
  };

  return (
    <div className="animate-fade-in">
      <form onSubmit={createCategory} className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Icon name="PlusCircle" size={16} className="text-primary" />
          Добавить категорию
        </h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Название *</label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название категории"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="w-32">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Сортировка</label>
            <input
              type="number"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              placeholder="0"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
            Создать
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="FolderOpen" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Категорий пока нет</p>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
              {editId === cat.id ? (
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Название</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Сортировка</label>
                    <input
                      type="number"
                      value={editSort}
                      onChange={(e) => setEditSort(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <button
                    onClick={() => updateCategory(cat.id)}
                    className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1 text-sm"
                  >
                    <Icon name="Check" size={14} /> Сохранить
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="text-sm text-muted-foreground px-3 py-2.5 hover:text-foreground transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon name="Folder" size={16} className="text-primary shrink-0" />
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ID: {cat.id} {cat.slug && `/ ${cat.slug}`}
                        {cat.sort_order != null && ` / Порядок: ${cat.sort_order}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary flex items-center gap-1"
                    >
                      <Icon name="Pencil" size={12} /> Изменить
                    </button>
                    {confirmDelete === cat.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-all"
                        >
                          Да, удалить
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-muted-foreground px-2 py-1.5"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(cat.id)}
                        className="text-xs text-red-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <Icon name="Trash2" size={12} /> Удалить
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stats", label: "Статистика", icon: "BarChart3" },
  { id: "lots", label: "Лоты", icon: "Package" },
  { id: "users", label: "Пользователи", icon: "Users" },
  { id: "bids", label: "Ставки", icon: "Gavel" },
  { id: "categories", label: "Категории", icon: "FolderOpen" },
];

export function AdminPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Icon name="Shield" size={24} className="text-primary" />
          Панель администратора
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Управление платформой</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === "stats" && <StatsTab />}
        {tab === "lots" && <LotsTab onOpenLot={onOpenLot} />}
        {tab === "users" && <UsersTab />}
        {tab === "bids" && <BidsTab />}
        {tab === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}
