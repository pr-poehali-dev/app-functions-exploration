import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ComplaintDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  targetType: "lot" | "user";
  targetId: number;
  targetName?: string;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const reasons = targetType === "lot"
    ? ["Мошенничество", "Нереалистичная цена", "Дубликат лота", "Неприемлемое содержание", "Другое"]
    : ["Оскорбления", "Мошенничество", "Не выходит на связь", "Срыв сроков", "Другое"];

  const submit = async () => {
    if (!reason) {
      toast.error("Выберите причину");
      return;
    }
    setSending(true);
    try {
      await api.social.complaintCreate({ target_type: targetType, target_id: targetId, reason, message });
      toast.success("Жалоба отправлена. Администраторы рассмотрят её в ближайшее время");
      onClose();
      setReason("");
      setMessage("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icon name="Flag" size={18} className="text-red-500" />
            Пожаловаться
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        {targetName && (
          <p className="text-xs text-muted-foreground mb-4">
            На {targetType === "lot" ? "лот" : "пользователя"}: <span className="text-foreground font-medium">{targetName}</span>
          </p>
        )}

        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Причина</label>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  reason === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Детали (необязательно)</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опишите ситуацию подробнее..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-secondary text-secondary-foreground font-semibold py-2.5 rounded-lg hover:bg-secondary/80 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={sending}
            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
          >
            {sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
