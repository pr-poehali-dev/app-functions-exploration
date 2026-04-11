import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "../types";

interface Complaint {
  id: number;
  author_id: number;
  author_name: string;
  target_type: string;
  target_id: number;
  reason?: string;
  message?: string;
  status: string;
  admin_comment?: string;
  created_at: string;
  resolved_at?: string;
}

interface PendingUser {
  id: number;
  full_name: string;
  company_name?: string;
  role: string;
  email?: string;
  phone?: string;
  docs: Array<{ type: string; url: string; name: string }>;
  verification_status: string;
  updated_at?: string;
}

export function ComplaintsTab() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "resolved">("new");
  const [comment, setComment] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    api.social
      .complaintsAdmin(filter === "all" ? undefined : filter)
      .then((res) => setComplaints((res as { complaints: Complaint[] }).complaints || []))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: number, status: "resolved" | "rejected") => {
    try {
      await api.social.complaintResolve({ id, status, comment: comment[id] || "" });
      toast.success("Жалоба обработана");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-muted-foreground mb-4">Всего жалоб: {complaints.length}</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "new", label: "Новые" },
          { value: "resolved", label: "Решённые" },
          { value: "all", label: "Все" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as "all" | "new" | "resolved")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && complaints.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="Flag" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Жалоб нет</p>
        </div>
      )}

      {!loading && complaints.length > 0 && (
        <div className="grid gap-3">
          {complaints.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      На {c.target_type === "lot" ? "лот" : "пользователя"} #{c.target_id}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      c.status === "new"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {c.status === "new" ? "Новая" : c.status === "resolved" ? "Решена" : c.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    От: {c.author_name} · {formatDate(c.created_at)}
                  </div>
                </div>
              </div>

              {c.reason && (
                <div className="text-sm mb-2">
                  <span className="text-muted-foreground">Причина: </span>
                  <span className="font-medium">{c.reason}</span>
                </div>
              )}
              {c.message && (
                <div className="bg-background border border-border rounded-lg p-3 text-sm mb-3">
                  {c.message}
                </div>
              )}
              {c.admin_comment && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm mb-3">
                  <span className="text-xs text-muted-foreground">Решение: </span>
                  {c.admin_comment}
                </div>
              )}

              {c.status === "new" && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <input
                    value={comment[c.id] || ""}
                    onChange={(e) => setComment({ ...comment, [c.id]: e.target.value })}
                    placeholder="Комментарий администратора..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(c.id, "resolved")}
                      className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold px-4 py-2 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                    >
                      <Icon name="Check" size={12} /> Решить
                    </button>
                    <button
                      onClick={() => resolve(c.id, "rejected")}
                      className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 font-semibold px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-1"
                    >
                      <Icon name="X" size={12} /> Отклонить
                    </button>
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

export function VerificationTab() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    api.auth
      .verifyPending()
      .then((res) => setUsers((res as { users: PendingUser[] }).users || []))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (userId: number, approve: boolean) => {
    try {
      await api.auth.verifyReview({ user_id: userId, approve, comment: comment[userId] || "" });
      toast.success(approve ? "Пользователь верифицирован" : "Верификация отклонена");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-muted-foreground mb-4">Заявок на проверке: {users.length}</p>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="ShieldCheck" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Нет заявок на верификацию</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="grid gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <div className="font-semibold">{u.full_name}</div>
                  {u.company_name && <div className="text-xs text-muted-foreground">{u.company_name}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    #{u.id} · {u.email || u.phone} · {u.role === "customer" ? "Заказчик" : "Подрядчик"}
                  </div>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/20">
                  На проверке
                </span>
              </div>

              {u.docs.length > 0 && (
                <div className="space-y-2 mb-3">
                  {u.docs.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
                      <Icon name="FileText" size={14} className="text-primary" />
                      <span className="text-sm flex-1 truncate">{d.name}</span>
                      <span className="text-[11px] text-muted-foreground">{d.type}</span>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                        Открыть
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <input
                value={comment[u.id] || ""}
                onChange={(e) => setComment({ ...comment, [u.id]: e.target.value })}
                placeholder="Комментарий (опционально)..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-primary/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => review(u.id, true)}
                  className="text-xs bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1"
                >
                  <Icon name="CheckCircle2" size={12} /> Одобрить
                </button>
                <button
                  onClick={() => review(u.id, false)}
                  className="text-xs bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-1"
                >
                  <Icon name="XCircle" size={12} /> Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
