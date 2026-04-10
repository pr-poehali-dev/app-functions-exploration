import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";

const queryClient = new QueryClient();

type Page = "home" | "lots" | "profile" | "history" | "contacts" | "faq";

const LOTS = [
  {
    id: 1,
    title: "Монтаж кровли 1200 м²",
    category: "Кровельные работы",
    budget: "2 400 000 ₽",
    deadline: "45 дней",
    bids: 7,
    status: "active",
    location: "Москва",
    desc: "Монтаж металлочерепицы на складском комплексе. Требуется бригада с опытом от 5 лет.",
  },
  {
    id: 2,
    title: "Фасадные работы бизнес-центр",
    category: "Фасадные работы",
    budget: "5 800 000 ₽",
    deadline: "90 дней",
    bids: 12,
    status: "active",
    location: "Санкт-Петербург",
    desc: "Вентилируемый фасад из керамогранита, площадь 3400 м². Проект и смета прилагаются.",
  },
  {
    id: 3,
    title: "Прокладка электросетей",
    category: "Электромонтаж",
    budget: "890 000 ₽",
    deadline: "30 дней",
    bids: 5,
    status: "active",
    location: "Казань",
    desc: "Электромонтажные работы в жилом доме на 80 квартир. Нужен допуск СРО.",
  },
  {
    id: 4,
    title: "Благоустройство территории",
    category: "Благоустройство",
    budget: "1 200 000 ₽",
    deadline: "60 дней",
    bids: 9,
    status: "hot",
    location: "Екатеринбург",
    desc: "Укладка тротуарной плитки, озеленение, установка малых архитектурных форм.",
  },
  {
    id: 5,
    title: "Сантехника в ЖК",
    category: "Сантехника",
    budget: "3 100 000 ₽",
    deadline: "75 дней",
    bids: 4,
    status: "active",
    location: "Новосибирск",
    desc: "Монтаж водоснабжения и канализации в 120-квартирном доме. Материалы заказчика.",
  },
  {
    id: 6,
    title: "Внутренняя отделка офиса",
    category: "Отделочные работы",
    budget: "760 000 ₽",
    deadline: "21 день",
    bids: 15,
    status: "ending",
    location: "Москва",
    desc: "Чистовая отделка офиса 400 м², гипсокартон, стяжка, покраска. До сдачи 3 дня.",
  },
];

const CONTRACTORS = [
  { id: 1, name: "СтройМастер", rating: 4.9, deals: 142, spec: "Кровля, фасады", city: "Москва", verified: true, avatar: "С" },
  { id: 2, name: "ЭлектроПро", rating: 4.8, deals: 98, spec: "Электромонтаж", city: "Казань", verified: true, avatar: "Э" },
  { id: 3, name: "АкваСтрой", rating: 4.7, deals: 87, spec: "Сантехника", city: "Новосибирск", verified: true, avatar: "А" },
  { id: 4, name: "ДекорГрупп", rating: 4.6, deals: 203, spec: "Отделочные работы", city: "СПб", verified: false, avatar: "Д" },
  { id: 5, name: "ЗеленыйГород", rating: 4.5, deals: 56, spec: "Благоустройство", city: "Екатеринбург", verified: true, avatar: "З" },
];

const HISTORY = [
  { id: 1, title: "Монтаж перегородок в офисе", date: "12 марта 2026", amount: "450 000 ₽", status: "Завершён", contractor: "ДекорГрупп" },
  { id: 2, title: "Замена трубопровода", date: "28 февраля 2026", amount: "180 000 ₽", status: "Завершён", contractor: "АкваСтрой" },
  { id: 3, title: "Электрощиты в складе", date: "5 февраля 2026", amount: "320 000 ₽", status: "Спор", contractor: "ЭлектроПро" },
  { id: 4, title: "Покраска фасада", date: "15 января 2026", amount: "890 000 ₽", status: "Завершён", contractor: "СтройМастер" },
];

