import json
import os
import psycopg2

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

def recalc_user_rating(user_id, conn):
    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE target_id = %d" % int(user_id)
    )
    r = cur.fetchone()
    avg = float(r[0]) if r[0] else 0
    cnt = r[1] or 0
    cur.execute(
        "UPDATE users SET rating = %s, reviews_count = %d, updated_at = NOW() WHERE id = %d"
        % (round(avg, 2), cnt, int(user_id))
    )

def handler(event, context):
    """Отзывы, жалобы, избранное, подписки, дашборды"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', '')
    headers = cors_headers()
    conn = get_db()

    if method == 'POST' and action == 'review_create':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body', '{}'))
        lot_id = body.get('lot_id')
        target_id = body.get('target_id')
        rating = body.get('rating')
        comment = body.get('comment', '')
        if not lot_id or not target_id or not rating:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите lot_id, target_id, rating'})}
        rating = int(rating)
        if rating < 1 or rating > 5:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Оценка от 1 до 5'})}

        cur = conn.cursor()
        cur.execute("SELECT customer_id, winner_id, status FROM lots WHERE id = %d" % int(lot_id))
        lot = cur.fetchone()
        if not lot:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}
        if lot[2] not in ('in_work', 'done', 'completed'):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Можно оценивать только после выбора победителя'})}
        allowed = (user['id'] == lot[0] and int(target_id) == lot[1]) or (user['id'] == lot[1] and int(target_id) == lot[0])
        if not allowed:
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Вы не участник этой сделки'})}

        cur.execute(
            "SELECT id FROM reviews WHERE lot_id = %d AND author_id = %d AND target_id = %d"
            % (int(lot_id), user['id'], int(target_id))
        )
        if cur.fetchone():
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Вы уже оставили отзыв'})}

        cur.execute(
            "INSERT INTO reviews (lot_id, author_id, target_id, rating, comment) "
            "VALUES (%d, %d, %d, %d, '%s') RETURNING id"
            % (int(lot_id), user['id'], int(target_id), rating, comment.replace("'", "''"))
        )
        review_id = cur.fetchone()[0]
        recalc_user_rating(int(target_id), conn)

        cur.execute(
            "INSERT INTO notifications (user_id, type, title, message, data) "
            "VALUES (%d, 'review', 'Новый отзыв', 'О вас оставили отзыв с оценкой %d', '{\"lot_id\": %d}'::jsonb)"
            % (int(target_id), rating, int(lot_id))
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': review_id, 'ok': True})}

    if method == 'GET' and action == 'reviews':
        target_id = params.get('user_id')
        if not target_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите user_id'})}
        cur = conn.cursor()
        cur.execute(
            "SELECT r.id, r.lot_id, r.author_id, r.rating, r.comment, r.created_at, "
            "u.full_name, u.company_name, u.role, l.title "
            "FROM reviews r JOIN users u ON r.author_id = u.id "
            "LEFT JOIN lots l ON r.lot_id = l.id "
            "WHERE r.target_id = %d ORDER BY r.created_at DESC LIMIT 50" % int(target_id)
        )
        reviews = []
        for r in cur.fetchall():
            reviews.append({
                'id': r[0], 'lot_id': r[1], 'author_id': r[2],
                'rating': r[3], 'comment': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
                'author_name': r[6], 'author_company': r[7],
                'author_role': r[8], 'lot_title': r[9]
            })
        cur.execute("SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE target_id = %d" % int(target_id))
        agg = cur.fetchone()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'reviews': reviews,
            'avg_rating': float(agg[0]) if agg[0] else 0,
            'count': agg[1] or 0
        })}

    if method == 'GET' and action == 'review_check':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        lot_id = params.get('lot_id')
        target_id = params.get('target_id')
        cur = conn.cursor()
        cur.execute(
            "SELECT id, rating, comment FROM reviews WHERE lot_id = %d AND author_id = %d AND target_id = %d"
            % (int(lot_id), user['id'], int(target_id))
        )
        r = cur.fetchone()
        conn.close()
        if r:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
                'exists': True, 'id': r[0], 'rating': r[1], 'comment': r[2]
            })}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'exists': False})}

    if method == 'POST' and action == 'complaint_create':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body', '{}'))
        target_type = body.get('target_type', '')
        target_id = body.get('target_id')
        reason = body.get('reason', '')
        message = body.get('message', '')
        if target_type not in ('lot', 'user') or not target_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'target_type: lot|user, target_id обязателен'})}
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO complaints (author_id, target_type, target_id, reason, message) "
            "VALUES (%d, '%s', %d, '%s', '%s') RETURNING id"
            % (user['id'], target_type, int(target_id),
               reason.replace("'", "''"), message.replace("'", "''"))
        )
        complaint_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': complaint_id, 'ok': True})}

    if method == 'GET' and action == 'complaints_admin':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        cur = conn.cursor()
        status_filter = params.get('status', 'all')
        where = ""
        if status_filter != 'all':
            where = " WHERE c.status = '%s'" % status_filter.replace("'", "''")
        cur.execute(
            "SELECT c.id, c.author_id, c.target_type, c.target_id, c.reason, c.message, "
            "c.status, c.admin_comment, c.created_at, c.resolved_at, u.full_name "
            "FROM complaints c JOIN users u ON c.author_id = u.id"
            + where + " ORDER BY c.created_at DESC LIMIT 100"
        )
        complaints = []
        for r in cur.fetchall():
            complaints.append({
                'id': r[0], 'author_id': r[1], 'target_type': r[2], 'target_id': r[3],
                'reason': r[4], 'message': r[5], 'status': r[6], 'admin_comment': r[7],
                'created_at': r[8].isoformat() if r[8] else None,
                'resolved_at': r[9].isoformat() if r[9] else None,
                'author_name': r[10]
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'complaints': complaints})}

    if method == 'POST' and action == 'complaint_resolve':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        body = json.loads(event.get('body', '{}'))
        cid = body.get('id')
        status = body.get('status', 'resolved')
        comment = body.get('comment', '')
        cur = conn.cursor()
        cur.execute(
            "UPDATE complaints SET status = '%s', admin_comment = '%s', resolved_at = NOW() WHERE id = %d"
            % (status.replace("'", "''"), comment.replace("'", "''"), int(cid))
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'POST' and action == 'fav_lot':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body', '{}'))
        lot_id = body.get('lot_id')
        add = body.get('add', True)
        cur = conn.cursor()
        if add:
            cur.execute(
                "INSERT INTO favorite_lots (user_id, lot_id, archived) VALUES (%d, %d, FALSE) "
                "ON CONFLICT (user_id, lot_id) DO UPDATE SET archived = FALSE"
                % (user['id'], int(lot_id))
            )
        else:
            cur.execute(
                "UPDATE favorite_lots SET archived = TRUE WHERE user_id = %d AND lot_id = %d"
                % (user['id'], int(lot_id))
            )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'GET' and action == 'fav_lots':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        cur = conn.cursor()
        cur.execute(
            "SELECT l.id, l.title, l.city, l.start_price, l.current_min_bid, l.bid_step, "
            "l.auction_end_at, l.status, l.bids_count, l.views_count, l.created_at, c.name "
            "FROM favorite_lots fl "
            "JOIN lots l ON fl.lot_id = l.id "
            "LEFT JOIN categories c ON l.category_id = c.id "
            "WHERE fl.user_id = %d AND fl.archived = FALSE ORDER BY fl.created_at DESC" % user['id']
        )
        lots = []
        for r in cur.fetchall():
            lots.append({
                'id': r[0], 'title': r[1], 'city': r[2],
                'start_price': float(r[3]) if r[3] else 0,
                'current_min_bid': float(r[4]) if r[4] else None,
                'bid_step': float(r[5]) if r[5] else 0,
                'auction_end_at': r[6].isoformat() if r[6] else None,
                'status': r[7], 'bids_count': r[8], 'views_count': r[9],
                'created_at': r[10].isoformat() if r[10] else None,
                'category_name': r[11]
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'lots': lots})}

    if method == 'GET' and action == 'fav_check':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'is_fav': False})}
        lot_id = params.get('lot_id')
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM favorite_lots WHERE user_id = %d AND lot_id = %d AND archived = FALSE"
            % (user['id'], int(lot_id))
        )
        is_fav = cur.fetchone() is not None
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'is_fav': is_fav})}

    if method == 'POST' and action == 'fav_contractor':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body', '{}'))
        cid = body.get('contractor_id')
        add = body.get('add', True)
        cur = conn.cursor()
        if add:
            cur.execute(
                "INSERT INTO favorite_contractors (user_id, contractor_id, archived) VALUES (%d, %d, FALSE) "
                "ON CONFLICT (user_id, contractor_id) DO UPDATE SET archived = FALSE"
                % (user['id'], int(cid))
            )
        else:
            cur.execute(
                "UPDATE favorite_contractors SET archived = TRUE WHERE user_id = %d AND contractor_id = %d"
                % (user['id'], int(cid))
            )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'GET' and action == 'fav_contractors':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        cur = conn.cursor()
        cur.execute(
            "SELECT u.id, u.full_name, u.company_name, u.city, u.rating, u.deals_count, "
            "u.rating_points, u.badges, u.is_verified, u.specializations, u.experience_years "
            "FROM favorite_contractors fc JOIN users u ON fc.contractor_id = u.id "
            "WHERE fc.user_id = %d AND fc.archived = FALSE ORDER BY fc.created_at DESC" % user['id']
        )
        contractors = []
        for r in cur.fetchall():
            contractors.append({
                'id': r[0], 'full_name': r[1], 'company_name': r[2], 'city': r[3],
                'rating': float(r[4]) if r[4] else 0, 'deals_count': r[5],
                'rating_points': r[6] or 0, 'badges': r[7] or [],
                'is_verified': r[8], 'specializations': r[9] or [],
                'experience_years': r[10]
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'contractors': contractors})}

    if method == 'GET' and action == 'fav_contractor_check':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'is_fav': False})}
        cid = params.get('id')
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM favorite_contractors WHERE user_id = %d AND contractor_id = %d AND archived = FALSE"
            % (user['id'], int(cid))
        )
        is_fav = cur.fetchone() is not None
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'is_fav': is_fav})}

    if method == 'POST' and action == 'sub_create':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body', '{}'))
        cat_id = body.get('category_id')
        city = (body.get('city') or '').strip()
        cat_val = "%d" % int(cat_id) if cat_id else "NULL"
        city_val = "'%s'" % city.replace("'", "''") if city else "NULL"
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO subscriptions (user_id, category_id, city, archived) VALUES (%d, %s, %s, FALSE) "
            "ON CONFLICT (user_id, category_id, city) DO UPDATE SET archived = FALSE RETURNING id"
            % (user['id'], cat_val, city_val)
        )
        r = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': r[0] if r else None, 'ok': True})}

    if method == 'GET' and action == 'sub_list':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        cur = conn.cursor()
        cur.execute(
            "SELECT s.id, s.category_id, s.city, c.name, s.created_at "
            "FROM subscriptions s LEFT JOIN categories c ON s.category_id = c.id "
            "WHERE s.user_id = %d AND s.archived = FALSE ORDER BY s.created_at DESC" % user['id']
        )
        subs = []
        for r in cur.fetchall():
            subs.append({
                'id': r[0], 'category_id': r[1], 'city': r[2],
                'category_name': r[3], 'created_at': r[4].isoformat() if r[4] else None
            })
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'subscriptions': subs})}

    if method == 'POST' and action == 'sub_archive':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body', '{}'))
        sid = body.get('id')
        cur = conn.cursor()
        cur.execute(
            "UPDATE subscriptions SET archived = TRUE WHERE id = %d AND user_id = %d"
            % (int(sid), user['id'])
        )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'GET' and action == 'dashboard_contractor':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*), COUNT(DISTINCT lot_id) FROM bids WHERE contractor_id = %d AND is_withdrawn = FALSE"
            % user['id']
        )
        r = cur.fetchone()
        total_bids = r[0] or 0
        unique_lots = r[1] or 0

        cur.execute(
            "SELECT COUNT(*), COALESCE(AVG(current_min_bid), 0), COALESCE(SUM(current_min_bid), 0) "
            "FROM lots WHERE winner_id = %d" % user['id']
        )
        r = cur.fetchone()
        wins = r[0] or 0
        avg_check = float(r[1]) if r[1] else 0
        total_revenue = float(r[2]) if r[2] else 0

        conversion = round((wins / unique_lots * 100), 1) if unique_lots else 0

        cur.execute(
            "SELECT DATE(created_at) as d, COUNT(*) FROM bids "
            "WHERE contractor_id = %d AND created_at > NOW() - INTERVAL '30 days' "
            "GROUP BY d ORDER BY d" % user['id']
        )
        bids_by_day = [{'date': r[0].isoformat(), 'count': r[1]} for r in cur.fetchall()]

        cur.execute(
            "SELECT id, title, current_min_bid, status, auction_end_at "
            "FROM lots WHERE winner_id = %d ORDER BY created_at DESC LIMIT 5" % user['id']
        )
        recent_wins = []
        for r in cur.fetchall():
            recent_wins.append({
                'id': r[0], 'title': r[1],
                'amount': float(r[2]) if r[2] else 0,
                'status': r[3], 'auction_end_at': r[4].isoformat() if r[4] else None
            })

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'total_bids': total_bids, 'unique_lots': unique_lots,
            'wins': wins, 'avg_check': round(avg_check),
            'total_revenue': round(total_revenue), 'conversion': conversion,
            'bids_by_day': bids_by_day, 'recent_wins': recent_wins
        })}

    if method == 'GET' and action == 'dashboard_customer':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM lots WHERE customer_id = %d" % user['id'])
        total_lots = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(*) FROM lots WHERE customer_id = %d AND status = 'active'" % user['id'])
        active_lots = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(*) FROM lots WHERE customer_id = %d AND status IN ('completed','in_work','done')" % user['id'])
        closed_lots = cur.fetchone()[0] or 0

        cur.execute(
            "SELECT COALESCE(SUM(start_price - current_min_bid), 0) "
            "FROM lots WHERE customer_id = %d AND current_min_bid IS NOT NULL AND current_min_bid < start_price"
            % user['id']
        )
        savings = float(cur.fetchone()[0] or 0)

        cur.execute(
            "SELECT COALESCE(AVG(bids_count), 0) FROM lots WHERE customer_id = %d" % user['id']
        )
        avg_participants = float(cur.fetchone()[0] or 0)

        cur.execute(
            "SELECT COALESCE(SUM(start_price), 0), COALESCE(SUM(current_min_bid), 0) "
            "FROM lots WHERE customer_id = %d AND winner_id IS NOT NULL" % user['id']
        )
        r = cur.fetchone()
        total_start = float(r[0]) if r[0] else 0
        total_final = float(r[1]) if r[1] else 0
        savings_pct = round((1 - total_final / total_start) * 100, 1) if total_start > 0 else 0

        cur.execute(
            "SELECT DATE(created_at) as d, COUNT(*) FROM lots "
            "WHERE customer_id = %d AND created_at > NOW() - INTERVAL '30 days' "
            "GROUP BY d ORDER BY d" % user['id']
        )
        lots_by_day = [{'date': r[0].isoformat(), 'count': r[1]} for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'total_lots': total_lots, 'active_lots': active_lots, 'closed_lots': closed_lots,
            'savings': round(savings), 'savings_pct': savings_pct,
            'avg_participants': round(avg_participants, 1),
            'lots_by_day': lots_by_day
        })}

    conn.close()
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неизвестный action'})}
