"""
Database service для reset-password функции
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor


def get_db_connection():
    """Получить подключение к БД"""
    dsn = os.environ.get('DSN')
    if not dsn:
        raise ValueError('DSN environment variable not set')
    
    conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor)
    return conn
