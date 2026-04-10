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

def get_user_by_token(token, conn):
    """Получить пользователя по токену сессии"""
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.email, u.phone, u.role, u.full_name, u.company_name, u.city, u.region, "
        "u.entity_type, u.inn, u.avatar_url, u.about, u.specializations, u.experience_years, "
        "u.rating, u.reviews_count, u.deals_count, u.is_verified, u.is_blocked, u.created_at "
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
        'created_at': row[19].isoformat() if row[19] else None
    }

def handler(event, context):
    """Регистрация, авторизация и профиль пользователей аукциона подрядов"""
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
        conn.close()

        if not user:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия истекла'})}

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

        if updates:
            updates.append("updated_at = NOW()")
            cur = conn.cursor()
            cur.execute("UPDATE users SET %s WHERE id = %d" % (', '.join(updates), user['id']))
            conn.commit()

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

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

    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите параметр action: register, login, me, profile, logout'})}
