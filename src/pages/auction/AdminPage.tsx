import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lot, Category, formatPrice, formatDate, timeLeft, statusLabel } from "./types";

export function AdminPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
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
    api.lots.adminList({
      status: filters.status,
      search: filters.search,
      per_page: 50,
    }).then((res) => {
      const d = res as { lots: Lot[]; total: number };
      setLots(d.lots);
      setTotal(d.total);
    }).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    api.lots.categories().then((res) => setCategories((res as { categories: Category[] }).categories));
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
    <div className="animate-fade-in max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Icon name="Shield" size={24} className="text-primary" />
            Управление лотами
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Всего лотов: {total}</p>
        </div>
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
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <button type="submit" className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all">
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
            const st = statusLabel[lot.status] || { label: lot.status, cls: "bg-muted text-muted-foreground border-border" };
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
                      {lot.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={10} />{lot.city}</span>}
                      {lot.customer_name && <span>Заказчик: {lot.customer_name}</span>}
                      <span>{formatDate(lot.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    <span className="text-primary font-bold">{formatPrice(lot.current_min_bid || lot.start_price)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids_count} ставок</span>
                  <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{lot.views_count} просмотров</span>
                  {lot.status === "active" && (
                    <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{timeLeft(lot.auction_end_at)}</span>
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
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-muted-foreground px-2 py-1.5"
                        >
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
