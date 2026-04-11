import json
import os
import psycopg2
from datetime import datetime

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
        "SELECT u.id, u.role, u.is_blocked FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''")
    )
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'role': row[1], 'is_blocked': row[2]}

def lot_row_to_dict(row):
    return {
        'id': row[0], 'customer_id': row[1], 'title': row[2], 'category_id': row[3],
        'description': row[4], 'object_type': row[5],
        'object_area': float(row[6]) if row[6] else None,
        'address': row[7], 'city': row[8], 'region': row[9],
        'start_price': float(row[10]) if row[10] else 0,
        'current_min_bid': float(row[11]) if row[11] else None,
        'bid_step': float(row[12]) if row[12] else 1000,
        'work_start_date': row[13].isoformat() if row[13] else None,
        'work_end_date': row[14].isoformat() if row[14] else None,
        'work_duration_days': row[15],
        'auction_end_at': row[16].isoformat() if row[16] else None,
        'payment_terms': row[17], 'materials_by': row[18],
        'warranty_months': row[19], 'additional_conditions': row[20],
        'attachments': row[21] or [], 'work_items': row[22] or [],
        'status': row[23], 'views_count': row[24], 'bids_count': row[25],
        'winner_id': row[26],
        'created_at': row[27].isoformat() if row[27] else None,
        'customer_name': row[28] if len(row) > 28 else None,
        'category_name': row[29] if len(row) > 29 else None,
        'decision_deadline': row[30].isoformat() if len(row) > 30 and row[30] else None,
        'object_photos': row[31] if len(row) > 31 and row[31] else [],
    }

LOT_SELECT = (
    "SELECT l.id, l.customer_id, l.title, l.category_id, l.description, l.object_type, "
    "l.object_area, l.address, l.city, l.region, l.start_price, l.current_min_bid, "
    "l.bid_step, l.work_start_date, l.work_end_date, l.work_duration_days, "
    "l.auction_end_at, l.payment_terms, l.materials_by, l.warranty_months, "
    "l.additional_conditions, l.attachments, l.work_items, l.status, "
    "l.views_count, l.bids_count, l.winner_id, l.created_at, "
    "u.full_name as customer_name, c.name as category_name, l.decision_deadline, "
    "l.object_photos "
    "FROM lots l "
    "LEFT JOIN users u ON l.customer_id = u.id "
    "LEFT JOIN categories c ON l.category_id = c.id "
)

