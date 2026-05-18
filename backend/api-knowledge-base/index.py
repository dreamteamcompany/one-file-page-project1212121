"""
База знаний: категории, статьи, теги, файлы, комментарии, лайки, избранное, поиск, привязка к заявкам.
endpoint=categories|articles|article|search|tags|comments|files|like|favorite|view|ticket-link|popular|favorites
"""
import json
import os
import re
import base64
import uuid
from typing import Dict, Any, List, Optional

import boto3

from shared_utils import (
    response, get_db_connection, verify_token, handle_options,
    safe_int, get_query_param, get_endpoint, can_write
)

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
S3_BUCKET = 'files'
S3_ENDPOINT = 'https://bucket.poehali.dev'
CDN_BASE = f'https://cdn.poehali.dev/projects/{AWS_ACCESS_KEY_ID}/bucket' if AWS_ACCESS_KEY_ID else ''


def slugify(text: str) -> str:
    text = (text or '').strip().lower()
    text = re.sub(r'[^\w\s-]', '', text, flags=re.UNICODE)
    text = re.sub(r'[\s-]+', '-', text)
    return text[:200] or uuid.uuid4().hex[:8]


def strip_html(html: str) -> str:
    if not html:
        return ''
    return re.sub(r'<[^>]+>', ' ', html)


def parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return json.loads(event.get('body') or '{}')
    except Exception:
        return {}


def get_s3_client():
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        return None
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )


# ======================= categories =======================

