import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ReviewDialog({
  open,
  onClose,
  lotId,
  targetId,
  targetName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  lotId: number;
  targetId: number;
  targetName?: string;
  onSaved?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setSending(true);
    try {
      await api.social.reviewCreate({ lot_id: lotId, target_id: targetId, rating, comment });
      toast.success("Отзыв опубликован");
      onClose();
      setComment("");
      setRating(5);
      onSaved?.();
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
            <Icon name="Star" size={18} className="text-amber-400" />
            Оставить отзыв
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        {targetName && (
          <p className="text-xs text-muted-foreground mb-4">
            О пользователе: <span className="text-foreground font-medium">{targetName}</span>
          </p>
        )}

        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Оценка</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-3xl transition-all ${
                  n <= rating ? "text-amber-400 scale-110" : "text-muted-foreground/30 hover:text-muted-foreground/60"
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-3 text-sm font-medium">{rating}/5</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Комментарий</label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Что понравилось, что можно улучшить..."
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
            className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {sending ? "Отправка..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}
