-- База знаний

CREATE TABLE IF NOT EXISTS kb_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    parent_id INTEGER REFERENCES kb_categories(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_categories_parent ON kb_categories(parent_id);

CREATE TABLE IF NOT EXISTS kb_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    summary TEXT,
    content JSONB,
    content_html TEXT,
    plain_text TEXT,
    category_id INTEGER REFERENCES kb_categories(id),
    author_id INTEGER REFERENCES users(id),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author ON kb_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON kb_articles(is_published);

CREATE TABLE IF NOT EXISTS kb_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_article_tags (
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    tag_id INTEGER NOT NULL REFERENCES kb_tags(id),
    PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS kb_article_files (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_files_article ON kb_article_files(article_id);

CREATE TABLE IF NOT EXISTS kb_article_comments (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    parent_id INTEGER REFERENCES kb_article_comments(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_comments_article ON kb_article_comments(article_id);

CREATE TABLE IF NOT EXISTS kb_article_likes (
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, user_id)
);

CREATE TABLE IF NOT EXISTS kb_article_favorites (
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, user_id)
);

CREATE TABLE IF NOT EXISTS kb_article_views (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    user_id INTEGER REFERENCES users(id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_views_article ON kb_article_views(article_id);

CREATE TABLE IF NOT EXISTS kb_article_tickets (
    article_id INTEGER NOT NULL REFERENCES kb_articles(id),
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    linked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, ticket_id)
);
