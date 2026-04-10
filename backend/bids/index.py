import json
import os
import psycopg2
from datetime import datetime, timedelta

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Content-Type': 'application/json'
    }

def get_auth_user(event, conn):
    auth = event.get('headers', {}).get('X-Authorization', event.get('headers', {}).get('x-authorization', ''))
    token = auth.replace('Bearer ', '') if auth else ''
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.role, u.full_name, u.is_blocked FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''")
    )
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'role': row[1], 'full_name': row[2], 'is_blocked': row[3]}

def handler(event, context):
    """Ставки подрядчиков. action: place, list, my, select_winner"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', '')
    headers = cors_headers()

    conn = get_db()

    # POST ?action=place
    if method == 'POST' and action == 'place':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        if user['role'] not in ('contractor', 'admin'):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Только подрядчики могут делать ставки'})}

        body = json.loads(event.get('body', '{}'))
        lot_id = body.get('lot_id')
        amount = body.get('amount')
        comment = body.get('comment', '')
        auto_min = body.get('auto_min_amount')

        if not lot_id or not amount:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите lot_id и amount'})}

        amount = float(amount)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, start_price, current_min_bid, bid_step, auction_end_at, status, customer_id, auto_extend_minutes "
            "FROM lots WHERE id = %d" % int(lot_id)
        )
        lot = cur.fetchone()
        if not lot:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}
        if lot[5] != 'active':
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Торги по этому лоту не активны'})}
        if lot[6] == user['id']:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нельзя делать ставку на свой лот'})}
        if lot[4] and lot[4] < datetime.now():
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Торги уже завершены'})}

        current_min = float(lot[2]) if lot[2] else float(lot[1])
        bid_step = float(lot[3]) if lot[3] else 1000
        if amount >= current_min:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                'error': 'Ставка должна быть ниже текущей минимальной (%s)' % current_min
            })}
        if current_min - amount < bid_step:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                'error': 'Шаг снижения должен быть не менее %s ₽' % bid_step
            })}

        auto_min_val = "NULL"
        if auto_min:
            auto_min_val = str(float(auto_min))
        is_auto = 'TRUE' if auto_min else 'FALSE'

        cur.execute(
            "INSERT INTO bids (lot_id, contractor_id, amount, comment, is_auto, auto_min_amount) "
            "VALUES (%d, %d, %s, '%s', %s, %s) RETURNING id"
            % (int(lot_id), user['id'], amount, comment.replace("'", "''"), is_auto, auto_min_val)
        )
        bid_id = cur.fetchone()[0]

        cur.execute(
            "UPDATE lots SET current_min_bid = %s, bids_count = bids_count + 1, updated_at = NOW() "
            "WHERE id = %d" % (amount, int(lot_id))
        )

        auto_ext = lot[7] or 0
        if auto_ext > 0 and lot[4]:
            minutes_left = (lot[4] - datetime.now()).total_seconds() / 60
            if minutes_left <= auto_ext:
                new_end = (lot[4] + timedelta(minutes=auto_ext)).strftime('%Y-%m-%d %H:%M:%S')
                cur.execute("UPDATE lots SET auction_end_at = '%s' WHERE id = %d" % (new_end, int(lot_id)))

        cur.execute(
            "INSERT INTO notifications (user_id, type, title, message, data) "
            "VALUES (%d, 'new_bid', 'Новая ставка', 'Новая ставка %s руб.', '{\"lot_id\": %d, \"bid_id\": %d}'::jsonb)"
            % (lot[6], amount, int(lot_id), bid_id)
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'id': bid_id, 'amount': amount, 'current_min_bid': amount
        })}

    # GET ?action=list&lot_id=X
    if method == 'GET' and action == 'list':
        lot_id = params.get('lot_id')
        if not lot_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите lot_id'})}

        user = get_auth_user(event, conn)
        cur = conn.cursor()
        cur.execute("SELECT status, customer_id FROM lots WHERE id = %d" % int(lot_id))
        lot = cur.fetchone()
        if not lot:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}

        is_owner = user and user['id'] == lot[1]
        is_completed = lot[0] in ('completed', 'in_work', 'done')
        is_admin = user and user['role'] == 'admin'

        if is_completed or is_owner or is_admin:
            cur.execute(
                "SELECT b.id, b.contractor_id, b.amount, b.comment, b.created_at, b.is_withdrawn, "
                "u.full_name, u.company_name, u.rating, u.deals_count, u.is_verified, u.city "
                "FROM bids b JOIN users u ON b.contractor_id = u.id "
                "WHERE b.lot_id = %d AND b.is_withdrawn = FALSE "
                "ORDER BY b.amount ASC" % int(lot_id)
            )
            bids = []
            for r in cur.fetchall():
                bids.append({
                    'id': r[0], 'contractor_id': r[1], 'amount': float(r[2]),
                    'comment': r[3], 'created_at': r[4].isoformat() if r[4] else None,
                    'contractor_name': r[6], 'company_name': r[7],
                    'rating': float(r[8]) if r[8] else 0, 'deals_count': r[9],
                    'is_verified': r[10], 'city': r[11]
                })
        else:
            cur.execute(
                "SELECT b.id, b.amount, b.created_at "
                "FROM bids b WHERE b.lot_id = %d AND b.is_withdrawn = FALSE "
                "ORDER BY b.amount ASC" % int(lot_id)
            )
            bids = [{'id': r[0], 'amount': float(r[1]), 'created_at': r[2].isoformat() if r[2] else None} for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'bids': bids})}

    # GET ?action=my
    if method == 'GET' and action == 'my':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        cur = conn.cursor()
        cur.execute(
            "SELECT b.id, b.lot_id, b.amount, b.comment, b.created_at, b.is_withdrawn, "
            "l.title, l.status, l.current_min_bid, l.auction_end_at, l.winner_id "
            "FROM bids b JOIN lots l ON b.lot_id = l.id "
            "WHERE b.contractor_id = %d ORDER BY b.created_at DESC" % user['id']
        )
        bids = []
        for r in cur.fetchall():
            bids.append({
                'id': r[0], 'lot_id': r[1], 'amount': float(r[2]),
                'comment': r[3], 'created_at': r[4].isoformat() if r[4] else None,
                'is_withdrawn': r[5], 'lot_title': r[6], 'lot_status': r[7],
                'current_min_bid': float(r[8]) if r[8] else None,
                'auction_end_at': r[9].isoformat() if r[9] else None,
                'is_winner': r[10] == user['id'] if r[10] else False
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'bids': bids})}

    # POST ?action=select_winner
    if method == 'POST' and action == 'select_winner':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        body = json.loads(event.get('body', '{}'))
        lot_id = body.get('lot_id')
        contractor_id = body.get('contractor_id')

        cur = conn.cursor()
        cur.execute("SELECT customer_id, status FROM lots WHERE id = %d" % int(lot_id))
        lot = cur.fetchone()
        if not lot:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}
        if lot[0] != user['id'] and user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        if lot[1] != 'completed':
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Лот ещё не завершён'})}

        cur.execute(
            "UPDATE lots SET winner_id = %d, status = 'in_work', updated_at = NOW() WHERE id = %d"
            % (int(contractor_id), int(lot_id))
        )
        cur.execute(
            "INSERT INTO notifications (user_id, type, title, message, data) "
            "VALUES (%d, 'winner', 'Вы выбраны исполнителем!', 'Заказчик выбрал вас', "
            "'{\"lot_id\": %d}'::jsonb)"
            % (int(contractor_id), int(lot_id))
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите action: place, list, my, select_winner'})}
