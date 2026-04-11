import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lot, User, formatPrice, timeLeft, statusLabel } from "../types";

interface FavContractor {
  id: number;
  full_name: string;
  company_name?: string;
  city?: string;
  rating: number;
  deals_count?: number;
  rating_points: number;
  badges: string[];
  is_verified: boolean;
  specializations: string[];
  experience_years?: number;
}

export function FavoritesPage({
  user,
  onOpenLot,
  onOpenContractor,
}: {
  user: User;
  onOpenLot: (id: number) => void;
  onOpenContractor: (id: number) => void;
}) {
  const [tab, setTab] = useState<"lots" | "contractors">(user.role === "contractor" ? "lots" : "contractors");
  const [lots, setLots] = useState<Lot[]>([]);
  const [contractors, setContractors] = useState<FavContractor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLots = useCallback(() => {
    setLoading(true);
    api.social
      .favLots()
      .then((res) => setLots((res as { lots: Lot[] }).lots || []))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const loadContractors = useCallback(() => {
    setLoading(true);
    api.social
      .favContractors()
      .then((res) => setContractors((res as { contractors: FavContractor[] }).contractors || []))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "lots") loadLots();
    else loadContractors();
  }, [tab, loadLots, loadContractors]);

  const removeLot = async (lotId: number) => {
    try {
      await api.social.favLot(lotId, false);
      toast.success("Удалено из избранного");
      loadLots();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const removeContractor = async (cid: number) => {
    try {
      await api.social.favContractor(cid, false);
      toast.success("Удалено из избранного");
      loadContractors();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2.5">
          <Icon name="Heart" size={28} className="text-primary" />
          Избранное
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Сохранённые лоты и подрядчики</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("lots")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "lots"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Package" size={16} />
          Лоты ({lots.length})
        </button>
        <button
          onClick={() => setTab("contractors")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "contractors"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="HardHat" size={16} />
          Подрядчики ({contractors.length})
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
          Загрузка...
        </div>
      )}

      {!loading && tab === "lots" && (
        lots.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
            <Icon name="Heart" size={48} className="mx-auto mb-3 opacity-30" />
            <p>Нет сохранённых лотов</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lots.map((lot) => {
              const st = statusLabel[lot.status] || { label: lot.status, cls: "bg-muted text-muted-foreground border-border" };
              return (
                <div key={lot.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onOpenLot(lot.id)}
                        className="font-bold hover:text-primary transition-colors text-left"
                      >
                        {lot.title}
                      </button>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {lot.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={10} />{lot.city}</span>}
                        <span className="flex items-center gap-1"><Icon name="Users" size={10} />{lot.bids_count} ставок</span>
                        {lot.status === "active" && (
                          <span className="flex items-center gap-1"><Icon name="Clock" size={10} />{timeLeft(lot.auction_end_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                      <span className="text-primary font-bold">{formatPrice(lot.current_min_bid || lot.start_price)}</span>
                      <button
                        onClick={() => removeLot(lot.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                        title="Убрать из избранного"
                      >
                        <Icon name="HeartOff" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {!loading && tab === "contractors" && (
        contractors.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
            <Icon name="Heart" size={48} className="mx-auto mb-3 opacity-30" />
            <p>Нет сохранённых подрядчиков</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {contractors.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-black text-lg flex-shrink-0">
                    {c.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onOpenContractor(c.id)}
                      className="font-bold hover:text-primary transition-colors text-left block truncate"
                    >
                      {c.full_name}
                    </button>
                    {c.company_name && <div className="text-xs text-muted-foreground truncate">{c.company_name}</div>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 text-primary font-semibold"><Icon name="Award" size={10} />{c.rating_points}</span>
                      {c.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={10} />{c.city}</span>}
                      {c.deals_count != null && <span>{c.deals_count} сделок</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeContractor(c.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                    title="Убрать из избранного"
                  >
                    <Icon name="HeartOff" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
