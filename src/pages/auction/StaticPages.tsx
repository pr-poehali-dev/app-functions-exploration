import { useState } from "react";
import Icon from "@/components/ui/icon";

export function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);
  const items = [
    { q: "Как работает обратный аукцион?", a: "Заказчик указывает максимальную цену, подрядчики делают ставки с понижением. По истечении срока торгов заказчик выбирает исполнителя — не обязательно с самой низкой ценой." },
    { q: "Как разместить лот?", a: "Зарегистрируйтесь как заказчик, перейдите в «Мои лоты» и нажмите «Разместить лот». Заполните описание, цену и сроки — лот отправится на модерацию." },
    { q: "Что такое шаг снижения?", a: "Минимальная величина, на которую новая ставка должна быть ниже предыдущей. Например, при шаге 5 000 ₽ и текущей ставке 2 000 000 ₽ следующая может быть максимум 1 995 000 ₽." },
    { q: "Видят ли подрядчики друг друга?", a: "До завершения торгов все ставки анонимны. После окончания заказчик получает полные профили всех участников." },
    { q: "Можно ли выбрать не самую низкую цену?", a: "Да. Заказчик может выбрать любого подрядчика на основе цены, рейтинга, портфолио и отзывов." },
    { q: "Какая комиссия у платформы?", a: "Комиссия 2.5% от суммы сделки, взимается только при успешном завершении работ." },
  ];
  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">Частые вопросы</h1>
      <p className="text-muted-foreground text-sm mb-10">Всё о работе платформы обратных аукционов</p>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all">
            <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
              <span className="font-semibold text-sm pr-4">{item.q}</span>
              <Icon name="ChevronDown" size={16} className={`text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4 animate-fade-in">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactsPage() {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-black mb-2">Поддержка</h1>
      <p className="text-muted-foreground text-sm mb-10">Свяжитесь с нами любым удобным способом</p>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { icon: "Phone", label: "Телефон", value: "+7 (800) 555-04-71", sub: "Пн–Пт 9:00–18:00" },
          { icon: "Mail", label: "Email", value: "support@podrad.ru", sub: "Ответ в течение 2 часов" },
          { icon: "MessageSquare", label: "Telegram", value: "@podrad_support", sub: "Быстрый ответ 24/7" },
          { icon: "MapPin", label: "Офис", value: "Москва, Строителей 12", sub: "По записи" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:border-primary/30 transition-all">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
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
    </div>
  );
}