const NOTIFICATIONS = [
  { id: 1, text: "Новая ставка на «Монтаж кровли»: 2 150 000 ₽", time: "5 мин", read: false },
  { id: 2, text: "СтройМастер принял ваш лот на рассмотрение", time: "1 ч", read: false },
  { id: 3, text: "Лот «Отделка офиса» завершается через 3 дня", time: "3 ч", read: true },
  { id: 4, text: "Новый подрядчик в вашем регионе: ЭкоФасад", time: "вчера", read: true },
];

const FAQ_ITEMS = [
  { q: "Как разместить лот на аукционе?", a: "Нажмите кнопку «Разместить лот», заполните описание работ, укажите бюджет и срок. Лот появится в каталоге в течение 15 минут после проверки модератором." },
  { q: "Как выбрать подрядчика?", a: "Изучите рейтинг, отзывы и портфолио. Рекомендуем выбирать верифицированных подрядчиков с рейтингом от 4.5 и более 50 завершённых сделок." },
  { q: "Как работает система гарантий?", a: "Средства заказчика замораживаются на эскроу-счёте и переводятся подрядчику только после подтверждения завершения работ. При споре подключается арбитраж." },
  { q: "Что такое верификация подрядчика?", a: "Верифицированные подрядчики прошли проверку документов: ИНН, лицензии, допуски СРО. Знак ✓ означает полную проверку." },
  { q: "Как отменить лот?", a: "Лот можно отменить до принятия первой ставки. После этого возможна только пауза на 48 часов. Для отмены обратитесь в поддержку." },
  { q: "Какова комиссия платформы?", a: "Комиссия составляет 2.5% от суммы сделки, взимается только при успешном завершении. Размещение лотов и подача заявок — бесплатно." },
];