def handle_categories(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    if method == 'GET':
        with conn.cursor() as cur:
            cur.execute(
                """SELECT c.id, c.name, c.slug, c.icon, c.color, c.parent_id, c.sort_order,
                          (SELECT COUNT(*) FROM kb_articles a WHERE a.category_id=c.id AND a.is_published=TRUE) AS articles_count
                   FROM kb_categories c ORDER BY c.sort_order, c.name"""
            )
            rows = [dict(r) for r in cur.fetchall()]
        return response(200, rows)

    if not can_write(payload):
        return response(403, {'error': 'Недостаточно прав'})

    body = parse_body(event)
    if method == 'POST':
        name = (body.get('name') or '').strip()
        if not name:
            return response(400, {'error': 'Имя обязательно'})
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO kb_categories (name, slug, icon, color, parent_id, sort_order)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (name[:200], slugify(name), body.get('icon'), body.get('color'),
                 safe_int(body.get('parent_id')), safe_int(body.get('sort_order'), 0))
            )
            new_id = cur.fetchone()['id']
        conn.commit()
        return response(200, {'id': new_id})

    if method == 'PUT':
        cid = safe_int(body.get('id'))
        if not cid:
            return response(400, {'error': 'id обязателен'})
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE kb_categories SET name=%s, icon=%s, color=%s, parent_id=%s, sort_order=%s, updated_at=CURRENT_TIMESTAMP
                   WHERE id=%s""",
                (body.get('name') or '', body.get('icon'), body.get('color'),
                 safe_int(body.get('parent_id')), safe_int(body.get('sort_order'), 0), cid)
            )
        conn.commit()
        return response(200, {'success': True})

    if method == 'DELETE':
        cid = safe_int(get_query_param(event, 'id'))
        if not cid:
            return response(400, {'error': 'id обязателен'})
        with conn.cursor() as cur:
            # переводим статьи в "без категории"
            cur.execute("UPDATE kb_articles SET category_id=NULL WHERE category_id=%s", (cid,))
            cur.execute("UPDATE kb_categories SET parent_id=NULL WHERE parent_id=%s", (cid,))
            cur.execute("DELETE FROM kb_categories WHERE id=%s", (cid,))
        conn.commit()
        return response(200, {'success': True})

    return response(405, {'error': 'method not allowed'})


# ======================= tags =======================

def handle_tags(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    if method == 'GET':
        with conn.cursor() as cur:
            cur.execute(
                """SELECT t.id, t.name, t.color,
                          (SELECT COUNT(*) FROM kb_article_tags at WHERE at.tag_id=t.id) AS articles_count
                   FROM kb_tags t ORDER BY articles_count DESC, t.name"""
            )
            rows = [dict(r) for r in cur.fetchall()]
        return response(200, rows)

    if not can_write(payload):
        return response(403, {'error': 'Недостаточно прав'})

    body = parse_body(event)
    if method == 'POST':
        name = (body.get('name') or '').strip()
        if not name:
            return response(400, {'error': 'Имя обязательно'})
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO kb_tags (name, color) VALUES (%s, %s) ON CONFLICT (name) DO UPDATE SET color=EXCLUDED.color RETURNING id",
                (name[:100], body.get('color'))
            )
            tid = cur.fetchone()['id']
        conn.commit()
        return response(200, {'id': tid})

    if method == 'DELETE':
        tid = safe_int(get_query_param(event, 'id'))
        with conn.cursor() as cur:
            cur.execute("DELETE FROM kb_article_tags WHERE tag_id=%s", (tid,))
            cur.execute("DELETE FROM kb_tags WHERE id=%s", (tid,))
        conn.commit()
        return response(200, {'success': True})

    return response(405, {'error': 'method not allowed'})


# ======================= articles =======================

def _article_to_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    return dict(row)


def _load_tags_for_articles(conn, ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
    if not ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """SELECT at.article_id, t.id, t.name, t.color
               FROM kb_article_tags at JOIN kb_tags t ON t.id=at.tag_id
               WHERE at.article_id = ANY(%s)""",
            (ids,)
        )
        out: Dict[int, List[Dict[str, Any]]] = {}
        for r in cur.fetchall():
            out.setdefault(r['article_id'], []).append(
                {'id': r['id'], 'name': r['name'], 'color': r['color']}
            )
    return out


def handle_articles(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        category_id = safe_int(params.get('category_id'))
        tag_id = safe_int(params.get('tag_id'))
        only_favorites = params.get('favorites') == '1'
        limit = max(1, min(safe_int(params.get('limit'), 50) or 50, 200))
        offset = max(0, safe_int(params.get('offset'), 0) or 0)

        where = ['a.is_published = TRUE']
        args: List[Any] = []
        if category_id:
            where.append('a.category_id = %s')
            args.append(category_id)
        if tag_id:
            where.append('EXISTS (SELECT 1 FROM kb_article_tags x WHERE x.article_id=a.id AND x.tag_id=%s)')
            args.append(tag_id)
        if only_favorites:
            where.append('EXISTS (SELECT 1 FROM kb_article_favorites f WHERE f.article_id=a.id AND f.user_id=%s)')
            args.append(user_id)
        where_sql = ' AND '.join(where)

        with conn.cursor() as cur:
            cur.execute(
                f"""SELECT a.id, a.title, a.slug, a.summary, a.category_id, a.author_id,
                          a.views_count, a.likes_count, a.created_at, a.updated_at,
                          u.full_name AS author_name,
                          c.name AS category_name, c.color AS category_color,
                          EXISTS (SELECT 1 FROM kb_article_likes l WHERE l.article_id=a.id AND l.user_id=%s) AS is_liked,
                          EXISTS (SELECT 1 FROM kb_article_favorites f WHERE f.article_id=a.id AND f.user_id=%s) AS is_favorite
                   FROM kb_articles a
                   LEFT JOIN users u ON u.id=a.author_id
                   LEFT JOIN kb_categories c ON c.id=a.category_id
                   WHERE {where_sql}
                   ORDER BY a.updated_at DESC
                   LIMIT %s OFFSET %s""",
                tuple([user_id, user_id] + args + [limit, offset])
            )
            rows = [_article_to_dict(r) for r in cur.fetchall()]
        ids = [r['id'] for r in rows]
        tags_map = _load_tags_for_articles(conn, ids)
        for r in rows:
            r['tags'] = tags_map.get(r['id'], [])
        return response(200, rows)

    if not can_write(payload):
        return response(403, {'error': 'Недостаточно прав'})

    body = parse_body(event)
    if method == 'POST':
        title = (body.get('title') or '').strip()
        if not title:
            return response(400, {'error': 'Заголовок обязателен'})
        content_html = body.get('content_html') or ''
        plain_text = strip_html(content_html)[:50000]
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO kb_articles
                   (title, slug, summary, content, content_html, plain_text, category_id, author_id, is_published, sort_order)
                   VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (title[:500], slugify(title), body.get('summary'),
                 json.dumps(body.get('content') or {}), content_html, plain_text,
                 safe_int(body.get('category_id')), user_id,
                 bool(body.get('is_published', True)), safe_int(body.get('sort_order'), 0))
            )
            aid = cur.fetchone()['id']
            tags = body.get('tag_ids') or []
            for tid in tags:
                t = safe_int(tid)
                if t:
                    cur.execute(
                        "INSERT INTO kb_article_tags (article_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (aid, t)
                    )
        conn.commit()
        return response(200, {'id': aid})

    if method == 'PUT':
        aid = safe_int(body.get('id'))
        if not aid:
            return response(400, {'error': 'id обязателен'})
        content_html = body.get('content_html') or ''
        plain_text = strip_html(content_html)[:50000]
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE kb_articles SET
                       title=%s, summary=%s, content=%s::jsonb, content_html=%s, plain_text=%s,
                       category_id=%s, is_published=%s, updated_at=CURRENT_TIMESTAMP
                   WHERE id=%s""",
                ((body.get('title') or '')[:500], body.get('summary'),
                 json.dumps(body.get('content') or {}), content_html, plain_text,
                 safe_int(body.get('category_id')), bool(body.get('is_published', True)), aid)
            )
            if 'tag_ids' in body:
                cur.execute("DELETE FROM kb_article_tags WHERE article_id=%s", (aid,))
                for tid in (body.get('tag_ids') or []):
                    t = safe_int(tid)
                    if t:
                        cur.execute(
                            "INSERT INTO kb_article_tags (article_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (aid, t)
                        )
        conn.commit()
        return response(200, {'success': True})

    if method == 'DELETE':
        aid = safe_int(get_query_param(event, 'id'))
        if not aid:
            return response(400, {'error': 'id обязателен'})
        with conn.cursor() as cur:
            for tbl in ('kb_article_tags', 'kb_article_files', 'kb_article_comments',
                        'kb_article_likes', 'kb_article_favorites', 'kb_article_views',
                        'kb_article_tickets'):
                cur.execute(f"DELETE FROM {tbl} WHERE article_id=%s", (aid,))
            cur.execute("DELETE FROM kb_articles WHERE id=%s", (aid,))
        conn.commit()
        return response(200, {'success': True})

    return response(405, {'error': 'method not allowed'})


