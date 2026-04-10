import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Category, formatPrice, formatDate } from "../types";

export interface AdminBid {
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

export function BidsTab() {
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

export function CategoriesTab() {
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
