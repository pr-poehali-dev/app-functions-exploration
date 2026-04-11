import { useState } from "react";
import Icon from "@/components/ui/icon";
import { StatsTab } from "./admin/StatsTab";
import { LotsTab } from "./admin/LotsTab";
import { UsersTab } from "./admin/UsersTab";
import { BidsTab, CategoriesTab } from "./admin/BidsAndCategoriesTab";
import { ComplaintsTab, VerificationTab } from "./admin/ComplaintsAndVerificationTab";

type Tab = "stats" | "lots" | "users" | "bids" | "categories" | "complaints" | "verification";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stats", label: "Статистика", icon: "BarChart3" },
  { id: "lots", label: "Лоты", icon: "Package" },
  { id: "users", label: "Пользователи", icon: "Users" },
  { id: "bids", label: "Ставки", icon: "Gavel" },
  { id: "categories", label: "Категории", icon: "FolderOpen" },
  { id: "complaints", label: "Жалобы", icon: "Flag" },
  { id: "verification", label: "Верификация", icon: "ShieldCheck" },
];

export function AdminPage({ onOpenLot }: { onOpenLot: (id: number) => void }) {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Icon name="Shield" size={24} className="text-primary" />
          Панель администратора
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Управление платформой</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === "stats" && <StatsTab />}
        {tab === "lots" && <LotsTab onOpenLot={onOpenLot} />}
        {tab === "users" && <UsersTab />}
        {tab === "bids" && <BidsTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "complaints" && <ComplaintsTab />}
        {tab === "verification" && <VerificationTab />}
      </div>
    </div>
  );
}