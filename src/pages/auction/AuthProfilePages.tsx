import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api, saveToken } from "@/lib/api";
import { toast } from "sonner";
import { User, Role, statusLabel, BADGE_INFO, Badge } from "./types";

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
    specializations: (user.specializations || []).join(", "),
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState("passport");
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const photos = user.work_photos || [];
  const badges = user.badges || [];
  const ratingPoints = user.rating_points || 0;
  const verificationStatus = user.verification_status || "none";
  const verificationDocs = user.verification_docs || [];

  const save = async () => {
    try {
      const specs = form.specializations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.auth.updateProfile({
        full_name: form.full_name,
        company_name: form.company_name,
        city: form.city,
        about: form.about,
        inn: form.inn,
        experience_years: form.experience_years,
        specializations: specs,
      });
      const res = await api.auth.me() as { user: User };
      onUpdate(res.user);
      toast.success("Профиль обновлён");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 5) {
      toast.error("Можно загрузить не более 5 фото");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Размер файла не более 5 МБ");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const ext = file.name.split(".").pop() || "jpg";
          await api.auth.uploadPhoto(base64, ext);
          const res = await api.auth.me() as { user: User };
          onUpdate(res.user);
          toast.success("Фото загружено");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setUploading(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error((err as Error).message);
      setUploading(false);
    }
  };

  const removePhoto = async (url: string) => {
    try {
      await api.auth.removePhoto(url);
      const res = await api.auth.me() as { user: User };
      onUpdate(res.user);
      toast.success("Фото удалено");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const uploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл не более 10 МБ");
      return;
    }
    setUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        await api.auth.verifyUpload({ data: base64, filename: file.name, doc_type: docType });
        const res = await api.auth.me() as { user: User };
        onUpdate(res.user);
        toast.success("Документ отправлен на проверку");
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setUploadingDoc(false);
        if (docRef.current) docRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
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
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                <Icon name="Award" size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary">{ratingPoints}</span>
                <span className="text-xs text-muted-foreground">баллов</span>
              </div>
              {(user.rating ?? 0) > 0 && <StarRating rating={user.rating || 0} />}
              {user.deals_count != null && user.deals_count > 0 && (
                <span className="text-xs text-muted-foreground">{user.deals_count} сделок</span>
              )}
            </div>
            {badges.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {badges.map((b) => {
                  const info = BADGE_INFO[b as Badge];
                  if (!info) return null;
                  return (
                    <span
                      key={b}
                      title={info.description}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${info.cls}`}
                    >
                      <Icon name={info.icon} size={12} />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-4 mb-6">
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Как зарабатываются баллы</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Заполненный профиль — 100 баллов</li>
            <li>• Выигранный лот — 200 баллов</li>
            <li>• Ежемесячный бонус — 100 баллов</li>
            <li>• Каждый знак отличия — 500 баллов</li>
          </ul>
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
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Опыт (лет)</label>
                <input
                  type="number"
                  value={form.experience_years}
                  onChange={(e) => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Специализации (через запятую)</label>
                <input
                  value={form.specializations}
                  onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                  placeholder="Кровля, Фасад, Электрика"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </>
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

      {user.role === "contractor" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Icon name="Images" size={18} className="text-primary" />
                Фото выполненных работ
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Загружено {photos.length} из 5. JPG, PNG, WebP до 5 МБ</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || photos.length >= 5}
              className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name={uploading ? "Loader2" : "Upload"} size={14} className={uploading ? "animate-spin" : ""} />
              {uploading ? "Загрузка..." : "Добавить фото"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          {photos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Icon name="Image" size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Пока нет фотографий работ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {photos.map((url) => (
                <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={url} alt="Работа" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(url)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Удалить"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Icon name="ShieldCheck" size={18} className="text-primary" />
              Верификация профиля
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Загрузите документы, чтобы получить значок «Проверен». Это необязательно, но повышает доверие.
            </p>
          </div>
          {verificationStatus === "verified" && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Icon name="CheckCircle2" size={12} /> Проверен
            </span>
          )}
          {verificationStatus === "pending" && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Icon name="Clock" size={12} /> На проверке
            </span>
          )}
          {verificationStatus === "rejected" && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
              <Icon name="XCircle" size={12} /> Отклонено
            </span>
          )}
        </div>

        {user.verification_comment && (
          <div className="bg-background border border-border rounded-lg p-3 mb-4 text-xs">
            <span className="text-muted-foreground">Комментарий администратора: </span>
            <span>{user.verification_comment}</span>
          </div>
        )}

        {verificationDocs.length > 0 && (
          <div className="space-y-2 mb-4">
            {verificationDocs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
                <Icon name="FileText" size={14} className="text-primary shrink-0" />
                <span className="text-sm flex-1 truncate">{d.name}</span>
                <span className="text-[11px] text-muted-foreground">{d.type}</span>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                  Открыть
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Тип документа</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="passport">Паспорт</option>
              <option value="inn">ИНН</option>
              <option value="ogrn">ОГРН / ЕГРЮЛ</option>
              <option value="license">Лицензия / Сертификат</option>
              <option value="other">Другое</option>
            </select>
          </div>
          <button
            onClick={() => docRef.current?.click()}
            disabled={uploadingDoc}
            className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name={uploadingDoc ? "Loader2" : "Upload"} size={14} className={uploadingDoc ? "animate-spin" : ""} />
            {uploadingDoc ? "Загрузка..." : "Загрузить"}
          </button>
          <input
            ref={docRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={uploadDoc}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}