const CATEGORIES = ["Все", "Кровельные работы", "Фасадные работы", "Электромонтаж", "Благоустройство", "Сантехника", "Отделочные работы"];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-xs ${s <= Math.round(rating) ? "text-primary" : "text-muted-foreground/30"}`}>★</span>
      ))}
      <span className="ml-1 text-xs font-medium text-foreground">{rating}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Активный", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    hot: { label: "Горячий", cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
    ending: { label: "Завершается", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
    "Завершён": { label: "Завершён", cls: "bg-muted text-muted-foreground border-border" },
    "Спор": { label: "Спор", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Icon name="Zap" size={12} />
            Платформа подрядных аукционов №1
          </div>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight">
            Аукцион<br />
            <span className="text-primary">строительных</span><br />
            подрядов
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Размещайте лоты, получайте конкурентные предложения от проверенных подрядчиков. Гарантированная безопасность сделок.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("lots")}
              className="bg-primary text-primary-foreground font-semibold px-8 py-3.5 rounded-lg hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Смотреть лоты
            </button>
            <button
              onClick={() => onNavigate("profile")}
              className="bg-secondary text-secondary-foreground font-semibold px-8 py-3.5 rounded-lg hover:bg-secondary/80 transition-all border border-border"
            >
              Разместить лот
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Активных лотов", value: "1 248", icon: "Briefcase" },
            { label: "Подрядчиков", value: "4 300+", icon: "Users" },
            { label: "Сделок в месяц", value: "890", icon: "TrendingUp" },
            { label: "Объём, млрд ₽", value: "12.4", icon: "BarChart2" },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-5 animate-slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Icon name={s.icon} size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent lots preview */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Горячие лоты</h2>
            <button onClick={() => onNavigate("lots")} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Все лоты <Icon name="ArrowRight" size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {LOTS.slice(0, 4).map((lot) => (
              <div key={lot.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category}</span>
                  <StatusBadge status={lot.status} />
                </div>
                <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">{lot.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-primary font-bold">{lot.budget}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Icon name="Users" size={11} /> {lot.bids} заявок
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top contractors */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Топ подрядчиков</h2>
            <button onClick={() => onNavigate("lots")} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Все рейтинги <Icon name="ArrowRight" size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {CONTRACTORS.slice(0, 3).map((c, i) => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
                <div className="text-lg font-black text-muted-foreground/40 w-6 text-center">{i + 1}</div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    {c.verified && <Icon name="BadgeCheck" size={14} className="text-primary flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.spec}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <StarRating rating={c.rating} />
                  <div className="text-xs text-muted-foreground mt-0.5">{c.deals} сделок</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LotsPage() {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [sortBy, setSortBy] = useState("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"lots" | "rating">("lots");

  const filtered = LOTS.filter((l) => {
    const matchCat = activeCategory === "Все" || l.category === activeCategory;
    const matchSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-6 py-10">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit mb-8">
        {(["lots", "rating"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "lots" ? "Лоты" : "Рейтинг подрядчиков"}
          </button>
        ))}
      </div>

      {activeTab === "lots" && (
        <>
          {/* Search & sort */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по лотам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="new">Сначала новые</option>
              <option value="budget-high">По бюджету ↑</option>
              <option value="bids">По заявкам</option>
            </select>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Lots grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((lot, i) => (
              <div
                key={lot.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-200 cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{lot.category}</span>
                  <StatusBadge status={lot.status} />
                </div>
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{lot.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">{lot.desc}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{lot.location}</span>
                  <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{lot.deadline}</span>
                  <span className="flex items-center gap-1"><Icon name="Users" size={11} />{lot.bids} заявок</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-primary font-bold text-lg">{lot.budget}</span>
                  <button className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Подать заявку
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
              <p>По вашему запросу лотов не найдено</p>
            </div>
          )}
        </>
      )}

      {activeTab === "rating" && (
        <div className="flex flex-col gap-4">
          {CONTRACTORS.map((c, i) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/30 transition-all animate-slide-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="text-2xl font-black text-muted-foreground/30 w-8 text-center flex-shrink-0">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{c.name}</span>
                  {c.verified && (
                    <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
                      <Icon name="BadgeCheck" size={10} /> Верифицирован
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{c.spec} · {c.city}</div>
                <div className="mt-2">
                  <StarRating rating={c.rating} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-black text-foreground">{c.deals}</div>
                <div className="text-xs text-muted-foreground">сделок</div>
                <button className="mt-2 text-xs text-primary font-medium hover:underline">Профиль</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-8">Профиль</h1>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-black text-2xl flex-shrink-0">
            И
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold">Иванов Сергей</h2>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">Заказчик</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">s.ivanov@stroy.ru · Москва</p>
            <div className="flex gap-6 mt-4">
              {[
                { label: "Лотов размещено", value: "24" },
                { label: "Завершено сделок", value: "18" },
                { label: "Общая сумма", value: "42М ₽" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-lg font-black">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="bg-secondary text-secondary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-secondary/80 transition-all border border-border flex items-center gap-2">
            <Icon name="Pencil" size={14} />
            Редактировать
          </button>
        </div>
      </div>

      {/* Create lot form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold mb-5 flex items-center gap-2">
          <Icon name="Plus" size={18} className="text-primary" />
          Разместить новый лот
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "Название работ", placeholder: "Например: Монтаж кровли 800 м²" },
            { label: "Город", placeholder: "Москва" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{f.label}</label>
              <input
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Категория</label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer">
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Бюджет (₽)</label>
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="1 500 000"
              type="number"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание работ</label>
            <textarea
              rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              placeholder="Подробно опишите объём и специфику работ..."
            />
          </div>
        </div>
        <button className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
          Разместить лот
        </button>
      </div>
    </div>
  );
}

function HistoryPage() {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">История сделок</h1>
      <p className="text-muted-foreground text-sm mb-8">Все ваши завершённые и активные транзакции</p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Всего сделок", value: "18", color: "text-foreground" },
          { label: "Успешно", value: "16", color: "text-emerald-400" },
          { label: "В споре", value: "1", color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {HISTORY.map((h, i) => (
          <div
            key={h.id}
            className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all animate-slide-up"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="FileText" size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{h.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {h.contractor} · {h.date}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-sm text-foreground">{h.amount}</div>
              <div className="mt-1">
                <StatusBadge status={h.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactsPage() {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">Контакты</h1>
      <p className="text-muted-foreground text-sm mb-10">Мы всегда на связи — выберите удобный способ</p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {[
          { icon: "Phone", label: "Телефон", value: "+7 (800) 555-04-71", sub: "Бесплатно, пн–пт 9:00–18:00" },
          { icon: "Mail", label: "Email", value: "support@podrad.ru", sub: "Ответим в течение 2 часов" },
          { icon: "MessageSquare", label: "Telegram", value: "@podrad_support", sub: "Быстрый ответ 24/7" },
          { icon: "MapPin", label: "Офис", value: "Москва, ул. Строителей, 12", sub: "По предварительной записи" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Icon name={c.icon} size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">{c.label}</div>
              <div className="font-semibold text-sm">{c.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Contact form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold mb-5">Написать нам</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {["Ваше имя", "Email"].map((f) => (
            <div key={f}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{f}</label>
              <input
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder={f}
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Сообщение</label>
            <textarea
              rows={4}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              placeholder="Опишите ваш вопрос..."
            />
          </div>
        </div>
        <button className="mt-4 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
          <Icon name="Send" size={15} />
          Отправить
        </button>
      </div>
    </div>
  );
}

function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">Частые вопросы</h1>
      <p className="text-muted-foreground text-sm mb-10">Ответы на популярные вопросы о работе платформы</p>

      <div className="flex flex-col gap-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/30"
          >
            <button
              className="w-full flex items-center justify-between p-5 text-left"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-semibold text-sm pr-4">{item.q}</span>
              <Icon
                name="ChevronDown"
                size={16}
                className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4 animate-fade-in">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 bg-primary/8 border border-primary/20 rounded-2xl p-6 text-center">
        <Icon name="HelpCircle" size={28} className="text-primary mx-auto mb-3" />
        <h3 className="font-bold mb-1">Не нашли ответ?</h3>
        <p className="text-sm text-muted-foreground mb-4">Наша поддержка ответит на любой вопрос за 2 часа</p>
        <button className="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all text-sm">
          Написать в поддержку
        </button>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

  const NAV = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "lots", label: "Лоты", icon: "Briefcase" },
    { id: "profile", label: "Профиль", icon: "User" },
    { id: "history", label: "История", icon: "History" },
    { id: "contacts", label: "Контакты", icon: "Phone" },
    { id: "faq", label: "FAQ", icon: "HelpCircle" },
  ] as const;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background font-golos">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
            <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
              <button onClick={() => setPage("home")} className="flex items-center gap-2.5 font-black text-lg tracking-tight">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Hammer" size={14} className="text-primary-foreground" />
                </div>
                <span>ПодрядБиржа</span>
              </button>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1">
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setPage(n.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
                      page === n.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </nav>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                >
                  <Icon name="Bell" size={18} className="text-muted-foreground" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center badge-glow">
                      {unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 z-50 animate-fade-in overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="font-semibold text-sm">Уведомления</span>
                      <button onClick={markAllRead} className="text-xs text-primary hover:underline">Прочитать все</button>
                    </div>
                    {notifications.map((n) => (
                      <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 ${!n.read ? "bg-primary/4" : ""}`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed text-foreground">{n.text}</p>
                          <span className="text-[11px] text-muted-foreground mt-0.5 block">{n.time} назад</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main onClick={() => notifOpen && setNotifOpen(false)}>
            {page === "home" && <HomePage onNavigate={setPage} />}
            {page === "lots" && <LotsPage />}
            {page === "profile" && <ProfilePage />}
            {page === "history" && <HistoryPage />}
            {page === "contacts" && <ContactsPage />}
            {page === "faq" && <FAQPage />}
          </main>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40">
            <div className="flex">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
                    page === n.id ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon name={n.icon} size={18} />
                  <span className="text-[10px] font-medium">{n.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Bottom padding for mobile */}
          <div className="md:hidden h-16" />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