def handler(event, context):
    """CRUD лотов аукциона. action: list, categories, get, create, update, my, approve, delete, admin_list"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', 'list')
    headers = cors_headers()

    conn = get_db()

    cur_auto = conn.cursor()
    cur_auto.execute(
        "UPDATE lots SET status = 'completed', updated_at = NOW() "
        "WHERE status = 'active' AND auction_end_at < NOW()"
    )
    if cur_auto.rowcount > 0:
        cur_auto.execute(
            "INSERT INTO notifications (user_id, type, title, message, data) "
            "SELECT customer_id, 'lot_completed', 'Торги завершены', "
            "'Торги по вашему лоту завершены. Выберите подрядчика.', "
            "json_build_object('lot_id', id)::jsonb "
            "FROM lots WHERE status = 'completed' AND winner_id IS NULL "
            "AND id NOT IN (SELECT COALESCE((data->>'lot_id')::int, 0) FROM notifications WHERE type = 'lot_completed')"
        )
        conn.commit()

    if method == 'GET' and action == 'list':
        cur = conn.cursor()
        where = []
        status = params.get('status', 'active')
        if status and status != 'all':
            where.append("l.status = '%s'" % status.replace("'", "''"))
        category_id = params.get('category_id')
        if category_id:
            where.append("l.category_id = %d" % int(category_id))
        city = params.get('city')
        if city:
            where.append("l.city ILIKE '%%%s%%'" % city.replace("'", "''"))
        search = params.get('search')
        if search:
            s = search.replace("'", "''")
            where.append("(l.title ILIKE '%%%s%%' OR l.description ILIKE '%%%s%%')" % (s, s))
        min_price = params.get('min_price')
        if min_price:
            where.append("l.start_price >= %s" % float(min_price))
        max_price = params.get('max_price')
        if max_price:
            where.append("l.start_price <= %s" % float(max_price))

        where_str = " WHERE " + " AND ".join(where) if where else ""
        sort = params.get('sort', 'new')
        order = "l.created_at DESC"
        if sort == 'price_asc':
            order = "l.start_price ASC"
        elif sort == 'price_desc':
            order = "l.start_price DESC"
        elif sort == 'bids':
            order = "l.bids_count DESC"
        elif sort == 'ending':
            order = "l.auction_end_at ASC"

        page = max(1, int(params.get('page', 1)))
        per_page = min(50, int(params.get('per_page', 20)))
        offset = (page - 1) * per_page

        cur.execute("SELECT COUNT(*) FROM lots l" + where_str)
        total = cur.fetchone()[0]
        cur.execute(LOT_SELECT + where_str + " ORDER BY " + order + " LIMIT %d OFFSET %d" % (per_page, offset))
        lots = [lot_row_to_dict(r) for r in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'lots': lots, 'total': total, 'page': page, 'per_page': per_page
        })}

    if method == 'GET' and action == 'categories':
        cur = conn.cursor()
        cur.execute("SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order")
        cats = [{'id': r[0], 'name': r[1], 'slug': r[2]} for r in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'categories': cats})}

    if method == 'GET' and action == 'get':
        lot_id = params.get('id')
        if not lot_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите id'})}
        cur = conn.cursor()
        cur.execute(LOT_SELECT + " WHERE l.id = %d" % int(lot_id))
        row = cur.fetchone()
        if not row:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}
        lot = lot_row_to_dict(row)
        cur.execute("UPDATE lots SET views_count = views_count + 1 WHERE id = %d" % int(lot_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'lot': lot})}

    if method == 'POST' and action == 'create':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        if user['role'] not in ('customer', 'admin'):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Только заказчики могут создавать лоты'})}

        body = json.loads(event.get('body', '{}'))
        title = body.get('title', '').strip()
        if not title:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите название'})}
        start_price = body.get('start_price', 0)
        if not start_price or float(start_price) <= 0:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите начальную стоимость'})}
        auction_end = body.get('auction_end_at', '')
        if not auction_end:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите дату окончания торгов'})}

        status = body.get('status', 'draft')
        if status == 'active':
            status = 'moderation'

        def sq(val):
            if val is None:
                return 'NULL'
            return "'%s'" % str(val).replace("'", "''")

        category_id = body.get('category_id')
        cat_val = str(int(category_id)) if category_id else 'NULL'
        work_items_json = json.dumps(body.get('work_items', []))
        attachments_json = json.dumps(body.get('attachments', []))
        object_photos_json = json.dumps((body.get('object_photos') or [])[:5])
        bid_step = body.get('bid_step', 1000)
        work_duration = body.get('work_duration_days')
        work_dur_val = str(int(work_duration)) if work_duration else 'NULL'
        auto_ext = body.get('auto_extend_minutes', 0)
        warranty = body.get('warranty_months')
        warranty_val = str(int(warranty)) if warranty else 'NULL'
        area = body.get('object_area')
        area_val = str(float(area)) if area else 'NULL'

        cur = conn.cursor()
        cur.execute(
            "INSERT INTO lots (customer_id, title, category_id, description, object_type, "
            "object_area, address, city, region, start_price, bid_step, "
            "work_start_date, work_end_date, work_duration_days, auction_end_at, "
            "auto_extend_minutes, payment_terms, materials_by, warranty_months, "
            "additional_conditions, attachments, work_items, status, object_photos) "
            "VALUES (%d, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, "
            "%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, '%s', %s::jsonb) RETURNING id"
            % (
                user['id'], sq(title), cat_val, sq(body.get('description')),
                sq(body.get('object_type')), area_val,
                sq(body.get('address')), sq(body.get('city')), sq(body.get('region')),
                float(start_price), float(bid_step),
                sq(body.get('work_start_date')), sq(body.get('work_end_date')),
                work_dur_val, sq(auction_end),
                int(auto_ext), sq(body.get('payment_terms')), sq(body.get('materials_by')),
                warranty_val, sq(body.get('additional_conditions')),
                sq(attachments_json), sq(work_items_json), status, sq(object_photos_json)
            )
        )
        lot_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': lot_id, 'status': status})}

    if method == 'PUT' and action == 'update':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

        body = json.loads(event.get('body', '{}'))
        lot_id = body.get('id')
        if not lot_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите id лота'})}

        cur = conn.cursor()
        cur.execute("SELECT customer_id, status FROM lots WHERE id = %d" % int(lot_id))
        row = cur.fetchone()
        if not row:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}
        if row[0] != user['id'] and user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        if row[1] not in ('draft', 'moderation') and user['role'] != 'admin':
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Лот нельзя редактировать после начала торгов'})}

        updates = []
        for f in ['title', 'description', 'object_type', 'address', 'city', 'region', 'payment_terms', 'materials_by', 'additional_conditions']:
            if f in body:
                updates.append("%s = '%s'" % (f, str(body[f]).replace("'", "''")))
        for f in ['start_price', 'bid_step', 'work_duration_days', 'auto_extend_minutes', 'warranty_months', 'object_area', 'category_id']:
            if f in body:
                if body[f] is None:
                    updates.append("%s = NULL" % f)
                else:
                    updates.append("%s = %s" % (f, body[f]))
        if 'auction_end_at' in body:
            updates.append("auction_end_at = '%s'" % str(body['auction_end_at']).replace("'", "''"))
        if 'status' in body:
            new_status = body['status']
            if new_status == 'active' and user['role'] != 'admin':
                new_status = 'moderation'
            updates.append("status = '%s'" % new_status)
        if 'work_items' in body:
            updates.append("work_items = '%s'::jsonb" % json.dumps(body['work_items']).replace("'", "''"))
        if 'attachments' in body and isinstance(body['attachments'], list):
            updates.append("attachments = '%s'::jsonb" % json.dumps(body['attachments']).replace("'", "''"))
        if 'object_photos' in body and isinstance(body['object_photos'], list):
            photos = body['object_photos'][:5]
            updates.append("object_photos = '%s'::jsonb" % json.dumps(photos).replace("'", "''"))
        if updates:
            updates.append("updated_at = NOW()")
            cur.execute("UPDATE lots SET %s WHERE id = %d" % (', '.join(updates), int(lot_id)))
            conn.commit()

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'GET' and action == 'my':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        cur = conn.cursor()
        status_filter = params.get('status', 'all')
        where = "l.customer_id = %d" % user['id']
        if status_filter != 'all':
            where += " AND l.status = '%s'" % status_filter.replace("'", "''")
        cur.execute(LOT_SELECT + " WHERE " + where + " ORDER BY l.created_at DESC")
        lots = [lot_row_to_dict(r) for r in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'lots': lots})}

    if method == 'POST' and action == 'approve':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        body = json.loads(event.get('body', '{}'))
        lot_id = body.get('id')
        lot_action = body.get('action', 'approve')
        cur = conn.cursor()
        if lot_action == 'approve':
            cur.execute("UPDATE lots SET status = 'active', updated_at = NOW() WHERE id = %d AND status = 'moderation'" % int(lot_id))
        elif lot_action == 'reject':
            reason = body.get('reason', '')
            cur.execute("UPDATE lots SET status = 'cancelled', cancel_reason = '%s', updated_at = NOW() WHERE id = %d" % (reason.replace("'", "''"), int(lot_id)))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'DELETE' and action == 'delete':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        lot_id = params.get('id')
        if not lot_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите id'})}
        cur = conn.cursor()
        cur.execute("DELETE FROM bids WHERE lot_id = %d" % int(lot_id))
        cur.execute("DELETE FROM notifications WHERE data->>'lot_id' = '%d'" % int(lot_id))
        cur.execute("DELETE FROM lots WHERE id = %d" % int(lot_id))
        if cur.rowcount == 0:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Лот не найден'})}
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'GET' and action == 'admin_list':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}
        cur = conn.cursor()
        status_filter = params.get('status', 'all')
        where = []
        if status_filter and status_filter != 'all':
            where.append("l.status = '%s'" % status_filter.replace("'", "''"))
        search = params.get('search')
        if search:
            s = search.replace("'", "''")
            where.append("(l.title ILIKE '%%%s%%' OR l.description ILIKE '%%%s%%')" % (s, s))
        where_str = " WHERE " + " AND ".join(where) if where else ""
        cur.execute("SELECT COUNT(*) FROM lots l" + where_str)
        total = cur.fetchone()[0]
        page_num = max(1, int(params.get('page', 1)))
        per_page = min(50, int(params.get('per_page', 20)))
        offset = (page_num - 1) * per_page
        cur.execute(LOT_SELECT + where_str + " ORDER BY l.created_at DESC LIMIT %d OFFSET %d" % (per_page, offset))
        lots = [lot_row_to_dict(r) for r in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'lots': lots, 'total': total, 'page': page_num, 'per_page': per_page
        })}

    # POST ?action=admin_category
    if method == 'POST' and action == 'admin_category':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        body = json.loads(event.get('body', '{}'))
        cat_action = body.get('cat_action', 'create')
        cur = conn.cursor()

        if cat_action == 'create':
            name = body.get('name', '').strip()
            if not name:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите name'})}
            slug = name.lower().replace(' ', '-').replace(',', '').replace('.', '')
            sort_order = body.get('sort_order', 0)
            cur.execute(
                "INSERT INTO categories (name, slug, sort_order) VALUES ('%s', '%s', %d) RETURNING id"
                % (name.replace("'", "''"), slug.replace("'", "''"), int(sort_order))
            )
            cat_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'id': cat_id, 'ok': True})}

        elif cat_action == 'update':
            cat_id = body.get('id')
            if not cat_id:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите id'})}
            updates = []
            if 'name' in body:
                updates.append("name = '%s'" % body['name'].replace("'", "''"))
                updates.append("slug = '%s'" % body['name'].lower().replace(' ', '-').replace(',', '').replace('.', '').replace("'", "''"))
            if 'sort_order' in body:
                updates.append("sort_order = %d" % int(body['sort_order']))
            if updates:
                cur.execute("UPDATE categories SET %s WHERE id = %d" % (', '.join(updates), int(cat_id)))
                conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        elif cat_action == 'delete':
            cat_id = body.get('id')
            if not cat_id:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите id'})}
            cur.execute("UPDATE lots SET category_id = NULL WHERE category_id = %d" % int(cat_id))
            cur.execute("DELETE FROM categories WHERE id = %d" % int(cat_id))
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'cat_action: create, update, delete'})}

    # GET ?action=admin_stats
    if method == 'GET' and action == 'admin_stats':
        user = get_auth_user(event, conn)
        if not user or user['role'] != 'admin':
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет прав'})}

        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'customer'")
        total_customers = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'contractor'")
        total_contractors = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'")
        new_users_week = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM lots")
        total_lots = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM lots WHERE status = 'active'")
        active_lots = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM lots WHERE status = 'moderation'")
        moderation_lots = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM lots WHERE status = 'completed'")
        completed_lots = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM lots WHERE created_at > NOW() - INTERVAL '7 days'")
        new_lots_week = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM bids")
        total_bids = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM bids WHERE created_at > NOW() - INTERVAL '7 days'")
        new_bids_week = cur.fetchone()[0]

        cur.execute("SELECT COALESCE(AVG(start_price), 0) FROM lots WHERE status IN ('active', 'completed')")
        avg_price = float(cur.fetchone()[0])
        cur.execute("SELECT COALESCE(AVG(bids_count), 0) FROM lots WHERE bids_count > 0")
        avg_bids = float(cur.fetchone()[0])
        cur.execute("SELECT COALESCE(SUM(views_count), 0) FROM lots")
        total_views = cur.fetchone()[0]

        cur.execute(
            "SELECT DATE(created_at) as d, COUNT(*) FROM lots "
            "WHERE created_at > NOW() - INTERVAL '30 days' "
            "GROUP BY d ORDER BY d"
        )
        lots_by_day = [{'date': r[0].isoformat(), 'count': r[1]} for r in cur.fetchall()]

        cur.execute(
            "SELECT DATE(created_at) as d, COUNT(*) FROM users "
            "WHERE created_at > NOW() - INTERVAL '30 days' "
            "GROUP BY d ORDER BY d"
        )
        users_by_day = [{'date': r[0].isoformat(), 'count': r[1]} for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'users': {
                'total': total_users, 'customers': total_customers,
                'contractors': total_contractors, 'new_week': new_users_week,
                'by_day': users_by_day
            },
            'lots': {
                'total': total_lots, 'active': active_lots,
                'moderation': moderation_lots, 'completed': completed_lots,
                'new_week': new_lots_week, 'avg_price': round(avg_price),
                'avg_bids': round(avg_bids, 1), 'total_views': total_views,
                'by_day': lots_by_day
            },
            'bids': {
                'total': total_bids, 'new_week': new_bids_week
            }
        })}

    if method == 'POST' and action == 'upload_file':
        user = get_auth_user(event, conn)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        import base64
        import secrets as _secrets
        import boto3
        body = json.loads(event.get('body', '{}'))
        data_b64 = body.get('data', '')
        filename = body.get('filename', 'file')
        kind = body.get('kind', 'attachment')
        ext = (filename.split('.')[-1] or 'bin').lower()
        if ',' in data_b64:
            data_b64 = data_b64.split(',', 1)[1]
        try:
            raw = base64.b64decode(data_b64)
        except Exception:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неверный формат файла'})}
        if len(raw) > 10 * 1024 * 1024:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Размер файла не более 10 МБ'})}

        content_types = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
            'webp': 'image/webp', 'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'dwg': 'application/acad', 'zip': 'application/zip',
        }
        content_type = content_types.get(ext, 'application/octet-stream')

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        prefix = 'lot_photos' if kind == 'photo' else 'lot_files'
        safe_name = ''.join(c for c in filename if c.isalnum() or c in ('.', '_', '-'))[:60]
        key = '%s/u%d_%s_%s' % (prefix, user['id'], _secrets.token_urlsafe(10), safe_name)
        s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=content_type)
        cdn_url = 'https://cdn.poehali.dev/projects/%s/bucket/%s' % (os.environ['AWS_ACCESS_KEY_ID'], key)
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'url': cdn_url, 'name': filename, 'size': len(raw), 'kind': kind
        })}

    conn.close()
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите action'})}