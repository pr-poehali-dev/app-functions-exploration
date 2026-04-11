import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, formatPrice } from "../types";

interface ContractorStats {
  total_bids: number;
  unique_lots: number;
  wins: number;
  avg_check: number;
  total_revenue: number;
  conversion: number;
  bids_by_day: { date: string; count: number }[];
  recent_wins: { id: number; title: string; amount: number; status: string }[];
}

interface CustomerStats {
  total_lots: number;
  active_lots: number;
  closed_lots: number;
  savings: number;
  savings_pct: number;
  avg_participants: number;
  lots_by_day: { date: string; count: number }[];
}

function Card({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "bg-primary/10"}`}>
          <Icon name={icon} size={20} className="text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function MiniChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Нет данных за последние 30 дней</p>;
  }
  const last = data.slice(-14);
  const max = Math.max(...last.map((d) => d.count), 1);
  return (
    <div className="space-y-1.5">
      {last.map((d) => (
        <div key={d.date} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-20 text-right shrink-0">
            {new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
          </span>
          <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full flex items-center justify-end pr-2"
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

export function DashboardPage({ user, onOpenLot }: { user: User; onOpenLot: (id: number) => void }) {
  const [contractorStats, setContractorStats] = useState<ContractorStats | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const promise = user.role === "contractor"
      ? api.social.dashboardContractor().then((r) => setContractorStats(r as ContractorStats))
      : api.social.dashboardCustomer().then((r) => setCustomerStats(r as CustomerStats));
    promise
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [user.role]);

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
        Загрузка...
      </div>
    );
  }

  if (user.role === "contractor" && contractorStats) {
    const s = contractorStats;
    return (
      <div className="animate-fade-in max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2.5">
            <Icon name="BarChart3" size={28} className="text-primary" />
            Дашборд подрядчика
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ваша активность и статистика</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <Card icon="Gavel" label="Всего ставок" value={s.total_bids} sub={`На ${s.unique_lots} лотах`} />
          <Card icon="Trophy" label="Победы" value={s.wins} sub={`Конверсия ${s.conversion}%`} />
          <Card icon="TrendingUp" label="Средний чек" value={formatPrice(s.avg_check)} />
          <Card icon="Wallet" label="Общий доход" value={formatPrice(s.total_revenue)} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Icon name="Activity" size={16} className="text-primary" />
              Активность за 2 недели
            </h3>
            <MiniChart data={s.bids_by_day} />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Icon name="Trophy" size={16} className="text-primary" />
              Последние победы
            </h3>
            {s.recent_wins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет побед</p>
            ) : (
              <div className="space-y-2">
                {s.recent_wins.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onOpenLot(w.id)}
                    className="w-full text-left bg-background border border-border rounded-lg p-3 hover:border-primary/40 transition-all"
                  >
                    <div className="font-medium text-sm truncate">{w.title}</div>
                    <div className="text-xs text-primary font-bold mt-0.5">{formatPrice(w.amount)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (user.role === "customer" && customerStats) {
    const s = customerStats;
    return (
      <div className="animate-fade-in max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2.5">
            <Icon name="BarChart3" size={28} className="text-primary" />
            Дашборд заказчика
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ваша экономия и статистика по лотам</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <Card icon="Package" label="Всего лотов" value={s.total_lots} sub={`Активных: ${s.active_lots}`} />
          <Card icon="CheckCircle2" label="Завершённых" value={s.closed_lots} />
          <Card icon="PiggyBank" label="Сэкономлено" value={formatPrice(s.savings)} sub={`${s.savings_pct}% от начальной цены`} />
          <Card icon="Users" label="Ставок на лот" value={s.avg_participants} sub="В среднем" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Icon name="Activity" size={16} className="text-primary" />
            Публикации лотов за 2 недели
          </h3>
          <MiniChart data={s.lots_by_day} />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-20 text-muted-foreground">
      <Icon name="AlertCircle" size={40} className="mx-auto mb-3 opacity-30" />
      <p>Дашборд доступен только заказчикам и подрядчикам</p>
    </div>
  );
}
