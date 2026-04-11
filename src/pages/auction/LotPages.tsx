import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, Lot, Bid, Category, ExtendedBid, Page, Badge, BADGE_INFO, LotAttachment, formatPrice, formatDate, timeLeft, statusLabel } from "./types";
import { StatusBadge } from "./AuthProfilePages";
import { ComplaintDialog } from "./social/ComplaintDialog";
import { ReviewDialog } from "./social/ReviewDialog";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-xs ${s <= Math.round(rating) ? "text-primary" : "text-muted-foreground/30"}`}>★</span>
      ))}
      <span className="ml-1 text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

// ============ HOME PAGE ============
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

function LotCardMini({ lot, onClick }: { lot: Lot; onClick: () => void }) {
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
  const completedDeals = stats?.completed || 0;
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
      <section className="relative py-16 md:py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Обратный аукцион · Подрядные работы
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.02] mb-6 tracking-tight max-w-4xl">
            Выбирай подрядчика<br />
            по <span className="relative text-primary">
              честной цене
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" preserveAspectRatio="none">
                <path d="M1,8 Q75,2 150,6 T299,5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Размещайте лоты, получайте ставки с понижением от проверенных подрядчиков и выбирайте лучшего исполнителя. Экономия в среднем <span className="text-primary font-bold">{avgSavings}%</span> от начальной цены.
          </p>

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
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
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
      <section className="px-6 py-8 md:py-12 border-y border-border bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "Package", value: activeLots.toLocaleString("ru-RU"), label: "Активных лотов", color: "text-primary" },
              { icon: "HardHat", value: contractorsCount.toLocaleString("ru-RU"), label: "Подрядчиков", color: "text-emerald-400" },
              { icon: "CheckCircle2", value: completedDeals.toLocaleString("ru-RU"), label: "Завершённых сделок", color: "text-blue-400" },
              { icon: "PiggyBank", value: `${avgSavings}%`, label: "Средняя экономия", color: "text-amber-400" },
            ].map((m, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all animate-slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 ${m.color}`}>
                  <Icon name={m.icon} size={22} />
                </div>
                <div className="text-2xl md:text-3xl font-black">{m.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
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

// ============ LOTS LIST PAGE ============
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

// ============ CONTRACTOR CARD (for selection screen) ============
export function ContractorCard({
  bid,
  isWinner,
  onSelect,
  selecting,
}: {
  bid: ExtendedBid;
  isWinner: boolean;
  onSelect: () => void;
  selecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const entityLabel: Record<string, string> = {
    individual: "Физ. лицо",
    self_employed: "Самозанятый",
    ip: "ИП",
    legal: "Юр. лицо",
  };
  const badges = (bid.badges || []) as Badge[];
  const photos = bid.work_photos || [];
  const ratingPoints = bid.rating_points || 0;

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${
        isWinner ? "border-emerald-500/40 shadow-lg shadow-emerald-500/10" : "border-border hover:border-primary/30"
      }`}
    >
      {isWinner && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-5 py-2 flex items-center gap-2">
          <Icon name="Trophy" size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">Выбранный подрядчик</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
            {(bid.company_name || bid.contractor_name || "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {bid.contractor_id ? (
                <a
                  href={`/contractor/${bid.contractor_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  title="Открыть профиль в новой вкладке"
                >
                  {bid.company_name || bid.contractor_name}
                  <Icon name="ExternalLink" size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <span className="font-bold">{bid.company_name || bid.contractor_name}</span>
              )}
              {bid.is_verified && (
                <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
                  <Icon name="BadgeCheck" size={10} /> Проверен
                </span>
              )}
            </div>
            {bid.city && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Icon name="MapPin" size={10} /> {bid.city}
                {bid.entity_type && <span className="ml-2">{entityLabel[bid.entity_type] || bid.entity_type}</span>}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <Icon name="Award" size={11} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">{ratingPoints}</span>
              </div>
              {bid.rating !== undefined && bid.rating > 0 && <StarRating rating={bid.rating} />}
              <span className="text-xs text-muted-foreground">{bid.deals_count || 0} сделок</span>
              {bid.experience_years !== undefined && bid.experience_years > 0 && (
                <span className="text-xs text-muted-foreground">{bid.experience_years} лет опыта</span>
              )}
            </div>
            {badges.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {badges.map((b) => {
                  const info = BADGE_INFO[b];
                  if (!info) return null;
                  return (
                    <span
                      key={b}
                      title={info.description}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${info.cls}`}
                    >
                      <Icon name={info.icon} size={10} />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-primary">{formatPrice(bid.amount)}</div>
          </div>
        </div>

        {bid.comment && (
          <div className="mt-3 bg-muted/50 rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Комментарий к ставке</div>
            <p className="text-sm">{bid.comment}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
              <Icon name="Images" size={11} />
              Работы подрядчика ({photos.length})
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((url) => (
                <div
                  key={url}
                  onClick={() => setLightbox(url)}
                  className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary/40 transition-all group"
                >
                  <img
                    src={url}
                    alt="Работа"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border animate-fade-in space-y-3">
            {bid.about && (
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">О компании</div>
                <p className="text-sm leading-relaxed">{bid.about}</p>
              </div>
            )}
            {bid.specializations && bid.specializations.length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Специализация</div>
                <div className="flex gap-1.5 flex-wrap">
                  {bid.specializations.map((s) => (
                    <span key={s} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold text-primary">{ratingPoints}</div>
                <div className="text-[11px] text-muted-foreground">Баллов</div>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold">{bid.deals_count || 0}</div>
                <div className="text-[11px] text-muted-foreground">Сделок</div>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold">{bid.rating?.toFixed(1) || "—"}</div>
                <div className="text-[11px] text-muted-foreground">Рейтинг</div>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="text-lg font-bold">{bid.experience_years || 0}</div>
                <div className="text-[11px] text-muted-foreground">Лет опыта</div>
              </div>
            </div>
          </div>
        )}

        {lightbox && (
          <div
            onClick={() => setLightbox(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
          >
            <img src={lightbox} alt="Работа" className="max-w-full max-h-full rounded-xl" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <Icon name="X" size={20} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} />
            {expanded ? "Свернуть" : "Подробнее"}
          </button>
          {!isWinner && (
            <button
              onClick={onSelect}
              disabled={selecting}
              className="ml-auto bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {selecting ? "Выбор..." : "Выбрать подрядчика"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ LOT DETAIL PAGE ============
export function LotDetailPage({ lotId, user, onBack }: { lotId: number; user: User | null; onBack: () => void }) {
  const [lot, setLot] = useState<Lot | null>(null);
  const [bids, setBids] = useState<ExtendedBid[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [bidComment, setBidComment] = useState("");
  const [placing, setPlacing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [confirmSelect, setConfirmSelect] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [sortBids, setSortBids] = useState<"price" | "rating" | "deals">("price");
  const [isFav, setIsFav] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: number; name: string } | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const load = useCallback(() => {
    api.lots.get(lotId).then((res) => setLot((res as { lot: Lot }).lot));
    api.bids.list(lotId).then((res) => setBids((res as { bids: ExtendedBid[] }).bids));
    if (user) {
      api.social.favCheck(lotId).then((res) => setIsFav((res as { is_fav: boolean }).is_fav)).catch(() => {});
    }
  }, [lotId, user]);

  const toggleFav = async () => {
    if (!user) {
      toast.error("Войдите, чтобы добавить в избранное");
      return;
    }
    try {
      await api.social.favLot(lotId, !isFav);
      setIsFav(!isFav);
      toast.success(!isFav ? "Добавлено в избранное" : "Удалено из избранного");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const placeBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Необходимо войти");
      return;
    }
    setPlacing(true);
    try {
      await api.bids.place({ lot_id: lotId, amount: parseFloat(bidAmount), comment: bidComment || undefined });
      toast.success("Ставка принята!");
      setBidAmount("");
      setBidComment("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  const selectWinner = async (contractorId: number) => {
    setSelecting(true);
    try {
      await api.bids.selectWinner({ lot_id: lotId, contractor_id: contractorId });
      toast.success("Подрядчик выбран! Уведомление отправлено.");
      setConfirmSelect(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSelecting(false);
    }
  };

  const rejectAll = async () => {
    setSelecting(true);
    try {
      await api.bids.rejectAll({ lot_id: lotId, reason: rejectReason });
      toast.success("Все предложения отклонены.");
      setShowReject(false);
      load();
    } catch {
      toast.error("Ошибка при отклонении");
    } finally {
      setSelecting(false);
    }
  };

  if (!lot) {
    return (
      <div className="text-center py-16">
        <Icon name="Loader2" size={24} className="animate-spin mx-auto" />
      </div>
    );
  }

  const currentMin = lot.current_min_bid || lot.start_price;
  const isOwner = user?.id === lot.customer_id;
  const canBid = user?.role === "contractor" && !isOwner && lot.status === "active";
  const isCompleted = lot.status === "completed";
  const isInWork = lot.status === "in_work";
  const canSelectWinner = isOwner && isCompleted && bids.length > 0;

  const sortedBids = [...bids].sort((a, b) => {
    if (sortBids === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBids === "deals") return (b.deals_count || 0) - (a.deals_count || 0);
    return a.amount - b.amount;
  });

  const photos = lot.object_photos || [];
  const attachments: LotAttachment[] = (lot.attachments || []).filter((a) => a && a.url);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="ArrowLeft" size={16} /> Назад к списку
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFav}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                isFav ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-card text-muted-foreground border-border hover:border-red-500/30 hover:text-red-400"
              }`}
            >
              <Icon name={isFav ? "Heart" : "Heart"} size={13} className={isFav ? "fill-current" : ""} />
              {isFav ? "В избранном" : "В избранное"}
            </button>
            <button
              onClick={() => setComplaintOpen(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1.5"
            >
              <Icon name="Flag" size={13} />
              Пожаловаться
            </button>
          </div>
        )}
      </div>

      <ComplaintDialog
        open={complaintOpen}
        onClose={() => setComplaintOpen(false)}
        targetType="lot"
        targetId={lotId}
        targetName={lot.title}
      />
      {reviewTarget && (
        <ReviewDialog
          open={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          lotId={lotId}
          targetId={reviewTarget.id}
          targetName={reviewTarget.name}
          onSaved={load}
        />
      )}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <img src={lightboxImg} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}

      {/* Winner selection banner */}
      {canSelectWinner && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Trophy" size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">Торги завершены — выберите подрядчика</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bids.length} подрядчиков подали ставки. Изучите профили, рейтинги и опыт каждого, затем выберите исполнителя. Вы не обязаны выбирать самую низкую цену.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category_name}</span>
                <h1 className="text-2xl md:text-3xl font-black mt-3 mb-2">{lot.title}</h1>
              </div>
              <StatusBadge status={lot.status} />
            </div>
            {lot.description && (
              <div className="mt-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">ОПИСАНИЕ</div>
                <p className="text-sm leading-relaxed text-foreground/90">{lot.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              {lot.city && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Город</div>
                  <div className="text-sm font-medium mt-1">{lot.city}</div>
                </div>
              )}
              {lot.object_area && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Площадь</div>
                  <div className="text-sm font-medium mt-1">{lot.object_area} м²</div>
                </div>
              )}
              {lot.work_duration_days && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Срок работ</div>
                  <div className="text-sm font-medium mt-1">{lot.work_duration_days} дн.</div>
                </div>
              )}
              {lot.warranty_months && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Гарантия</div>
                  <div className="text-sm font-medium mt-1">{lot.warranty_months} мес.</div>
                </div>
              )}
            </div>

            {photos.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Icon name="Image" size={13} />
                  ФОТОГРАФИИ ОБЪЕКТА ({photos.length})
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {photos.map((url) => (
                    <div
                      key={url}
                      onClick={() => setLightboxImg(url)}
                      className="aspect-square rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary/40 transition-all"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Icon name="Paperclip" size={13} />
                  ФАЙЛЫ ЛОТА ({attachments.length})
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  {attachments.map((a) => (
                    <a
                      key={a.url}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-background border border-border rounded-lg p-3 hover:border-primary/40 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon name="FileText" size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        {a.size != null && <div className="text-[11px] text-muted-foreground">{(a.size / 1024).toFixed(1)} КБ</div>}
                      </div>
                      <Icon name="Download" size={14} className="text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* === CONTRACTOR SELECTION (completed lot + owner) === */}
          {canSelectWinner && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Icon name="Users" size={20} className="text-primary" />
                  Участники торгов ({bids.length})
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Сортировка:</span>
                  {(["price", "rating", "deals"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBids(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        sortBids === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {s === "price" ? "По цене" : s === "rating" ? "По рейтингу" : "По опыту"}
                    </button>
                  ))}
                </div>
              </div>

              {sortedBids.map((bid) => (
                <div key={bid.id}>
                  {confirmSelect === bid.contractor_id && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-2 animate-fade-in">
                      <p className="text-sm font-medium mb-3">
                        Вы уверены, что хотите выбрать <strong>{bid.company_name || bid.contractor_name}</strong> за <strong className="text-primary">{formatPrice(bid.amount)}</strong>?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectWinner(bid.contractor_id!)}
                          disabled={selecting}
                          className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {selecting ? "Подтверждение..." : "Подтвердить выбор"}
                        </button>
                        <button
                          onClick={() => setConfirmSelect(null)}
                          className="bg-secondary text-secondary-foreground text-sm px-4 py-2 rounded-lg border border-border"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                  <ContractorCard
                    bid={bid}
                    isWinner={lot.winner_id === bid.contractor_id}
                    onSelect={() => setConfirmSelect(bid.contractor_id!)}
                    selecting={selecting}
                  />
                </div>
              ))}

              {/* Reject all */}
              <div className="mt-4 pt-4 border-t border-border">
                {!showReject ? (
                  <button
                    onClick={() => setShowReject(true)}
                    className="text-sm text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Icon name="X" size={14} /> Отклонить все предложения
                  </button>
                ) : (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 animate-fade-in">
                    <p className="text-sm font-medium text-red-400 mb-3">Вы уверены? Лот будет отменён.</p>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Укажите причину (опционально)"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-red-500/50 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={rejectAll}
                        disabled={selecting}
                        className="bg-red-500/15 text-red-400 border border-red-500/20 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-500/25 disabled:opacity-50"
                      >
                        Отклонить всех
                      </button>
                      <button onClick={() => setShowReject(false)} className="text-sm text-muted-foreground px-4 py-2">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Winner result (in_work) */}
          {isInWork && lot.winner_id && bids.length > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Icon name="Trophy" size={20} className="text-emerald-400" />
                  Выбранный подрядчик
                </h2>
                {user && (user.id === lot.customer_id || user.id === lot.winner_id) && (
                  <button
                    onClick={() => {
                      const targetId = user.id === lot.customer_id ? lot.winner_id! : lot.customer_id;
                      const winnerBid = bids.find((b) => b.contractor_id === lot.winner_id);
                      const targetName = user.id === lot.customer_id
                        ? (winnerBid?.company_name || winnerBid?.contractor_name || "Подрядчик")
                        : (lot.customer_name || "Заказчик");
                      setReviewTarget({ id: targetId, name: targetName });
                    }}
                    className="text-xs bg-primary/10 text-primary border border-primary/30 font-semibold px-4 py-2 rounded-lg hover:bg-primary/20 transition-all flex items-center gap-2"
                  >
                    <Icon name="Star" size={13} />
                    Оставить отзыв
                  </button>
                )}
              </div>
              {bids
                .filter((b) => b.contractor_id === lot.winner_id)
                .map((bid) => (
                  <ContractorCard key={bid.id} bid={bid} isWinner={true} onSelect={() => {}} selecting={false} />
                ))}
            </div>
          )}

          {/* Bids history (for active lots or non-owners) */}
          {!canSelectWinner && !(isInWork && lot.winner_id) && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <Icon name="TrendingDown" size={18} className="text-primary" />
                История ставок ({bids.length})
              </h2>
              {bids.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Icon name="Inbox" size={32} className="mx-auto mb-2 opacity-30" />
                  Пока нет ставок. Будьте первым!
                </div>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid, i) => {
                    const showName = bid.contractor_name && (isOwner || lot.status !== "active");
                    return (
                      <div
                        key={bid.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          i === 0 ? "bg-primary/5 border-primary/20" : "bg-background border-border"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {showName ? (
                              <span className="flex items-center gap-1.5 flex-wrap">
                                {bid.company_name || bid.contractor_name}
                                {bid.is_verified && <Icon name="BadgeCheck" size={14} className="text-primary flex-shrink-0" />}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Подрядчик #{bid.id}</span>
                            )}
                          </div>
                          {bid.comment && <div className="text-xs text-muted-foreground mt-0.5">{bid.comment}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-primary">{formatPrice(bid.amount)}</div>
                          {showName && bid.rating !== undefined && bid.rating > 0 && (
                            <StarRating rating={bid.rating} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-20">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
              {lot.current_min_bid ? "Минимальная ставка" : "Начальная цена"}
            </div>
            <div className="text-3xl font-black text-primary">{formatPrice(currentMin)}</div>
            {lot.current_min_bid && lot.current_min_bid < lot.start_price && (
              <div className="text-xs text-muted-foreground mt-1">
                Было: <span className="line-through">{formatPrice(lot.start_price)}</span>
                <span className="ml-2 text-emerald-400 font-medium">
                  −{Math.round((1 - lot.current_min_bid / lot.start_price) * 100)}%
                </span>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-border space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="Clock" size={14} /> Статус торгов</span>
                <span className={`font-semibold ${lot.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                  {lot.status === "active" ? timeLeft(lot.auction_end_at) : statusLabel[lot.status]?.label || lot.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="Users" size={14} /> Участников</span>
                <span className="font-semibold">{lot.bids_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="TrendingDown" size={14} /> Шаг</span>
                <span className="font-semibold">{formatPrice(lot.bid_step)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Icon name="Eye" size={14} /> Просмотров</span>
                <span className="font-semibold">{lot.views_count}</span>
              </div>
            </div>

            {canBid && (
              <form onSubmit={placeBid} className="mt-5 pt-5 border-t border-border space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    За сколько вы готовы выполнить эту работу? (₽)
                  </label>
                  <input
                    required
                    type="number"
                    step="1"
                    min="1"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Введите вашу цену"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                  />
                  <div className="text-[11px] text-muted-foreground mt-1.5 space-y-0.5">
                    <div>Текущая мин. ставка: <span className="font-medium text-foreground">{formatPrice(currentMin)}</span></div>
                    <div>Ваша цена должна быть ниже на {formatPrice(lot.bid_step)} или больше</div>
                  </div>
                  {bidAmount && parseFloat(bidAmount) >= currentMin && (
                    <div className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                      <Icon name="AlertCircle" size={11} /> Цена должна быть ниже {formatPrice(currentMin)}
                    </div>
                  )}
                  {bidAmount && parseFloat(bidAmount) > 0 && parseFloat(bidAmount) < currentMin && (
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Icon name="Check" size={11} /> Снижение на {Math.round((1 - parseFloat(bidAmount) / lot.start_price) * 100)}% от начальной цены
                    </div>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={bidComment}
                  onChange={(e) => setBidComment(e.target.value)}
                  placeholder="Комментарий (опционально)"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
                />
                <button
                  type="submit"
                  disabled={placing || !bidAmount || parseFloat(bidAmount) >= currentMin}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {placing ? "Отправка..." : `Предложить ${bidAmount ? formatPrice(parseFloat(bidAmount)) : "свою цену"}`}
                </button>
              </form>
            )}

            {!user && (
              <div className="mt-5 pt-5 border-t border-border text-center">
                <p className="text-xs text-muted-foreground mb-2">Войдите, чтобы подать ставку</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Заказчик</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold">
                {lot.customer_name?.[0] || "?"}
              </div>
              <div>
                <div className="font-semibold text-sm">{lot.customer_name}</div>
                <div className="text-xs text-muted-foreground">На платформе с {formatDate(lot.created_at)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MY LOTS PAGE ============
export function MyLotsPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [objectPhotos, setObjectPhotos] = useState<string[]>([]);
  const [lotAttachments, setLotAttachments] = useState<LotAttachment[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    object_type: "",
    object_area: "",
    city: "",
    address: "",
    start_price: "",
    bid_step: "1000",
    work_duration_days: "",
    auction_days: "7",
    payment_terms: "staged",
    materials_by: "customer",
    warranty_months: "12",
  });

  const load = useCallback(() => {
    api.lots.my().then((res) => setLots((res as { lots: Lot[] }).lots));
  }, []);

  useEffect(() => {
    load();
    api.lots.categories().then((res) => setCategories((res as { categories: Category[] }).categories));
  }, [load]);

  const createLot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const auctionEnd = new Date();
      auctionEnd.setDate(auctionEnd.getDate() + parseInt(form.auction_days));
      await api.lots.create({
        title: form.title,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        description: form.description,
        object_type: form.object_type,
        object_area: form.object_area ? parseFloat(form.object_area) : null,
        city: form.city,
        address: form.address,
        start_price: parseFloat(form.start_price),
        bid_step: parseFloat(form.bid_step),
        work_duration_days: form.work_duration_days ? parseInt(form.work_duration_days) : null,
        auction_end_at: auctionEnd.toISOString().replace("T", " ").slice(0, 19),
        payment_terms: form.payment_terms,
        materials_by: form.materials_by,
        warranty_months: parseInt(form.warranty_months),
        status: "active",
        object_photos: objectPhotos,
        attachments: lotAttachments,
      });
      toast.success("Лот отправлен на модерацию!");
      setShowForm(false);
      setForm({
        ...form,
        title: "",
        description: "",
        start_price: "",
        work_duration_days: "",
      });
      setObjectPhotos([]);
      setLotAttachments([]);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectPhotos.length >= 5) {
      toast.error("Не более 5 фото объекта");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Размер не более 10 МБ");
      return;
    }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await api.lots.uploadFile({ data: base64, filename: file.name, kind: "photo" });
        const { url } = res as { url: string };
        setObjectPhotos((prev) => [...prev, url]);
        toast.success("Фото добавлено");
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setUploadingPhoto(false);
        if (photoInputRef.current) photoInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Размер не более 10 МБ");
      return;
    }
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await api.lots.uploadFile({ data: base64, filename: file.name, kind: "attachment" });
        const { url, name, size } = res as { url: string; name: string; size: number };
        setLotAttachments((prev) => [...prev, { url, name, size }]);
        toast.success("Файл загружен");
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-black">Мои лоты</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Icon name={showForm ? "X" : "Plus"} size={16} />
          {showForm ? "Отмена" : "Разместить лот"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createLot} className="bg-card border border-border rounded-2xl p-6 mb-8 animate-fade-in">
          <h3 className="font-bold mb-5">Новый лот</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Название работ *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Монтаж кровли 800 м²"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Категория *</label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="">Выберите</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Город *</label>
              <input
                required
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Длительность торгов (дней)</label>
              <select
                value={form.auction_days}
                onChange={(e) => setForm({ ...form, auction_days: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="1">1 день</option>
                <option value="3">3 дня</option>
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание работ</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Подробно опишите объём и специфику работ..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Фото объекта (до 5)</label>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto || objectPhotos.length >= 5}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <Icon name={uploadingPhoto ? "Loader2" : "Plus"} size={12} className={uploadingPhoto ? "animate-spin" : ""} />
                  Добавить фото
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadPhoto}
                  className="hidden"
                />
              </div>
              {objectPhotos.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground">
                  Добавьте фотографии объекта, чтобы подрядчики лучше оценили объём работ
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {objectPhotos.map((url) => (
                    <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setObjectPhotos((p) => p.filter((x) => x !== url))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Файлы (сметы, чертежи, ТЗ)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <Icon name={uploadingFile ? "Loader2" : "Paperclip"} size={12} className={uploadingFile ? "animate-spin" : ""} />
                  Прикрепить файл
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,.jpg,.jpeg,.png"
                  onChange={uploadFile}
                  className="hidden"
                />
              </div>
              {lotAttachments.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground">
                  PDF, Word, Excel, DWG, ZIP, изображения — до 10 МБ
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {lotAttachments.map((a) => (
                    <div key={a.url} className="flex items-center gap-2 bg-background border border-border rounded-lg p-2.5">
                      <Icon name="FileText" size={14} className="text-primary shrink-0" />
                      <span className="text-xs flex-1 truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => setLotAttachments((p) => p.filter((x) => x.url !== a.url))}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all">
            Отправить на модерацию
          </button>
        </form>
      )}

      {lots.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Icon name="Package" size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">У вас пока нет лотов. Нажмите «Разместить лот», чтобы начать.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {lots.map((lot) => (
            <button
              key={lot.id}
              onClick={() => onOpenLot(lot.id)}
              className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="font-semibold group-hover:text-primary transition-colors">{lot.title}</div>
                <StatusBadge status={lot.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>{lot.category_name}</span>
                <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids_count} ставок</span>
                <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{lot.views_count}</span>
                <span className="ml-auto text-primary font-bold">{formatPrice(lot.current_min_bid || lot.start_price)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MY BIDS PAGE (contractor) ============
export function MyBidsPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [bids, setBids] = useState<Bid[]>([]);

  useEffect(() => {
    api.bids.my().then((res) => setBids((res as { bids: Bid[] }).bids));
  }, []);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-8">Мои ставки</h1>
      {bids.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Icon name="Gavel" size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Вы пока не делали ставок.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bids.map((b) => {
            const bb = b as Bid & { lot_title: string; lot_status: string; is_winner: boolean; current_min_bid: number };
            return (
              <button
                key={b.id}
                onClick={() => bb.lot_id && onOpenLot(bb.lot_id)}
                className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="font-semibold group-hover:text-primary transition-colors">{bb.lot_title}</div>
                  <div className="flex gap-2">
                    {bb.is_winner && <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Победа</span>}
                    <StatusBadge status={bb.lot_status} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span>Ваша ставка: <strong className="text-primary">{formatPrice(b.amount)}</strong></span>
                  {bb.current_min_bid && <span>Мин. ставка: {formatPrice(bb.current_min_bid)}</span>}
                  <span className="ml-auto">{formatDate(b.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}