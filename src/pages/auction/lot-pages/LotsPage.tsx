import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { Lot, Category, formatPrice, timeLeft } from "../types";

export function LotsPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState(() => {
    const w = window as Window & {
      __homeSearch?: string;
      __homeCategoryId?: number;
      __homeCity?: string;
      __homeSort?: string;
      __homeMinPrice?: string;
      __homeMaxPrice?: string;
    };
    const initial = {
      search: w.__homeSearch || "",
      category_id: w.__homeCategoryId ? String(w.__homeCategoryId) : "",
      city: w.__homeCity || "",
      sort: w.__homeSort || "new",
      min_price: w.__homeMinPrice || "",
      max_price: w.__homeMaxPrice || "",
    };
    w.__homeSearch = undefined;
    w.__homeCategoryId = undefined;
    w.__homeCity = undefined;
    w.__homeSort = undefined;
    w.__homeMinPrice = undefined;
    w.__homeMaxPrice = undefined;
    return initial;
  });

  const loadLots = useCallback(() => {
    setLoading(true);
    api.lots.list({
      status: "active",
      search: filters.search,
      category_id: filters.category_id,
      city: filters.city,
      sort: filters.sort,
      min_price: filters.min_price,
      max_price: filters.max_price,
      per_page: 50,
    }).then((res) => {
      const d = res as { lots: Lot[]; total: number };
      setLots(d.lots);
      setTotal(d.total);
    }).finally(() => setLoading(false));
  }, [filters]);

  const resetFilters = () => {
    setFilters({ search: "", category_id: "", city: "", sort: "new", min_price: "", max_price: "" });
  };

  const hasActiveFilters = !!(filters.search || filters.category_id || filters.city || filters.min_price || filters.max_price);

  useEffect(() => {
    api.lots.categories().then((res) => setCategories((res as { categories: Category[] }).categories));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadLots, 200);
    return () => clearTimeout(t);
  }, [loadLots]);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Лоты на аукционе</h1>
          <p className="text-sm text-muted-foreground mt-1">Найдено: <span className="font-semibold text-foreground">{total}</span></p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="grid md:grid-cols-[1fr_180px_180px_auto] gap-3 mb-3">
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <Icon name="MapPin" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Город"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="new">Сначала новые</option>
            <option value="ending">Скоро завершатся</option>
            <option value="price_asc">Цена: дешёвые</option>
            <option value="price_desc">Цена: дорогие</option>
            <option value="bids">Больше ставок</option>
          </select>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-xs font-medium px-4 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              showAdvanced || filters.min_price || filters.max_price
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            <Icon name="SlidersHorizontal" size={14} />
            Фильтры
          </button>
        </div>

        {showAdvanced && (
          <div className="pt-3 mt-3 border-t border-border animate-fade-in">
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Цена от (₽)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.min_price}
                  onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Цена до (₽)</label>
                <input
                  type="number"
                  placeholder="Без ограничения"
                  value={filters.max_price}
                  onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground self-center mr-1">Быстрый выбор:</span>
              {[
                { min: "", max: "100000", label: "до 100к" },
                { min: "100000", max: "500000", label: "100к — 500к" },
                { min: "500000", max: "1000000", label: "500к — 1 млн" },
                { min: "1000000", max: "5000000", label: "1 — 5 млн" },
                { min: "5000000", max: "", label: "от 5 млн" },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() => setFilters({ ...filters, min_price: r.min, max_price: r.max })}
                  className="text-[11px] bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 flex-wrap mt-3">
          <button
            onClick={() => setFilters({ ...filters, category_id: "" })}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              !filters.category_id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            Все категории
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

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              Активных фильтров: {[filters.search, filters.category_id, filters.city, filters.min_price, filters.max_price].filter(Boolean).length}
            </span>
            <button
              onClick={resetFilters}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <Icon name="X" size={12} />
              Сбросить всё
            </button>
          </div>
        )}
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

export default LotsPage;
