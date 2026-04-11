import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Category } from "../types";

interface Subscription {
  id: number;
  category_id?: number;
  city?: string;
  category_name?: string;
  created_at: string;
}

export function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState<string>("");
  const [newCity, setNewCity] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.social
      .subList()
      .then((res) => setSubs((res as { subscriptions: Subscription[] }).subscriptions || []))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.lots
      .categories()
      .then((res) => setCategories((res as { categories: Category[] }).categories || []));
  }, [load]);

  const addSub = async () => {
    if (!newCat && !newCity) {
      toast.error("Укажите категорию или город");
      return;
    }
    setSaving(true);
    try {
      await api.social.subCreate({
        category_id: newCat ? parseInt(newCat) : undefined,
        city: newCity || undefined,
      });
      toast.success("Подписка добавлена");
      setNewCat("");
      setNewCity("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: number) => {
    try {
      await api.social.subArchive(id);
      toast.success("Подписка удалена");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2.5">
          <Icon name="BellRing" size={28} className="text-primary" />
          Подписки на лоты
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Получайте уведомления о новых лотах в выбранной категории и городе
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Icon name="Plus" size={16} className="text-primary" />
          Добавить подписку
        </h3>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Категория</label>
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="">Любая категория</option>
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
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Любой город"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={addSub}
            disabled={saving}
            className="self-end bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name={saving ? "Loader2" : "Check"} size={14} className={saving ? "animate-spin" : ""} />
            Сохранить
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && subs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="BellOff" size={40} className="mx-auto mb-3 opacity-30" />
          <p>У вас пока нет подписок</p>
        </div>
      )}

      {!loading && subs.length > 0 && (
        <div className="grid gap-3">
          {subs.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name="Bell" size={16} className="text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {s.category_name || "Любая категория"}
                    {s.city ? ` · ${s.city}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Подписка активна
                  </div>
                </div>
              </div>
              <button
                onClick={() => archive(s.id)}
                className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                title="Отписаться"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
