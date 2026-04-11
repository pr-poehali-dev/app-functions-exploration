import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api, clearToken, getToken } from "@/lib/api";
import { toast } from "sonner";
import { Page, User, Notification } from "./auction/types";
import { AuthPage, ProfilePage } from "./auction/AuthProfilePages";
import { HomePage, LotsPage, LotDetailPage, MyLotsPage, MyBidsPage } from "./auction/LotPages";
import { FAQPage, ContactsPage } from "./auction/StaticPages";
import { AdminPage } from "./auction/AdminPage";
import { ContractorsPage, ContractorDetailPage } from "./auction/ContractorsPage";
import { FavoritesPage } from "./auction/social/FavoritesPage";
import { SubscriptionsPage } from "./auction/social/SubscriptionsPage";
import { DashboardPage } from "./auction/social/DashboardPage";
import { useTheme } from "@/hooks/useTheme";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const { theme, toggle: toggleTheme } = useTheme();

  const loadMe = useCallback(() => {
    if (!getToken()) return;
    api.auth.me().then((res) => setUser((res as { user: User }).user)).catch(() => clearToken());
  }, []);

  const loadNotifications = useCallback(() => {
    if (!getToken()) return;
    api.notifications.list().then((res) => {
      const d = res as { notifications: Notification[]; unread_count: number };
      setNotifications(d.notifications);
      setUnread(d.unread_count);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const t = setInterval(loadNotifications, 15000);
    return () => clearInterval(t);
  }, [user, loadNotifications]);

  const handleAuth = (u: User) => {
    setUser(u);
    setPage("home");
  };

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
    setPage("home");
    toast.success("Вы вышли из системы");
  };

  const openLot = (id: number) => {
    setSelectedLotId(id);
    setPage("lot_detail");
  };

  const markAllRead = async () => {
    await api.notifications.read();
    loadNotifications();
  };

  const openContractor = (id: number) => {
    setSelectedContractorId(id);
    setPage("contractor_detail");
  };

  const navItems: { id: Page; label: string; icon: string; show: boolean }[] = [
    { id: "home", label: "Главная", icon: "Home", show: true },
    { id: "lots", label: "Лоты", icon: "Briefcase", show: true },
    { id: "contractors", label: "Исполнители", icon: "HardHat", show: true },
    { id: "dashboard", label: "Дашборд", icon: "BarChart3", show: user?.role === "contractor" || user?.role === "customer" },
    { id: "my_lots", label: "Мои лоты", icon: "FolderOpen", show: user?.role === "customer" },
    { id: "my_bids", label: "Мои ставки", icon: "Gavel", show: user?.role === "contractor" },
    { id: "favorites", label: "Избранное", icon: "Heart", show: !!user },
    { id: "subscriptions", label: "Подписки", icon: "BellRing", show: user?.role === "contractor" },
    { id: "profile", label: "Профиль", icon: "User", show: !!user },
    { id: "admin", label: "Админ", icon: "Shield", show: user?.role === "admin" },
  ];

  return (
    <div className="min-h-screen bg-background font-golos">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <button onClick={() => setPage("home")} className="flex items-center gap-2.5 font-black text-lg tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Gavel" size={16} className="text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">Тендер Инфо</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.filter((n) => n.show).map((n) => (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
                  page === n.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              <Icon name={theme === "dark" ? "Sun" : "Moon"} size={16} className="text-muted-foreground" />
            </button>
            {user ? (
              <>
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
                        {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Прочитать все</button>}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">Уведомлений пока нет</div>
                        ) : notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 ${!n.is_read ? "bg-primary/5" : ""}`}>
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                              <div>
                                <div className="font-medium text-sm">{n.title}</div>
                                {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                  title="Выйти"
                >
                  <Icon name="LogOut" size={16} className="text-muted-foreground" />
                </button>
                <div
                  onClick={() => setPage("profile")}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-sm cursor-pointer"
                >
                  {user.full_name[0]}
                </div>
              </>
            ) : (
              <button
                onClick={() => setPage("auth")}
                className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all"
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main onClick={() => notifOpen && setNotifOpen(false)}>
        {page === "home" && <HomePage onNavigate={setPage} user={user} onOpenLot={openLot} />}
        {page === "lots" && <LotsPage onOpenLot={openLot} />}
        {page === "lot_detail" && selectedLotId && (
          <LotDetailPage lotId={selectedLotId} user={user} onBack={() => setPage("lots")} />
        )}
        {page === "my_lots" && user?.role === "customer" && <MyLotsPage onOpenLot={openLot} />}
        {page === "my_bids" && user?.role === "contractor" && <MyBidsPage onOpenLot={openLot} />}
        {page === "profile" && user && <ProfilePage user={user} onUpdate={setUser} />}
        {page === "auth" && <AuthPage onAuth={handleAuth} />}
        {page === "faq" && <FAQPage />}
        {page === "contacts" && <ContactsPage />}
        {page === "contractors" && <ContractorsPage onOpen={openContractor} />}
        {page === "contractor_detail" && selectedContractorId && (
          <ContractorDetailPage contractorId={selectedContractorId} onBack={() => setPage("contractors")} />
        )}
        {page === "favorites" && user && (
          <FavoritesPage user={user} onOpenLot={openLot} onOpenContractor={openContractor} />
        )}
        {page === "subscriptions" && user && <SubscriptionsPage />}
        {page === "dashboard" && user && <DashboardPage user={user} onOpenLot={openLot} />}
        {page === "admin" && user?.role === "admin" && <AdminPage onOpenLot={openLot} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40">
        <div className="flex">
          {navItems.filter((n) => n.show).slice(0, 5).map((n) => (
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
      <div className="md:hidden h-16" />

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-6">
        <div className="max-w-5xl mx-auto text-center text-xs text-muted-foreground">
          © 2026 Тендер Инфо · Электронная торговая площадка ·{" "}
          <button onClick={() => setPage("faq")} className="hover:text-primary transition-colors">FAQ</button> ·{" "}
          <button onClick={() => setPage("contacts")} className="hover:text-primary transition-colors">Контакты</button>
        </div>
      </footer>
    </div>
  );
};

export default Index;