# ======================= single article =======================

def handle_article_single(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    if method != 'GET':
        return response(405, {'error': 'method not allowed'})
    aid = safe_int(get_query_param(event, 'id'))
    if not aid:
        return response(400, {'error': 'id обязателен'})

    with conn.cursor() as cur:
        cur.execute(
            """SELECT a.id, a.title, a.slug, a.summary, a.content, a.content_html, a.category_id,
                      a.author_id, a.is_published, a.views_count, a.likes_count, a.created_at, a.updated_at,
                      u.full_name AS author_name, u.photo_url AS author_photo,
                      c.name AS category_name, c.color AS category_color,
                      EXISTS (SELECT 1 FROM kb_article_likes l WHERE l.article_id=a.id AND l.user_id=%s) AS is_liked,
                      EXISTS (SELECT 1 FROM kb_article_favorites f WHERE f.article_id=a.id AND f.user_id=%s) AS is_favorite
               FROM kb_articles a
               LEFT JOIN users u ON u.id=a.author_id
               LEFT JOIN kb_categories c ON c.id=a.category_id
               WHERE a.id=%s""",
            (user_id, user_id, aid)
        )
        row = cur.fetchone()
        if not row:
            return response(404, {'error': 'not found'})
        article = dict(row)

        cur.execute(
            """SELECT t.id, t.name, t.color FROM kb_article_tags at
               JOIN kb_tags t ON t.id=at.tag_id WHERE at.article_id=%s""",
            (aid,)
        )
        article['tags'] = [dict(r) for r in cur.fetchall()]

        cur.execute(
            """SELECT id, filename, url, size, mime_type, created_at, uploaded_by
               FROM kb_article_files WHERE article_id=%s ORDER BY created_at""",
            (aid,)
        )
        article['files'] = [dict(r) for r in cur.fetchall()]

        cur.execute(
            """SELECT t.id, t.title, t.status_id, s.name AS status_name, s.color AS status_color
               FROM kb_article_tickets kat
               JOIN tickets t ON t.id=kat.ticket_id
               LEFT JOIN ticket_statuses s ON s.id=t.status_id
               WHERE kat.article_id=%s ORDER BY kat.created_at DESC""",
            (aid,)
        )
        article['linked_tickets'] = [dict(r) for r in cur.fetchall()]

    return response(200, article)


# ======================= search =======================

def handle_search(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    if method != 'GET':
        return response(405, {'error': 'method not allowed'})
    q = (get_query_param(event, 'q') or '').strip()
    if not q:
        return response(200, [])
    like = f'%{q.lower()}%'
    with conn.cursor() as cur:
        cur.execute(
            """SELECT a.id, a.title, a.summary, a.category_id, c.name AS category_name,
                      a.views_count, a.likes_count, a.updated_at,
                      CASE WHEN LOWER(a.title) LIKE %s THEN 2 ELSE 1 END AS rank
               FROM kb_articles a
               LEFT JOIN kb_categories c ON c.id=a.category_id
               WHERE a.is_published=TRUE AND (
                     LOWER(a.title) LIKE %s OR LOWER(COALESCE(a.plain_text,'')) LIKE %s OR LOWER(COALESCE(a.summary,'')) LIKE %s
               )
               ORDER BY rank DESC, a.updated_at DESC
               LIMIT 30""",
            (like, like, like, like)
        )
        rows = [dict(r) for r in cur.fetchall()]
    return response(200, rows)


# ======================= comments =======================

def handle_comments(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    aid = safe_int(get_query_param(event, 'article_id'))
    if method == 'GET':
        if not aid:
            return response(400, {'error': 'article_id обязателен'})
        with conn.cursor() as cur:
            cur.execute(
                """SELECT c.id, c.article_id, c.user_id, c.parent_id, c.content, c.created_at, c.updated_at,
                          u.full_name AS user_name, u.photo_url AS user_photo
                   FROM kb_article_comments c JOIN users u ON u.id=c.user_id
                   WHERE c.article_id=%s ORDER BY c.created_at""",
                (aid,)
            )
            rows = [dict(r) for r in cur.fetchall()]
        return response(200, rows)

    body = parse_body(event)
    if method == 'POST':
        aid = safe_int(body.get('article_id')) or aid
        content = (body.get('content') or '').strip()
        if not aid or not content:
            return response(400, {'error': 'article_id и content обязательны'})
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO kb_article_comments (article_id, user_id, parent_id, content)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (aid, user_id, safe_int(body.get('parent_id')), content[:5000])
            )
            cid = cur.fetchone()['id']
        conn.commit()
        return response(200, {'id': cid})

    if method == 'DELETE':
        cid = safe_int(get_query_param(event, 'id'))
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM kb_article_comments WHERE id=%s", (cid,))
            row = cur.fetchone()
            if not row:
                return response(404, {'error': 'not found'})
            if row['user_id'] != user_id and not can_write(payload):
                return response(403, {'error': 'Нет прав'})
            cur.execute("DELETE FROM kb_article_comments WHERE id=%s", (cid,))
        conn.commit()
        return response(200, {'success': True})

    return response(405, {'error': 'method not allowed'})


# ======================= files =======================

def handle_files(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    body = parse_body(event)
    if method == 'POST':
        if not can_write(payload):
            return response(403, {'error': 'Нет прав'})
        aid = safe_int(body.get('article_id'))
        if not aid:
            return response(400, {'error': 'article_id обязателен'})
        filename = body.get('filename') or 'file'
        b64 = body.get('content_base64') or ''
        mime = body.get('mime_type') or 'application/octet-stream'
        try:
            content = base64.b64decode(b64)
        except Exception:
            return response(400, {'error': 'invalid base64'})
        if len(content) > 25 * 1024 * 1024:
            return response(413, {'error': 'Файл больше 25 МБ'})

        s3 = get_s3_client()
        if not s3:
            return response(500, {'error': 'S3 не настроен'})
        safe_name = re.sub(r'[^\w.\-]', '_', filename) or 'file'
        key = f'kb/{aid}/{uuid.uuid4().hex}_{safe_name}'
        try:
            s3.put_object(Bucket=S3_BUCKET, Key=key, Body=content, ContentType=mime)
        except Exception as e:
            return response(500, {'error': f's3 error: {e}'})
        url = f'{CDN_BASE}/{key}'

        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO kb_article_files (article_id, filename, url, size, mime_type, uploaded_by)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (aid, filename[:255], url, len(content), mime[:100], user_id)
            )
            fid = cur.fetchone()['id']
        conn.commit()
        return response(200, {'id': fid, 'url': url, 'filename': filename, 'size': len(content)})

    if method == 'DELETE':
        if not can_write(payload):
            return response(403, {'error': 'Нет прав'})
        fid = safe_int(get_query_param(event, 'id'))
        with conn.cursor() as cur:
            cur.execute("DELETE FROM kb_article_files WHERE id=%s", (fid,))
        conn.commit()
        return response(200, {'success': True})

    return response(405, {'error': 'method not allowed'})


# ======================= like / favorite / view =======================

def handle_like(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    body = parse_body(event)
    aid = safe_int(body.get('article_id') or get_query_param(event, 'article_id'))
    if not aid:
        return response(400, {'error': 'article_id обязателен'})
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM kb_article_likes WHERE article_id=%s AND user_id=%s", (aid, user_id))
        existing = cur.fetchone()
        if existing:
            cur.execute("DELETE FROM kb_article_likes WHERE article_id=%s AND user_id=%s", (aid, user_id))
            cur.execute("UPDATE kb_articles SET likes_count = GREATEST(likes_count-1, 0) WHERE id=%s RETURNING likes_count", (aid,))
            lc = cur.fetchone()['likes_count']
            liked = False
        else:
            cur.execute("INSERT INTO kb_article_likes (article_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (aid, user_id))
            cur.execute("UPDATE kb_articles SET likes_count = likes_count+1 WHERE id=%s RETURNING likes_count", (aid,))
            lc = cur.fetchone()['likes_count']
            liked = True
    conn.commit()
    return response(200, {'liked': liked, 'likes_count': lc})


def handle_favorite(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    body = parse_body(event)
    aid = safe_int(body.get('article_id') or get_query_param(event, 'article_id'))
    if not aid:
        return response(400, {'error': 'article_id обязателен'})
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM kb_article_favorites WHERE article_id=%s AND user_id=%s", (aid, user_id))
        if cur.fetchone():
            cur.execute("DELETE FROM kb_article_favorites WHERE article_id=%s AND user_id=%s", (aid, user_id))
            fav = False
        else:
            cur.execute("INSERT INTO kb_article_favorites (article_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (aid, user_id))
            fav = True
    conn.commit()
    return response(200, {'is_favorite': fav})


def handle_view(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    body = parse_body(event)
    aid = safe_int(body.get('article_id') or get_query_param(event, 'article_id'))
    if not aid:
        return response(400, {'error': 'article_id обязателен'})
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO kb_article_views (article_id, user_id) VALUES (%s, %s)""",
            (aid, user_id)
        )
        cur.execute("UPDATE kb_articles SET views_count = views_count + 1 WHERE id=%s RETURNING views_count", (aid,))
        vc = cur.fetchone()['views_count']
    conn.commit()
    return response(200, {'views_count': vc})


# ======================= ticket-link =======================

def handle_ticket_link(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    params = event.get('queryStringParameters') or {}
    body = parse_body(event)

    if method == 'GET':
        # Получение статей для заявки
        tid = safe_int(params.get('ticket_id'))
        if not tid:
            return response(400, {'error': 'ticket_id обязателен'})
        with conn.cursor() as cur:
            cur.execute(
                """SELECT a.id, a.title, a.summary, a.views_count, a.likes_count,
                          c.name AS category_name, c.color AS category_color
                   FROM kb_article_tickets kat
                   JOIN kb_articles a ON a.id=kat.article_id
                   LEFT JOIN kb_categories c ON c.id=a.category_id
                   WHERE kat.ticket_id=%s AND a.is_published=TRUE
                   ORDER BY kat.created_at DESC""",
                (tid,)
            )
            rows = [dict(r) for r in cur.fetchall()]
        return response(200, rows)

    if not can_write(payload):
        return response(403, {'error': 'Нет прав'})

    if method == 'POST':
        aid = safe_int(body.get('article_id'))
        tid = safe_int(body.get('ticket_id'))
        if not aid or not tid:
            return response(400, {'error': 'article_id и ticket_id обязательны'})
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO kb_article_tickets (article_id, ticket_id, linked_by)
                   VALUES (%s, %s, %s) ON CONFLICT DO NOTHING""",
                (aid, tid, user_id)
            )
        conn.commit()
        return response(200, {'success': True})

    if method == 'DELETE':
        aid = safe_int(params.get('article_id'))
        tid = safe_int(params.get('ticket_id'))
        with conn.cursor() as cur:
            cur.execute("DELETE FROM kb_article_tickets WHERE article_id=%s AND ticket_id=%s", (aid, tid))
        conn.commit()
        return response(200, {'success': True})

    return response(405, {'error': 'method not allowed'})


# ======================= popular =======================

def handle_popular(method: str, event: Dict[str, Any], conn, user_id: int, payload: Dict[str, Any]):
    if method != 'GET':
        return response(405, {'error': 'method not allowed'})
    with conn.cursor() as cur:
        cur.execute(
            """SELECT a.id, a.title, a.summary, a.views_count, a.likes_count, a.updated_at,
                      c.name AS category_name, c.color AS category_color
               FROM kb_articles a
               LEFT JOIN kb_categories c ON c.id=a.category_id
               WHERE a.is_published=TRUE
               ORDER BY a.views_count DESC, a.likes_count DESC
               LIMIT 10"""
        )
        rows = [dict(r) for r in cur.fetchall()]
    return response(200, rows)


# ======================= handler =======================

def handler(event: dict, context) -> dict:
    """База знаний: категории, статьи, теги, файлы, комментарии, поиск, привязка к заявкам."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return handle_options()

    payload = verify_token(event)
    if not payload:
        return response(401, {'error': 'Требуется авторизация'})
    user_id = safe_int(payload.get('user_id'))
    if not user_id:
        return response(401, {'error': 'Невалидный токен'})

    endpoint = get_endpoint(event)
    conn = get_db_connection()
    try:
        if endpoint == 'categories':
            return handle_categories(method, event, conn, user_id, payload)
        if endpoint == 'tags':
            return handle_tags(method, event, conn, user_id, payload)
        if endpoint == 'articles':
            return handle_articles(method, event, conn, user_id, payload)
        if endpoint == 'article':
            return handle_article_single(method, event, conn, user_id, payload)
        if endpoint == 'search':
            return handle_search(method, event, conn, user_id, payload)
        if endpoint == 'comments':
            return handle_comments(method, event, conn, user_id, payload)
        if endpoint == 'files':
            return handle_files(method, event, conn, user_id, payload)
        if endpoint == 'like':
            return handle_like(method, event, conn, user_id, payload)
        if endpoint == 'favorite':
            return handle_favorite(method, event, conn, user_id, payload)
        if endpoint == 'view':
            return handle_view(method, event, conn, user_id, payload)
        if endpoint == 'ticket-link':
            return handle_ticket_link(method, event, conn, user_id, payload)
        if endpoint == 'popular':
            return handle_popular(method, event, conn, user_id, payload)
        return response(400, {'error': f'unknown endpoint: {endpoint}'})
    except Exception as e:
        conn.rollback()
        return response(500, {'error': str(e)})
    finally:
        conn.close()
