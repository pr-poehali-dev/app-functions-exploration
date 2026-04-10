
-- Demo users
INSERT INTO users (email, password_hash, role, entity_type, full_name, company_name, city, region, inn, is_verified, rating, reviews_count, deals_count, experience_years, about, specializations) VALUES
('ivanov@example.com', 'demo_hash_1', 'customer', 'legal', 'Иванов Сергей Петрович', 'ООО СтройИнвест', 'Москва', 'Москва', '7701234567', true, 4.8, 24, 18, 0, 'Застройщик коммерческой недвижимости', NULL),
('stroymaster@example.com', 'demo_hash_2', 'contractor', 'legal', 'Петров Дмитрий', 'ООО СтройМастер', 'Москва', 'Москва', '7702345678', true, 4.9, 142, 142, 12, 'Специализируемся на кровельных и фасадных работах любой сложности', ARRAY['Кровельные работы', 'Фасадные работы']),
('electro@example.com', 'demo_hash_3', 'contractor', 'legal', 'Сидоров Алексей', 'ООО ЭлектроПро', 'Казань', 'Татарстан', '1601234567', true, 4.8, 98, 98, 9, 'Электромонтажные работы с допуском СРО', ARRAY['Электромонтаж']),
('aqua@example.com', 'demo_hash_4', 'contractor', 'ip', 'Морозов Виктор', 'ИП Морозов В.А.', 'Новосибирск', 'Новосибирская область', '540123456789', true, 4.7, 87, 87, 8, 'Сантехнические работы, водоснабжение, отопление', ARRAY['Сантехника']),
('decor@example.com', 'demo_hash_5', 'contractor', 'legal', 'Кузнецов Илья', 'ООО ДекорГрупп', 'Санкт-Петербург', 'Санкт-Петербург', '7801234567', false, 4.6, 203, 203, 15, 'Полный цикл отделочных работ', ARRAY['Отделочные работы']),
('green@example.com', 'demo_hash_6', 'contractor', 'self_employed', 'Зеленов Максим', NULL, 'Екатеринбург', 'Свердловская область', '660123456789', true, 4.5, 56, 56, 6, 'Благоустройство, озеленение, малые архитектурные формы', ARRAY['Благоустройство']);

-- Demo lots (set various end dates in the future)
INSERT INTO lots (customer_id, title, category_id, description, object_type, object_area, address, city, region, start_price, current_min_bid, bid_step, work_duration_days, auction_end_at, payment_terms, materials_by, warranty_months, status, bids_count) VALUES
((SELECT id FROM users WHERE email='ivanov@example.com'), 'Монтаж кровли склада 1200 м²', 5, 'Монтаж металлочерепицы на складском комплексе. Требуется бригада с опытом от 5 лет. Материалы заказчика.', 'Склад', 1200, 'Москва, Варшавское ш. 125', 'Москва', 'Москва', 2400000, 2150000, 5000, 45, NOW() + INTERVAL '3 days', 'staged', 'customer', 24, 'active', 7),
((SELECT id FROM users WHERE email='ivanov@example.com'), 'Фасадные работы бизнес-центр', 6, 'Вентилируемый фасад из керамогранита, площадь 3400 м². Проект и смета прилагаются. Класс А+.', 'БЦ', 3400, 'Санкт-Петербург, Невский 45', 'Санкт-Петербург', 'Санкт-Петербург', 5800000, 5300000, 10000, 90, NOW() + INTERVAL '7 days', 'staged', 'both', 36, 'active', 12),
((SELECT id FROM users WHERE email='ivanov@example.com'), 'Прокладка электросетей в ЖК', 2, 'Электромонтажные работы в жилом доме на 80 квартир. Нужен допуск СРО.', 'Жилой дом', 4800, 'Казань, ул. Ленина 10', 'Казань', 'Татарстан', 890000, 780000, 2000, 30, NOW() + INTERVAL '2 days', 'on_completion', 'contractor', 12, 'active', 5),
((SELECT id FROM users WHERE email='ivanov@example.com'), 'Благоустройство территории ЖК', 7, 'Укладка тротуарной плитки, озеленение, установка малых архитектурных форм.', 'Придомовая территория', 2800, 'Екатеринбург, Уральская 25', 'Екатеринбург', 'Свердловская область', 1200000, 1080000, 3000, 60, NOW() + INTERVAL '5 days', 'staged', 'both', 24, 'active', 9),
((SELECT id FROM users WHERE email='ivanov@example.com'), 'Сантехника ЖК «Парковый»', 3, 'Монтаж водоснабжения и канализации в 120-квартирном доме. Материалы заказчика.', 'ЖК', 9600, 'Новосибирск, Красный 88', 'Новосибирск', 'Новосибирская область', 3100000, 2850000, 5000, 75, NOW() + INTERVAL '10 days', 'staged', 'customer', 36, 'active', 4),
((SELECT id FROM users WHERE email='ivanov@example.com'), 'Внутренняя отделка офиса 400 м²', 1, 'Чистовая отделка офиса 400 м², гипсокартон, стяжка, покраска. Срочно.', 'Офис', 400, 'Москва, Пресненская наб. 8', 'Москва', 'Москва', 760000, 680000, 2000, 21, NOW() + INTERVAL '1 day', 'on_completion', 'contractor', 12, 'active', 15);

-- Demo bids for first lot
INSERT INTO bids (lot_id, contractor_id, amount, comment) VALUES
((SELECT id FROM lots WHERE title LIKE 'Монтаж кровли%'), (SELECT id FROM users WHERE email='stroymaster@example.com'), 2150000, 'Готовы начать на следующей неделе'),
((SELECT id FROM lots WHERE title LIKE 'Монтаж кровли%'), (SELECT id FROM users WHERE email='decor@example.com'), 2200000, NULL);
