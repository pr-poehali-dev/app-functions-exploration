import json
import os
import hashlib
import secrets
import psycopg2
from datetime import datetime, timedelta

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password):
    salt = "auction_salt_2026"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def make_token():
    return secrets.token_urlsafe(48)

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Content-Type': 'application/json'
    }

def is_profile_complete(u):
    required = [u.get('full_name'), u.get('city'), u.get('about'), u.get('phone') or u.get('email')]
    return all(required) and (u.get('role') != 'contractor' or (u.get('experience_years') and u.get('specializations')))

def recalc_and_apply_bonuses(user_id, conn):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, role, full_name, city, about, phone, email, experience_years, specializations, "
        "profile_bonus_awarded, last_monthly_bonus_at, rating_points, badges "
        "FROM users WHERE id = %d" % int(user_id)
    )
    r = cur.fetchone()
    if not r:
        return
    u = {
        'id': r[0], 'role': r[1], 'full_name': r[2], 'city': r[3], 'about': r[4],
        'phone': r[5], 'email': r[6], 'experience_years': r[7], 'specializations': r[8],
    }
    profile_bonus_awarded = r[9]
    last_bonus = r[10]
    delta = 0
    updates = []
    if not profile_bonus_awarded and is_profile_complete(u):
        delta += 100
        updates.append("profile_bonus_awarded = TRUE")
    now = datetime.now()
    if not last_bonus or (now - last_bonus).days >= 30:
        delta += 100
        updates.append("last_monthly_bonus_at = NOW()")
    if delta > 0:
        updates.append("rating_points = COALESCE(rating_points, 0) + %d" % delta)
        cur.execute("UPDATE users SET %s WHERE id = %d" % (", ".join(updates), int(user_id)))
        conn.commit()

def get_user_by_token(token, conn):
    """Получить пользователя по токену сессии"""
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.email, u.phone, u.role, u.full_name, u.company_name, u.city, u.region, "
        "u.entity_type, u.inn, u.avatar_url, u.about, u.specializations, u.experience_years, "
        "u.rating, u.reviews_count, u.deals_count, u.is_verified, u.is_blocked, u.created_at, "
        "u.rating_points, u.badges, u.work_photos, u.verification_status, u.verification_docs, u.verification_comment "
        "FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''")
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        'id': row[0], 'email': row[1], 'phone': row[2], 'role': row[3],
        'full_name': row[4], 'company_name': row[5], 'city': row[6], 'region': row[7],
        'entity_type': row[8], 'inn': row[9], 'avatar_url': row[10], 'about': row[11],
        'specializations': row[12] or [], 'experience_years': row[13],
        'rating': float(row[14]) if row[14] else 0, 'reviews_count': row[15],
        'deals_count': row[16], 'is_verified': row[17], 'is_blocked': row[18],
        'created_at': row[19].isoformat() if row[19] else None,
        'rating_points': row[20] or 0,
        'badges': row[21] or [],
        'work_photos': row[22] or [],
        'verification_status': row[23] or 'none',
        'verification_docs': row[24] or [],
        'verification_comment': row[25] or ''
    }

