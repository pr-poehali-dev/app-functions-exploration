import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api, saveToken } from "@/lib/api";
import { toast } from "sonner";
import { User, Role, statusLabel } from "./types";

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

export function StatusBadge({ status }: { status: string }) {
  const s = statusLabel[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

export function AuthPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    login: "",
    email: "",
    password: "",
    full_name: "",
    role: "customer" as Role,
    entity_type: "individual",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.auth.login({ login: form.login, password: form.password }) as { token: string; user: User };
        saveToken(res.token);
        onAuth(res.user);
        toast.success("Добро пожаловать!");
      } else {
        const res = await api.auth.register({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          entity_type: form.entity_type,
        }) as { token: string; user: User };
        saveToken(res.token);
        onAuth(res.user);
        toast.success("Регистрация успешна!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Icon name="Lock" size={12} />
            {mode === "login" ? "Вход в систему" : "Создание аккаунта"}
          </div>
          <h1 className="text-3xl font-black mb-2">
            {mode === "login" ? "С возвращением" : "Регистрация"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Войдите чтобы участвовать в торгах" : "Начните работать на площадке"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Я...</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["customer", "contractor"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.role === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {r === "customer" ? "Заказчик" : "Подрядчик"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ФИО / Название</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Тип лица</label>
                <select
                  value={form.entity_type}
                  onChange={(e) => setForm({ ...form, entity_type: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="individual">Физическое лицо</option>
                  <option value="self_employed">Самозанятый</option>
                  <option value="ip">ИП</option>
                  <option value="legal">Юридическое лицо</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <input
              required
              type="email"
              value={mode === "login" ? form.login : form.email}
              onChange={(e) =>
                mode === "login"
                  ? setForm({ ...form, login: e.target.value })
                  : setForm({ ...form, email: e.target.value })
              }
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="you@company.ru"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Пароль</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Минимум 6 символов"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProfilePage({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    company_name: user.company_name || "",
    city: user.city || "",
    about: user.about || "",
    inn: user.inn || "",
    experience_years: user.experience_years || 0,
  });

  const save = async () => {
    try {
      await api.auth.updateProfile(form);
      const res = await api.auth.me() as { user: User };
      onUpdate(res.user);
      toast.success("Профиль обновлён");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-8">Профиль</h1>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-black text-2xl flex-shrink-0">
            {user.full_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{user.full_name}</h2>
              {user.is_verified && <Icon name="BadgeCheck" size={18} className="text-primary" />}
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                {user.role === "customer" ? "Заказчик" : user.role === "contractor" ? "Подрядчик" : "Администратор"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email || user.phone}</p>
            {(user.rating ?? 0) > 0 && (
              <div className="mt-2">
                <StarRating rating={user.rating || 0} />
                <span className="text-xs text-muted-foreground ml-2">{user.reviews_count} отзывов · {user.deals_count} сделок</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-6 border-t border-border">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ФИО / Название</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Компания</label>
            <input
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Город</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ИНН</label>
            <input
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          {user.role === "contractor" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Опыт (лет)</label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">О себе / О компании</label>
            <textarea
              rows={3}
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
        </div>

        <button onClick={save} className="mt-5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all">
          Сохранить
        </button>
      </div>
    </div>
  );
}
