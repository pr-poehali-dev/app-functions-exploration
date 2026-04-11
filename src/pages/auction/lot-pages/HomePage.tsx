import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { User, Lot, Category, Page, formatPrice, timeLeft } from "../types";

interface HomeStats {
  active_lots: number;
  contractors: number;
  completed: number;
  total_savings: number;
  avg_savings_pct: number;
  recent_reviews: Array<{
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    author_name: string;
    author_company?: string;
    author_role: string;
    lot_title?: string;
  }>;
  top_contractors: Array<{
    id: number;
    full_name: string;
    company_name?: string;
    city?: string;
    rating_points: number;
    badges: string[];
    deals_count: number;
    specializations: string[];
    work_photos: string[];
    is_verified: boolean;
  }>;
  top_categories: Array<{ id: number; name: string; slug: string; lots_count: number }>;
  activity: Array<{ type: string; created_at: string; user_name: string; lot_title: string; lot_id: number }>;
}

export function LotCardMini({ lot, onClick }: { lot: Lot; onClick: () => void }) {
  const now = Date.now();
  const end = new Date(lot.auction_end_at).getTime();
  const isUrgent = end - now < 3600 * 1000 && end > now;
  const discountPct = lot.current_min_bid && lot.current_min_bid < lot.start_price
    ? Math.round((1 - lot.current_min_bid / lot.start_price) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className="text-left bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden"
    >
      {isUrgent && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1 animate-pulse">
          <Icon name="Flame" size={10} />
          ГОРИТ
        </div>
      )}
      {discountPct > 0 && !isUrgent && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
          −{discountPct}%
        </div>
      )}
      <div className="flex items-start justify-between mb-3 mt-1">
        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category_name || "Работы"}</span>
        <span className={`text-[11px] font-medium flex items-center gap-1 ${isUrgent ? "text-red-400" : "text-primary"}`}>
          <Icon name="Clock" size={11} /> {timeLeft(lot.auction_end_at)}
        </span>
      </div>
      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">{lot.title}</h3>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
        {lot.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{lot.city}</span>}
        <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids_count}</span>
        <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{lot.views_count}</span>
      </div>
      <div className="flex items-end justify-between pt-3 border-t border-border">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Текущая ставка</div>
          <div className="text-primary font-black text-xl">{formatPrice(lot.current_min_bid || lot.start_price)}</div>
          {discountPct > 0 && (
            <div className="text-[11px] text-muted-foreground line-through">{formatPrice(lot.start_price)}</div>
          )}
        </div>
        <Icon name="ArrowRight" size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