def handler(event, context):
    """Регистрация, авторизация, профиль и админ-управление пользователями"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', '')
    headers = cors_headers()

    # POST ?action=register
    if method == 'POST' and action == 'register':
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        phone = body.get('phone', '').strip()
        password = body.get('password', '')
        role = body.get('role', 'customer')
        full_name = body.get('full_name', '').strip()
        entity_type = body.get('entity_type', 'individual')

        if not password or len(password) < 6:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль должен быть не менее 6 символов'})}
        if not full_name:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите ФИО'})}
        if not email and not phone:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите email или телефон'})}
        if role not in ('customer', 'contractor'):
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Роль: customer или contractor'})}

        conn = get_db()
        cur = conn.cursor()

        if email:
            cur.execute("SELECT id FROM users WHERE email = '%s'" % email.replace("'", "''"))
            if cur.fetchone():
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Email уже зарегистрирован'})}

        if phone:
            cur.execute("SELECT id FROM users WHERE phone = '%s'" % phone.replace("'", "''"))
            if cur.fetchone():
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Телефон уже зарегистрирован'})}

        pwd_hash = hash_password(password)
        email_val = "'%s'" % email.replace("'", "''") if email else "NULL"
        phone_val = "'%s'" % phone.replace("'", "''") if phone else "NULL"

        cur.execute(
            "INSERT INTO users (email, phone, password_hash, role, full_name, entity_type) "
            "VALUES (%s, %s, '%s', '%s', '%s', '%s') RETURNING id"
            % (email_val, phone_val, pwd_hash, role, full_name.replace("'", "''"), entity_type)
        )
        user_id = cur.fetchone()[0]

        token = make_token()
        expires = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES (%d, '%s', '%s')"
            % (user_id, token, expires)
        )
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'token': token,
            'user': {'id': user_id, 'email': email, 'phone': phone, 'role': role, 'full_name': full_name}
        })}

    # POST ?action=login
    if method == 'POST' and action == 'login':
        body = json.loads(event.get('body', '{}'))
        login = body.get('login', '').strip().lower()
        password = body.get('password', '')

        if not login or not password:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите логин и пароль'})}

        conn = get_db()
        cur = conn.cursor()
        pwd_hash = hash_password(password)

        cur.execute(
            "SELECT id, email, phone, role, full_name, is_blocked FROM users "
            "WHERE (email = '%s' OR phone = '%s') AND password_hash = '%s'"
            % (login.replace("'", "''"), login.replace("'", "''"), pwd_hash)
        )
        row = cur.fetchone()

        if not row:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

        if row[5]:
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Аккаунт заблокирован'})}

        token = make_token()
        expires = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES (%d, '%s', '%s')"
            % (row[0], token, expires)
        )
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'token': token,
            'user': {'id': row[0], 'email': row[1], 'phone': row[2], 'role': row[3], 'full_name': row[4]}
        })}

    # GET ?action=me
    if method == 'GET' and action == 'me':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        conn = get_db()
        user = get_user_by_token(token, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

        recalc_and_apply_bonuses(user['id'], conn)
        user = get_user_by_token(token, conn)
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'user': user})}

    # PUT ?action=profile
    if method == 'PUT' and action == 'profile':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        conn = get_db()
        user = get_user_by_token(token, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

        body = json.loads(event.get('body', '{}'))
        updates = []
        allowed = ['full_name', 'company_name', 'city', 'region', 'address', 'about',
                    'entity_type', 'inn', 'ogrn', 'experience_years']

        for field in allowed:
            if field in body:
                val = body[field]
                if isinstance(val, str):
                    updates.append("%s = '%s'" % (field, str(val).replace("'", "''")))
                elif isinstance(val, (int, float)):
                    updates.append("%s = %s" % (field, val))

        if 'specializations' in body and isinstance(body['specializations'], list):
            specs = ','.join("'%s'" % s.replace("'", "''") for s in body['specializations'])
            updates.append("specializations = ARRAY[%s]" % specs)

        if 'work_photos' in body and isinstance(body['work_photos'], list):
            photos = body['work_photos'][:5]
            photos_json = json.dumps(photos).replace("'", "''")
            updates.append("work_photos = '%s'::jsonb" % photos_json)

        if updates:
            updates.append("updated_at = NOW()")
            cur = conn.cursor()
            cur.execute("UPDATE users SET %s WHERE id = %d" % (', '.join(updates), user['id']))
            conn.commit()

        recalc_and_apply_bonuses(user['id'], conn)
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    # POST ?action=switch_role (user switches own role between customer/contractor)
    if method == 'POST' and action == 'switch_role':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        conn = get_db()
        user = get_user_by_token(token, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

        if user['role'] == 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Администратор не может сменить роль'})}

        body = json.loads(event.get('body', '{}'))
        new_role = body.get('role')
        if new_role not in ('customer', 'contractor'):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Роль: customer или contractor'})}

        cur = conn.cursor()
        cur.execute("UPDATE users SET role = '%s', updated_at = NOW() WHERE id = %d" % (new_role, int(user['id'])))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'role': new_role})}

    # POST ?action=logout
    if method == 'POST' and action == 'logout':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if token:
            conn = get_db()
            cur = conn.cursor()
            cur.execute("DELETE FROM sessions WHERE token = '%s'" % token.replace("'", "''"))
            conn.commit()
            conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    # GET ?action=admin_users
    if method == 'GET' and action == 'admin_users':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        admin = get_user_by_token(token, conn)
        if not admin or admin['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        cur = conn.cursor()
        where = []
        role_filter = params.get('role', 'all')
        if role_filter and role_filter != 'all':
            where.append("role = '%s'" % role_filter.replace("'", "''"))
        search = params.get('search', '').strip()
        if search:
            s = search.replace("'", "''")
            where.append("(full_name ILIKE '%%%s%%' OR email ILIKE '%%%s%%' OR phone ILIKE '%%%s%%' OR company_name ILIKE '%%%s%%')" % (s, s, s, s))
        blocked = params.get('blocked')
        if blocked == 'true':
            where.append("is_blocked = TRUE")
        elif blocked == 'false':
            where.append("is_blocked = FALSE")

        where_str = " WHERE " + " AND ".join(where) if where else ""
        cur.execute("SELECT COUNT(*) FROM users" + where_str)
        total = cur.fetchone()[0]

        page_num = max(1, int(params.get('page', 1)))
        per_page = min(50, int(params.get('per_page', 20)))
        offset = (page_num - 1) * per_page

        cur.execute(
            "SELECT id, email, phone, role, full_name, company_name, city, region, "
            "entity_type, inn, is_verified, is_blocked, created_at, "
            "rating, reviews_count, deals_count, experience_years, rating_points, badges "
            "FROM users" + where_str + " ORDER BY created_at DESC LIMIT %d OFFSET %d" % (per_page, offset)
        )
        users = []
        for r in cur.fetchall():
            users.append({
                'id': r[0], 'email': r[1], 'phone': r[2], 'role': r[3],
                'full_name': r[4], 'company_name': r[5], 'city': r[6], 'region': r[7],
                'entity_type': r[8], 'inn': r[9], 'is_verified': r[10], 'is_blocked': r[11],
                'created_at': r[12].isoformat() if r[12] else None,
                'rating': float(r[13]) if r[13] else 0, 'reviews_count': r[14],
                'deals_count': r[15], 'experience_years': r[16],
                'rating_points': r[17] or 0, 'badges': r[18] or []
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'users': users, 'total': total, 'page': page_num, 'per_page': per_page
        })}

    # POST ?action=block_user
    if method == 'POST' and action == 'block_user':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        admin = get_user_by_token(token, conn)
        if not admin or admin['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        block = body.get('block', True)
        if not user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите user_id'})}
        if int(user_id) == admin['id']:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нельзя заблокировать себя'})}

        cur = conn.cursor()
        cur.execute("UPDATE users SET is_blocked = %s, updated_at = NOW() WHERE id = %d" % (str(block).upper(), int(user_id)))
        if block:
            cur.execute("DELETE FROM sessions WHERE user_id = %d" % int(user_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    # POST ?action=change_role
    if method == 'POST' and action == 'change_role':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        admin = get_user_by_token(token, conn)
        if not admin or admin['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        new_role = body.get('role')
        if not user_id or not new_role:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите user_id и role'})}
        if new_role not in ('customer', 'contractor', 'admin'):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Роль: customer, contractor или admin'})}

        cur = conn.cursor()
        cur.execute("UPDATE users SET role = '%s', updated_at = NOW() WHERE id = %d" % (new_role, int(user_id)))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    # GET ?action=contractors - public list of contractors
    if method == 'GET' and action == 'contractors':
        conn = get_db()
        cur = conn.cursor()

        where = ["role = 'contractor'", "is_blocked = FALSE"]
        search = params.get('search', '').strip()
        if search:
            s = search.replace("'", "''")
            where.append("(full_name ILIKE '%%%s%%' OR company_name ILIKE '%%%s%%' OR city ILIKE '%%%s%%')" % (s, s, s))
        city = params.get('city', '').strip()
        if city:
            where.append("city ILIKE '%s'" % city.replace("'", "''"))
        badge = params.get('badge', '').strip()
        if badge:
            where.append("badges @> '[\"%s\"]'::jsonb" % badge.replace("'", "''"))

        where_str = " WHERE " + " AND ".join(where)

        cur.execute("SELECT COUNT(*) FROM users" + where_str)
        total = cur.fetchone()[0]

        page_num = max(1, int(params.get('page', 1)))
        per_page = min(50, int(params.get('per_page', 20)))
        offset = (page_num - 1) * per_page

        sort = params.get('sort', 'rating')
        order_by = "rating_points DESC NULLS LAST"
        if sort == 'deals':
            order_by = "deals_count DESC NULLS LAST"
        elif sort == 'new':
            order_by = "created_at DESC"

        cur.execute(
            "SELECT id, full_name, company_name, city, region, entity_type, avatar_url, "
            "about, specializations, experience_years, rating, reviews_count, deals_count, "
            "is_verified, rating_points, badges, work_photos, created_at "
            "FROM users" + where_str + " ORDER BY " + order_by + " LIMIT %d OFFSET %d" % (per_page, offset)
        )
        contractors = []
        for r in cur.fetchall():
            contractors.append({
                'id': r[0], 'full_name': r[1], 'company_name': r[2],
                'city': r[3], 'region': r[4], 'entity_type': r[5],
                'avatar_url': r[6], 'about': r[7],
                'specializations': r[8] or [], 'experience_years': r[9],
                'rating': float(r[10]) if r[10] else 0, 'reviews_count': r[11],
                'deals_count': r[12], 'is_verified': r[13],
                'rating_points': r[14] or 0, 'badges': r[15] or [],
                'work_photos': r[16] or [],
                'created_at': r[17].isoformat() if r[17] else None
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'contractors': contractors, 'total': total, 'page': page_num, 'per_page': per_page
        })}

    # GET ?action=contractor&id=X - public single contractor
    if method == 'GET' and action == 'contractor':
        contractor_id = params.get('id')
        if not contractor_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите id'})}
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, full_name, company_name, city, region, entity_type, avatar_url, "
            "about, specializations, experience_years, rating, reviews_count, deals_count, "
            "is_verified, rating_points, badges, work_photos, created_at, role, is_blocked "
            "FROM users WHERE id = %d" % int(contractor_id)
        )
        r = cur.fetchone()
        conn.close()
        if not r or r[18] != 'contractor' or r[19]:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Исполнитель не найден'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'contractor': {
            'id': r[0], 'full_name': r[1], 'company_name': r[2],
            'city': r[3], 'region': r[4], 'entity_type': r[5],
            'avatar_url': r[6], 'about': r[7],
            'specializations': r[8] or [], 'experience_years': r[9],
            'rating': float(r[10]) if r[10] else 0, 'reviews_count': r[11],
            'deals_count': r[12], 'is_verified': r[13],
            'rating_points': r[14] or 0, 'badges': r[15] or [],
            'work_photos': r[16] or [],
            'created_at': r[17].isoformat() if r[17] else None
        }})}

    # POST ?action=award_badge - admin grants/removes a badge
    if method == 'POST' and action == 'award_badge':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        admin = get_user_by_token(token, conn)
        if not admin or admin['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        badge = body.get('badge', '').strip()
        grant = body.get('grant', True)
        if not user_id or badge not in ('vip', 'gost'):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите user_id и badge (vip|gost)'})}

        cur = conn.cursor()
        cur.execute("SELECT badges FROM users WHERE id = %d" % int(user_id))
        r = cur.fetchone()
        if not r:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Пользователь не найден'})}
        current = r[0] or []
        has_badge = badge in current
        if grant and not has_badge:
            new_badges = current + [badge]
            cur.execute(
                "UPDATE users SET badges = '%s'::jsonb, rating_points = COALESCE(rating_points, 0) + 500, updated_at = NOW() WHERE id = %d"
                % (json.dumps(new_badges).replace("'", "''"), int(user_id))
            )
            badge_name = 'VIP' if badge == 'vip' else 'Русский стандарт'
            cur.execute(
                "INSERT INTO notifications (user_id, type, title, message) "
                "VALUES (%d, 'badge', 'Получен знак отличия!', 'Вам присвоен знак «%s». Начислено +500 баллов рейтинга')"
                % (int(user_id), badge_name)
            )
            conn.commit()
        elif not grant and has_badge:
            new_badges = [b for b in current if b != badge]
            cur.execute(
                "UPDATE users SET badges = '%s'::jsonb, rating_points = GREATEST(0, COALESCE(rating_points, 0) - 500), updated_at = NOW() WHERE id = %d"
                % (json.dumps(new_badges).replace("'", "''"), int(user_id))
            )
            conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    # POST ?action=upload_photo - upload work photo (base64) to S3
    if method == 'POST' and action == 'upload_photo':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        conn = get_db()
        user = get_user_by_token(token, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

        import base64
        import boto3
        body = json.loads(event.get('body', '{}'))
        data_b64 = body.get('data', '')
        ext = body.get('ext', 'jpg').lower().replace('.', '')
        if ext not in ('jpg', 'jpeg', 'png', 'webp'):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Только jpg, png, webp'})}
        if ',' in data_b64:
            data_b64 = data_b64.split(',', 1)[1]
        try:
            raw = base64.b64decode(data_b64)
        except Exception:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неверный формат изображения'})}
        if len(raw) > 5 * 1024 * 1024:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Размер файла не более 5 МБ'})}

        current_photos = user.get('work_photos') or []
        if len(current_photos) >= 5:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Можно загрузить не более 5 фото'})}

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        content_type = 'image/jpeg' if ext in ('jpg', 'jpeg') else ('image/png' if ext == 'png' else 'image/webp')
        key = 'work_photos/u%d_%s.%s' % (user['id'], secrets.token_urlsafe(12), ext)
        s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=content_type)
        cdn_url = 'https://cdn.poehali.dev/projects/%s/bucket/%s' % (os.environ['AWS_ACCESS_KEY_ID'], key)

        new_photos = current_photos + [cdn_url]
        photos_json = json.dumps(new_photos).replace("'", "''")
        cur = conn.cursor()
        cur.execute("UPDATE users SET work_photos = '%s'::jsonb, updated_at = NOW() WHERE id = %d" % (photos_json, user['id']))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'url': cdn_url, 'work_photos': new_photos})}

    # POST ?action=remove_photo - remove a work photo
    if method == 'POST' and action == 'remove_photo':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        user = get_user_by_token(token, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

        body = json.loads(event.get('body', '{}'))
        url = body.get('url', '')
        current_photos = user.get('work_photos') or []
        new_photos = [p for p in current_photos if p != url]
        photos_json = json.dumps(new_photos).replace("'", "''")
        cur = conn.cursor()
        cur.execute("UPDATE users SET work_photos = '%s'::jsonb, updated_at = NOW() WHERE id = %d" % (photos_json, user['id']))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'work_photos': new_photos})}

    # POST ?action=verify_upload - upload verification document
    if method == 'POST' and action == 'verify_upload':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        user = get_user_by_token(token, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

        import base64
        import boto3
        body = json.loads(event.get('body', '{}'))
        data_b64 = body.get('data', '')
        filename = body.get('filename', 'doc')
        doc_type = body.get('doc_type', 'other')
        ext = (filename.split('.')[-1] or 'bin').lower()
        if ',' in data_b64:
            data_b64 = data_b64.split(',', 1)[1]
        try:
            raw = base64.b64decode(data_b64)
        except Exception:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неверный формат'})}
        if len(raw) > 10 * 1024 * 1024:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Файл не более 10 МБ'})}

        content_type = 'application/pdf' if ext == 'pdf' else ('image/png' if ext == 'png' else 'image/jpeg')
        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        key = 'verification/u%d_%s_%s.%s' % (user['id'], doc_type, secrets.token_urlsafe(8), ext)
        s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=content_type)
        cdn_url = 'https://cdn.poehali.dev/projects/%s/bucket/%s' % (os.environ['AWS_ACCESS_KEY_ID'], key)

        cur = conn.cursor()
        cur.execute("SELECT verification_docs FROM users WHERE id = %d" % user['id'])
        r = cur.fetchone()
        current = r[0] if r and r[0] else []
        current.append({'type': doc_type, 'url': cdn_url, 'name': filename})
        docs_json = json.dumps(current).replace("'", "''")
        cur.execute(
            "UPDATE users SET verification_docs = '%s'::jsonb, verification_status = 'pending', updated_at = NOW() WHERE id = %d"
            % (docs_json, user['id'])
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'url': cdn_url, 'docs': current})}

    # POST ?action=verify_review - admin approve/reject verification
    if method == 'POST' and action == 'verify_review':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        admin = get_user_by_token(token, conn)
        if not admin or admin['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        approve = body.get('approve', True)
        comment = body.get('comment', '')

        cur = conn.cursor()
        if approve:
            cur.execute(
                "UPDATE users SET verification_status = 'verified', is_verified = TRUE, "
                "verification_comment = '%s', updated_at = NOW() WHERE id = %d"
                % (comment.replace("'", "''"), int(user_id))
            )
            cur.execute(
                "INSERT INTO notifications (user_id, type, title, message) "
                "VALUES (%d, 'verified', 'Верификация подтверждена', 'Ваш профиль проверен и получил значок «Проверен»')"
                % int(user_id)
            )
        else:
            cur.execute(
                "UPDATE users SET verification_status = 'rejected', is_verified = FALSE, "
                "verification_comment = '%s', updated_at = NOW() WHERE id = %d"
                % (comment.replace("'", "''"), int(user_id))
            )
            cur.execute(
                "INSERT INTO notifications (user_id, type, title, message) "
                "VALUES (%d, 'verify_rejected', 'Верификация отклонена', '%s')"
                % (int(user_id), comment.replace("'", "''") or 'Документы не приняты')
            )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    # GET ?action=verify_pending - admin list pending verifications
    if method == 'GET' and action == 'verify_pending':
        auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
        token = auth.replace('Bearer ', '') if auth else ''
        if not token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_db()
        admin = get_user_by_token(token, conn)
        if not admin or admin['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        cur = conn.cursor()
        cur.execute(
            "SELECT id, full_name, company_name, role, email, phone, verification_docs, verification_status, updated_at "
            "FROM users WHERE verification_status = 'pending' ORDER BY updated_at DESC"
        )
        users = []
        for r in cur.fetchall():
            users.append({
                'id': r[0], 'full_name': r[1], 'company_name': r[2], 'role': r[3],
                'email': r[4], 'phone': r[5], 'docs': r[6] or [],
                'verification_status': r[7],
                'updated_at': r[8].isoformat() if r[8] else None
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': users})}

    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите action'})}