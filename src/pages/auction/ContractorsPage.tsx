import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Contractor, Badge, BADGE_INFO, Review, formatDate } from "./types";
import { ComplaintDialog } from "./social/ComplaintDialog";

function BadgeChip({ badge }: { badge: Badge }) {
  const info = BADGE_INFO[badge];
  if (!info) return null;
  return (
    <span
      title={info.description}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${info.cls}`}
    >
      <Icon name={info.icon} size={12} />
      {info.label}
    </span>
  );
}

function RatingBadge({ points }: { points: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
      <Icon name="Award" size={14} className="text-primary" />
      <span className="text-xs font-bold text-primary">{points}</span>
    </div>
  );
}

export function ContractorsPage({ onOpen }: { onOpen: (id: number) => void }) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [badgeFilter, setBadgeFilter] = useState<"all" | Badge>("all");
  const [sort, setSort] = useState<"rating" | "deals" | "new">("rating");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = useCallback(() => {
    setLoading(true);
    api.auth
      .contractors({
        search: search || undefined,
        city: city || undefined,
        badge: badgeFilter === "all" ? undefined : badgeFilter,
        sort,
        page,
        per_page: perPage,
      })
      .then((res) => {
        const d = res as { contractors: Contractor[]; total: number };
        setContractors(d.contractors || []);
        setTotal(d.total || 0);
      })
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [search, city, badgeFilter, sort, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2.5">
          <Icon name="HardHat" size={28} className="text-primary" />
          Исполнители
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Проверенные подрядчики с рейтингом и знаками отличия. Всего: {total}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по имени или компании..."
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
              type="text"
              placeholder="Город"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { value: "all", label: "Все" },
              { value: "vip", label: "VIP" },
              { value: "gost", label: "ГОСТ" },
            ].map((b) => (
              <button
                key={b.value}
                onClick={() => {
                  setBadgeFilter(b.value as "all" | Badge);
                  setPage(1);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  badgeFilter === b.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "rating" | "deals" | "new")}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="rating">По рейтингу</option>
            <option value="deals">По сделкам</option>
            <option value="new">Новые</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && contractors.length === 0 && (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
          <Icon name="HardHat" size={48} className="mx-auto mb-3 opacity-30" />
          <p>Исполнителей не найдено</p>
        </div>
      )}

      {!loading && contractors.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {contractors.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-black text-xl flex-shrink-0">
                  {c.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate group-hover:text-primary transition-colors">{c.full_name}</h3>
                    {c.is_verified && <Icon name="BadgeCheck" size={16} className="text-primary shrink-0" />}
                  </div>
                  {c.company_name && <p className="text-xs text-muted-foreground truncate">{c.company_name}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <RatingBadge points={c.rating_points} />
                    {c.city && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name="MapPin" size={11} />
                        {c.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {c.badges && c.badges.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {c.badges.map((b) => (
                    <BadgeChip key={b} badge={b} />
                  ))}
                </div>
              )}

              {c.about && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.about}</p>}

              {c.specializations && c.specializations.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {c.specializations.slice(0, 4).map((s) => (
                    <span key={s} className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                {c.experience_years != null && c.experience_years > 0 && (
                  <span className="flex items-center gap-1">
                    <Icon name="Briefcase" size={11} />
                    {c.experience_years} лет опыта
                  </span>
                )}
                {c.deals_count != null && (
                  <span className="flex items-center gap-1">
                    <Icon name="Handshake" size={11} />
                    {c.deals_count} сделок
                  </span>
                )}
                {c.work_photos && c.work_photos.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Icon name="Image" size={11} />
                    {c.work_photos.length} фото
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
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

export function ContractorDetailPage({ contractorId, onBack }: { contractorId: number; onBack: () => void }) {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.auth
      .contractor(contractorId)
      .then((res) => setContractor((res as { contractor: Contractor }).contractor))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
    api.social
      .reviews(contractorId)
      .then((res) => setReviews((res as { reviews: Review[] }).reviews || []))
      .catch(() => {});
    api.social
      .favContractorCheck(contractorId)
      .then((res) => setIsFav((res as { is_fav: boolean }).is_fav))
      .catch(() => {});
  }, [contractorId]);

  const toggleFav = async () => {
    try {
      await api.social.favContractor(contractorId, !isFav);
      setIsFav(!isFav);
      toast.success(!isFav ? "Добавлен в избранное" : "Удалён из избранного");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
        Загрузка...
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Icon name="AlertCircle" size={40} className="mx-auto mb-3 opacity-30" />
        <p>Исполнитель не найден</p>
        <button onClick={onBack} className="mt-4 text-primary hover:underline text-sm">
          Вернуться к списку
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Icon name="ChevronLeft" size={14} />
          Все исполнители
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFav}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              isFav ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-card text-muted-foreground border-border hover:border-red-500/30 hover:text-red-400"
            }`}
          >
            <Icon name="Heart" size={13} className={isFav ? "fill-current" : ""} />
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
      </div>

      <ComplaintDialog
        open={complaintOpen}
        onClose={() => setComplaintOpen(false)}
        targetType="user"
        targetId={contractorId}
        targetName={contractor.full_name}
      />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-black text-3xl flex-shrink-0">
            {contractor.full_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black">{contractor.full_name}</h1>
              {contractor.is_verified && <Icon name="BadgeCheck" size={20} className="text-primary" />}
            </div>
            {contractor.company_name && <p className="text-sm text-muted-foreground mt-0.5">{contractor.company_name}</p>}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <RatingBadge points={contractor.rating_points} />
              {contractor.city && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon name="MapPin" size={12} />
                  {contractor.city}
                </span>
              )}
              {contractor.experience_years != null && contractor.experience_years > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon name="Briefcase" size={12} />
                  {contractor.experience_years} лет опыта
                </span>
              )}
              {contractor.deals_count != null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon name="Handshake" size={12} />
                  {contractor.deals_count} сделок
                </span>
              )}
            </div>
            {contractor.badges && contractor.badges.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {contractor.badges.map((b) => (
                  <BadgeChip key={b} badge={b} />
                ))}
              </div>
            )}
          </div>
        </div>

        {contractor.about && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">О себе</h3>
            <p className="text-sm text-foreground whitespace-pre-line">{contractor.about}</p>
          </div>
        )}

        {contractor.specializations && contractor.specializations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Специализации</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {contractor.specializations.map((s) => (
                <span key={s} className="text-xs text-foreground bg-secondary px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {contractor.work_photos && contractor.work_photos.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Icon name="Images" size={16} className="text-primary" />
            Работы ({contractor.work_photos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {contractor.work_photos.map((url) => (
              <div
                key={url}
                onClick={() => setLightbox(url)}
                className="aspect-square rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/40 transition-all"
              >
                <img src={url} alt="Работа" className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 mt-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Icon name="Star" size={16} className="text-amber-400" />
          Отзывы ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет отзывов</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-background border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {r.author_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.author_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.author_role === "customer" ? "Заказчик" : "Подрядчик"} · {formatDate(r.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= r.rating ? "text-amber-400" : "text-muted-foreground/30"}>★</span>
                    ))}
                  </div>
                </div>
                {r.lot_title && (
                  <div className="text-[11px] text-muted-foreground mb-2">
                    По лоту: <span className="text-foreground/80">{r.lot_title}</span>
                  </div>
                )}
                {r.comment && <p className="text-sm text-foreground/90">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <img src={lightbox} alt="Работа" className="max-w-full max-h-full rounded-xl" />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}