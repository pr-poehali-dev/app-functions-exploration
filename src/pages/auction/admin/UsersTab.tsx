import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, Badge, BADGE_INFO } from "../types";

export interface AdminUser {
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
  rating_points?: number;
  badges?: Badge[];
}

export function UsersTab() {
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

  const toggleBadge = async (userId: number, badge: Badge, currentBadges: Badge[]) => {
    const has = currentBadges.includes(badge);
    try {
      await api.admin.awardBadge(userId, badge, !has);
      toast.success(has ? "Знак отличия снят" : "Знак отличия присвоен");
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
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <Icon name="Award" size={10} />
                      {user.rating_points || 0} б.
                    </span>
                    {user.rating != null && user.rating > 0 && (
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
                  {user.role === "contractor" && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {(["vip", "gost"] as Badge[]).map((b) => {
                        const info = BADGE_INFO[b];
                        const has = (user.badges || []).includes(b);
                        return (
                          <button
                            key={b}
                            onClick={() => toggleBadge(user.id, b, user.badges || [])}
                            title={info.description}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-all ${
                              has ? info.cls : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                            }`}
                          >
                            <Icon name={has ? info.icon : "Plus"} size={10} />
                            {info.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
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