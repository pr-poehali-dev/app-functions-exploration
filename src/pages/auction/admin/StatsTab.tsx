import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatPrice } from "../types";

export interface StatsData {
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

export function StatsTab() {
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
