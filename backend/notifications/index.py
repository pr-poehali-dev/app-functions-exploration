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
        "SELECT u.id, u.role FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''")
    )
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'role': row[1]}

def handler(event, context):
    """Уведомления. action: list, read"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', 'list')
    headers = cors_headers()

    conn = get_db()
    user = get_auth_user(event, conn)

    if not user:
        conn.close()
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}

    if method == 'GET' and action == 'list':
        cur = conn.cursor()
        cur.execute(
            "SELECT id, type, title, message, data, is_read, created_at "
            "FROM notifications WHERE user_id = %d ORDER BY created_at DESC LIMIT 50"
            % user['id']
        )
        notifs = []
        for r in cur.fetchall():
            notifs.append({
                'id': r[0], 'type': r[1], 'title': r[2], 'message': r[3],
                'data': r[4], 'is_read': r[5],
                'created_at': r[6].isoformat() if r[6] else None
            })

        cur.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = %d AND is_read = FALSE"
            % user['id']
        )
        unread = cur.fetchone()[0]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'notifications': notifs, 'unread_count': unread
        })}

    if method == 'POST' and action == 'read':
        body = json.loads(event.get('body', '{}'))
        notif_id = body.get('id')
        cur = conn.cursor()
        if notif_id:
            cur.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = %d AND user_id = %d"
                % (int(notif_id), user['id'])
            )
        else:
            cur.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = %d AND is_read = FALSE"
                % user['id']
            )
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите action: list, read'})}
