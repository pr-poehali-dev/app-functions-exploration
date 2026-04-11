import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lot, Bid, Category, LotAttachment, formatPrice, formatDate } from "../types";
import { StatusBadge } from "../AuthProfilePages";

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
            const bb = b as Bid & { lot_title?: string; lot_status?: string; current_min_bid?: number; is_winner?: boolean; lot_id?: number };
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