export function HomePage({ onNavigate, user, onOpenLot }: { onNavigate: (p: Page) => void; user: User | null; onOpenLot: (id: number) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [myLots, setMyLots] = useState<Lot[]>([]);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [heroFilters, setHeroFilters] = useState({
    search: "",
    category_id: "",
    city: "",
    sort: "new",
    min_price: "",
    max_price: "",
  });

  const heroHasActiveFilters = !!(
    heroFilters.search || heroFilters.category_id || heroFilters.city || heroFilters.min_price || heroFilters.max_price
  );

  const resetHeroFilters = () => {
    setHeroFilters({ search: "", category_id: "", city: "", sort: "new", min_price: "", max_price: "" });
  };

  useEffect(() => {
    api.lots.list({ status: "active", per_page: 6, sort: "ending" }).then((res) => {
      setLots((res as { lots: Lot[] }).lots);
    }).catch(() => {});
    api.social.homeStats().then((res) => setStats(res as HomeStats)).catch(() => {});
    api.lots.categories().then((res) => setHomeCategories((res as { categories: Category[] }).categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setMyLots([]);
      return;
    }
    if (user.role === "customer") {
      api.lots.my().then((res) => {
        const all = (res as { lots: Lot[] }).lots || [];
        setMyLots(all.filter((l) => l.status === "active" || l.status === "moderation").slice(0, 3));
      }).catch(() => {});
    } else if (user.role === "contractor" && user.city) {
      api.lots.list({ status: "active", city: user.city, per_page: 3, sort: "new" }).then((res) => {
        setMyLots((res as { lots: Lot[] }).lots);
      }).catch(() => {});
    }
  }, [user]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const w = window as Window & {
      __homeSearch?: string;
      __homeCategoryId?: number;
      __homeCity?: string;
      __homeSort?: string;
      __homeMinPrice?: string;
      __homeMaxPrice?: string;
    };
    if (heroFilters.search.trim()) w.__homeSearch = heroFilters.search.trim();
    if (heroFilters.category_id) w.__homeCategoryId = parseInt(heroFilters.category_id);
    if (heroFilters.city.trim()) w.__homeCity = heroFilters.city.trim();
    if (heroFilters.sort && heroFilters.sort !== "new") w.__homeSort = heroFilters.sort;
    if (heroFilters.min_price) w.__homeMinPrice = heroFilters.min_price;
    if (heroFilters.max_price) w.__homeMaxPrice = heroFilters.max_price;
    onNavigate("lots");
  };

  const activeLots = stats?.active_lots || 0;
  const contractorsCount = stats?.contractors || 0;
  const avgSavings = stats?.avg_savings_pct || 0;

  const faqItems = [
    {
      q: "Сколько стоит разместить лот?",
      a: "Размещение и участие в торгах бесплатно для всех участников. Площадка берёт небольшую комиссию только с успешных сделок.",
    },
    {
      q: "Как платформа проверяет подрядчиков?",
      a: "У нас система верификации: паспорт, ИНН, ОГРН. Проверенные подрядчики получают значок «Проверен». Также работает рейтинг отзывов.",
    },
    {
      q: "Что если подрядчик сорвёт сроки?",
      a: "Вы можете оставить негативный отзыв, подать жалобу в администрацию. Мы блокируем недобросовестных исполнителей.",
    },
    {
      q: "Могу ли я выбрать не самого дешёвого?",
      a: "Да, выбор полностью за заказчиком. Вы видите все профили участников — рейтинг, отзывы, портфолио, опыт и цену.",
    },
    {
      q: "Как работает рейтинг?",
      a: "Подрядчики зарабатывают баллы: 100 за заполненный профиль, 200 за выигранный лот, 100 ежемесячно, 500 за каждый знак отличия от администрации.",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <section className="relative px-6 py-14 md:py-20 overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          {/* LEFT: Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-card border border-border text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-muted-foreground">Сейчас онлайн</span>
              <span className="font-bold text-primary">{activeLots}</span>
              <span className="text-muted-foreground">лотов</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] mb-5 tracking-tight">
              Аукцион <span className="text-primary">подрядных работ</span>.
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-foreground/90 mb-4 leading-snug">
              Заказчик экономит — подрядчик зарабатывает.
            </p>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-xl">
              Размещайте лоты и получайте ставки с понижением от проверенных подрядчиков. Средняя экономия <span className="text-primary font-bold">{avgSavings}%</span> от начальной цены.
            </p>

            {/* Feature pills */}
            <div className="grid sm:grid-cols-3 gap-3 mb-8 max-w-xl">
              {[
                { icon: "ShieldCheck", title: "Проверенные", text: "Верификация ИНН, паспорта, ОГРН" },
                { icon: "TrendingDown", title: "Торги вниз", text: "Цена снижается, не растёт" },
                { icon: "Wallet", title: "Без комиссий", text: "Участие бесплатное" },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name={f.icon} size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{f.title}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Preview card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
              <div className="bg-muted/40 border-b border-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                  </div>
                  <span className="text-[11px] text-muted-foreground ml-2">Лот №1247</span>
                </div>
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Icon name="Flame" size={10} /> LIVE
                </span>
              </div>
              <div className="p-5">
                <div className="text-[11px] text-muted-foreground bg-muted inline-block px-2 py-0.5 rounded-md mb-2">Кровельные работы</div>
                <h3 className="font-bold text-lg mb-1 leading-snug">Монтаж кровли склада, 1200 м²</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
                  <span className="flex items-center gap-1"><Icon name="MapPin" size={11} /> Казань</span>
                  <span className="flex items-center gap-1"><Icon name="Clock" size={11} className="text-primary" /> 2ч 14м</span>
                  <span className="flex items-center gap-1"><Icon name="Users" size={11} /> 12 ставок</span>
                </div>

                <div className="bg-muted/40 rounded-xl p-4 mb-4">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Начальная</div>
                      <div className="text-sm text-muted-foreground line-through">4 200 000 ₽</div>
                    </div>
                    <Icon name="ArrowRight" size={16} className="text-muted-foreground mb-1" />
                    <div className="text-right">
                      <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Текущая</div>
                      <div className="text-2xl font-black text-primary">3 420 000 ₽</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-emerald-400 w-[81%] rounded-full" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">Снижение</span>
                    <span className="text-[11px] font-bold text-emerald-400">−18.5% · −780 000 ₽</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { name: "СтройПро КЗН", price: "3 420 000 ₽", rating: 4.9, isLeader: true },
                    { name: "РемМонтаж", price: "3 480 000 ₽", rating: 4.7, isLeader: false },
                    { name: "КровляГрупп", price: "3 550 000 ₽", rating: 4.8, isLeader: false },
                  ].map((b, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${b.isLeader ? "bg-primary/5 border-primary/20" : "bg-background border-border"}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${b.isLeader ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1">
                          {b.name}
                          {b.isLeader && <Icon name="BadgeCheck" size={11} className="text-primary" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <span className="text-amber-400">★</span> {b.rating}
                        </div>
                      </div>
                      <div className={`text-xs font-bold ${b.isLeader ? "text-primary" : "text-foreground/80"}`}>{b.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar — compact, below split */}
        <div className="max-w-6xl mx-auto relative z-10 mt-10">

          {/* Полный блок фильтров */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xl shadow-black/5">
              <div className="grid md:grid-cols-[1fr_180px_180px_auto_auto] gap-3 mb-3">
                <div className="relative">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Поиск по названию или описанию..."
                    value={heroFilters.search}
                    onChange={(e) => setHeroFilters({ ...heroFilters, search: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                  />
                  {heroFilters.search && (
                    <button
                      type="button"
                      onClick={() => setHeroFilters({ ...heroFilters, search: "" })}
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
                    value={heroFilters.city}
                    onChange={(e) => setHeroFilters({ ...heroFilters, city: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <select
                  value={heroFilters.sort}
                  onChange={(e) => setHeroFilters({ ...heroFilters, sort: e.target.value })}
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="new">Сначала новые</option>
                  <option value="ending">Скоро завершатся</option>
                  <option value="price_asc">Цена: дешёвые</option>
                  <option value="price_desc">Цена: дорогие</option>
                  <option value="bids">Больше ставок</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`text-xs font-medium px-4 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    showAdvanced || heroFilters.min_price || heroFilters.max_price
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <Icon name="SlidersHorizontal" size={14} />
                  Фильтры
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5"
                >
                  <Icon name="Search" size={14} />
                  Найти
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
                        value={heroFilters.min_price}
                        onChange={(e) => setHeroFilters({ ...heroFilters, min_price: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Цена до (₽)</label>
                      <input
                        type="number"
                        placeholder="Без ограничения"
                        value={heroFilters.max_price}
                        onChange={(e) => setHeroFilters({ ...heroFilters, max_price: e.target.value })}
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
                        type="button"
                        onClick={() => setHeroFilters({ ...heroFilters, min_price: r.min, max_price: r.max })}
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
                  type="button"
                  onClick={() => setHeroFilters({ ...heroFilters, category_id: "" })}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    !heroFilters.category_id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  Все категории
                </button>
                {homeCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setHeroFilters({ ...heroFilters, category_id: String(cat.id) })}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      heroFilters.category_id === String(cat.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {heroHasActiveFilters && (
                <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap mx-0">
                  <span className="text-xs text-muted-foreground">
                    Активных фильтров: {[heroFilters.search, heroFilters.category_id, heroFilters.city, heroFilters.min_price, heroFilters.max_price].filter(Boolean).length}
                  </span>
                  <button
                    type="button"
                    onClick={resetHeroFilters}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    <Icon name="X" size={12} />
                    Сбросить всё
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Role CTA */}
          {!user && (
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
              <button
                onClick={() => onNavigate("auth")}
                className="group bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon name="Briefcase" size={18} className="text-primary" />
                  </div>
                  <div className="font-bold">Я заказчик</div>
                </div>
                <div className="text-sm text-muted-foreground">Разместить работу и получить ставки</div>
                <div className="text-xs text-primary mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Начать бесплатно <Icon name="ArrowRight" size={12} />
                </div>
              </button>
              <button
                onClick={() => onNavigate("auth")}
                className="group bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon name="HardHat" size={18} className="text-primary" />
                  </div>
                  <div className="font-bold">Я подрядчик</div>
                </div>
                <div className="text-sm text-muted-foreground">Найти заказы и развивать бизнес</div>
                <div className="text-xs text-primary mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Найти работу <Icon name="ArrowRight" size={12} />
                </div>
              </button>
            </div>
          )}

          {user && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("lots")}
                className="bg-primary text-primary-foreground font-semibold px-7 py-3.5 rounded-xl hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                <Icon name="Search" size={16} />
                Смотреть {activeLots} лотов
              </button>
              {user.role === "customer" && (
                <button
                  onClick={() => onNavigate("my_lots")}
                  className="bg-secondary text-secondary-foreground font-semibold px-7 py-3.5 rounded-xl hover:bg-secondary/80 transition-all border border-border flex items-center gap-2"
                >
                  <Icon name="Plus" size={16} />
                  Разместить лот
                </button>
              )}
              {user.role === "contractor" && (
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="bg-secondary text-secondary-foreground font-semibold px-7 py-3.5 rounded-xl hover:bg-secondary/80 transition-all border border-border flex items-center gap-2"
                >
                  <Icon name="BarChart3" size={16} />
                  Мой дашборд
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* METRICS */}
      <section className="px-6 py-3 border-y border-border bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            {[
              { icon: "Package", value: activeLots.toLocaleString("ru-RU"), label: "Активных лотов", color: "text-primary" },
              { icon: "HardHat", value: contractorsCount.toLocaleString("ru-RU"), label: "Подрядчиков", color: "text-emerald-400" },
              { icon: "PiggyBank", value: `${avgSavings}%`, label: "Средняя экономия", color: "text-amber-400" },
            ].map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-2 animate-slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <Icon name={m.icon} size={16} className={m.color} />
                <span className="font-bold text-2xl">{m.value}</span>
                <span className="text-muted-foreground text-2xl">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-12 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs text-primary font-medium uppercase tracking-wider mb-2">Простой процесс</div>
          <h2 className="text-2xl md:text-3xl font-black mb-8">Как это работает</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "FileText", title: "Заказчик размещает лот", text: "Описание работ, бюджет, сроки и срок приёма ставок" },
              { icon: "TrendingDown", title: "Торги на понижение", text: "Подрядчики делают ставки — побеждает лучшее предложение по цене и репутации" },
              { icon: "Handshake", title: "Выбор исполнителя", text: "Заказчик видит профили всех участников и сам выбирает подрядчика" },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-6 animate-slide-up relative"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black text-sm shadow-lg">
                  {i + 1}
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mt-2">
                  <Icon name={s.icon} size={22} className="text-primary" />
                </div>
                <div className="font-bold mb-2 text-lg">{s.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Персонализация для залогиненных */}
      {user && myLots.length > 0 && (
        <section className="px-6 py-10 border-b border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <div className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Для вас</div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Icon name={user.role === "customer" ? "FolderOpen" : "Target"} size={22} className="text-primary" />
                  {user.role === "customer" ? "Ваши активные лоты" : `Лоты в ${user.city || "вашем городе"}`}
                </h2>
              </div>
              <button
                onClick={() => onNavigate(user.role === "customer" ? "my_lots" : "lots")}
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
              >
                Смотреть все <Icon name="ArrowRight" size={14} />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {myLots.map((lot) => (
                <LotCardMini key={lot.id} lot={lot} onClick={() => onOpenLot(lot.id)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hot lots */}
      <section className="px-6 py-12 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div>
              <div className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Актуальные торги</div>
              <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                <Icon name="Flame" size={26} className="text-red-400" />
                Торги заканчиваются
              </h2>
            </div>
            <button
              onClick={() => onNavigate("lots")}
              className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
            >
              Все лоты <Icon name="ArrowRight" size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lots.map((lot) => (
              <LotCardMini key={lot.id} lot={lot} onClick={() => onOpenLot(lot.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {stats && stats.recent_reviews.length > 0 && (
        <section className="px-6 py-12 border-b border-border bg-card/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-xs text-primary font-medium uppercase tracking-wider mb-2">Отзывы</div>
            <h2 className="text-2xl md:text-3xl font-black mb-8">Что говорят о нас</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent_reviews.slice(0, 6).map((r, i) => (
                <div
                  key={r.id}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`text-sm ${n <= r.rating ? "text-amber-400" : "text-muted-foreground/20"}`}>★</span>
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-4 line-clamp-4">«{r.comment}»</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {r.author_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{r.author_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.author_role === "customer" ? "Заказчик" : "Подрядчик"}
                        {r.author_company ? ` · ${r.author_company}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="px-6 py-12 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-xs text-primary font-medium uppercase tracking-wider mb-2 text-center">Частые вопросы</div>
          <h2 className="text-2xl md:text-3xl font-black mb-8 text-center">Ещё есть вопросы?</h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setShowFaq(showFaq === i ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-secondary/30 transition-colors"
                >
                  <span className="font-semibold">{item.q}</span>
                  <Icon
                    name="ChevronDown"
                    size={18}
                    className={`text-muted-foreground flex-shrink-0 transition-transform ${showFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {showFaq === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed animate-fade-in border-t border-border pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={() => onNavigate("faq")}
              className="text-sm text-primary hover:underline font-medium"
            >
              Все вопросы и ответы →
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      {!user && (
        <section className="px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                <Icon name="Sparkles" size={12} />
                Бесплатная регистрация
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4">Начните сегодня</h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                Присоединяйтесь к платформе и получите +100 баллов рейтинга за заполнение профиля
              </p>
              <button
                onClick={() => onNavigate("auth")}
                className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-xl hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/20 text-base"
              >
                Создать аккаунт бесплатно
              </button>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="px-6 py-10 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-black text-lg mb-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Gavel" size={16} className="text-primary-foreground" />
                </div>
                ПодрядБиржа
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Обратный аукцион подрядных работ. Честные торги, проверенные исполнители.
              </p>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Платформа</div>
              <div className="space-y-2 text-sm">
                <button onClick={() => onNavigate("lots")} className="block hover:text-primary transition-colors">Все лоты</button>
                <button onClick={() => onNavigate("contractors")} className="block hover:text-primary transition-colors">Исполнители</button>
                <button onClick={() => onNavigate("faq")} className="block hover:text-primary transition-colors">FAQ</button>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Компания</div>
              <div className="space-y-2 text-sm">
                <button onClick={() => onNavigate("contacts")} className="block hover:text-primary transition-colors">Контакты</button>
                <a href="#" className="block hover:text-primary transition-colors">О нас</a>
                <a href="#" className="block hover:text-primary transition-colors">Политика</a>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Связь</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Icon name="Mail" size={12} /> support@example.ru</div>
                <div className="flex items-center gap-2"><Icon name="Phone" size={12} /> 8 800 000 00 00</div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground">
            <div>© 2026 ПодрядБиржа. Все права защищены.</div>
            <div>Сделано с ❤ для строителей</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;