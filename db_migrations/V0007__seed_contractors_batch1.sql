
-- Seed заказчиков для 5 городов
INSERT INTO users (email, phone, password_hash, role, entity_type, full_name, company_name, city, about, experience_years, specializations, rating, rating_points, is_verified, profile_bonus_awarded)
VALUES
('zakazchik.msk@mail.ru', '+79101000001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'customer', 'legal', 'Андрей Петров', 'ПетровСтрой', 'Москва', 'Строительная компания полного цикла, работаем с 2010 года', 0, NULL, 4.5, 200, true, true),
('zakazchik.kzn@mail.ru', '+79101000002', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'customer', 'legal', 'Марат Хасанов', 'КазаньИнвест', 'Казань', 'Управление коммерческой недвижимостью', 0, NULL, 4.3, 150, true, true),
('zakazchik.nn@mail.ru', '+79101000003', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'customer', 'ip', 'Ольга Смирнова', 'ИП Смирнова', 'Нижний Новгород', 'Реконструкция жилых и нежилых помещений', 0, NULL, 4.7, 300, true, true),
('zakazchik.spb@mail.ru', '+79101000004', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'customer', 'legal', 'Дмитрий Волков', 'НеваДевелопмент', 'Санкт-Петербург', 'Девелоперская компания, жилые и коммерческие объекты', 0, NULL, 4.6, 250, true, true),
('zakazchik.krd@mail.ru', '+79101000005', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'customer', 'legal', 'Игорь Кравцов', 'ЮгСтройГрупп', 'Краснодар', 'Строительство и реконструкция на юге России', 0, NULL, 4.4, 180, true, true);
