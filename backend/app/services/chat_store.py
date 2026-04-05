from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from .settings import REPO_ROOT, settings

MessageRole = Literal["user", "assistant"]

DATABASE_FILE_PATH = Path(settings.chat_db_path).expanduser()
if not DATABASE_FILE_PATH.is_absolute():
    # 相对路径统一锚定到仓库根目录，避免从不同 cwd 启动时把数据库写散。
    DATABASE_FILE_PATH = (REPO_ROOT / DATABASE_FILE_PATH).resolve()


def _ensure_database_parent():
    DATABASE_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    # 这里没有做“全局长连接”，而是每次操作拿一个短连接。
    # 对当前这种轻量原型更简单，也更不容易把连接状态弄乱。
    _ensure_database_parent()
    connection = sqlite3.connect(DATABASE_FILE_PATH)
    # row_factory 让查询结果既能保留 SQLite 的轻量级，也能按字段名访问。
    connection.row_factory = sqlite3.Row
    connection.execute("pragma foreign_keys = on")
    return connection


def create_database():
    with get_connection() as connection:
        # WAL 更适合这种“读历史 + 持续写消息”的轻量聊天场景。
        connection.execute("pragma journal_mode = wal")
        connection.executescript(
            """
            create table if not exists conversations (
              id text primary key,
              title text not null,
              created_at text not null,
              updated_at text not null
            );

            create table if not exists messages (
              id text primary key,
              conversation_id text not null,
              role text not null check(role in ('user', 'assistant')),
              content text not null,
              created_at text not null,
              foreign key (conversation_id) references conversations(id)
            );

            create index if not exists idx_conversations_updated_at
              on conversations(updated_at desc);

            create index if not exists idx_messages_conversation_id_created_at
              on messages(conversation_id, created_at asc);
            """
        )


def get_now() -> str:
    # 统一返回 ISO 字符串，前后端都能直接传，不需要额外时区转换逻辑。
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_conversation_title(title: str) -> str:
    trimmed = title.strip()

    if not trimmed:
        return "New conversation"

    # 标题沿用前端最小策略，只截首条 prompt，先不引入额外生成逻辑。
    return trimmed[:60]


def map_conversation_row(row: sqlite3.Row) -> dict[str, str]:
    # SQLite 里保留下划线字段名；对外返回前端更熟悉的 camelCase。
    return {
        "id": row["id"],
        "title": row["title"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def map_message_row(row: sqlite3.Row) -> dict[str, str]:
    return {
        "id": row["id"],
        "conversationId": row["conversation_id"],
        "role": row["role"],
        "content": row["content"],
        "createdAt": row["created_at"],
    }


def create_conversation(title: str) -> dict[str, str]:
    now = get_now()
    record = {
        "id": str(uuid.uuid4()),
        "title": normalize_conversation_title(title),
        "createdAt": now,
        "updatedAt": now,
    }

    with get_connection() as connection:
        connection.execute(
            """
            insert into conversations (id, title, created_at, updated_at)
            values (?, ?, ?, ?)
            """,
            (
                record["id"],
                record["title"],
                record["createdAt"],
                record["updatedAt"],
            ),
        )

    return record


def get_conversation_by_id(conversation_id: str) -> dict[str, str] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            select id, title, created_at, updated_at
            from conversations
            where id = ?
            """,
            (conversation_id,),
        ).fetchone()

    if row is None:
        return None

    return map_conversation_row(row)


def list_conversations() -> list[dict[str, str]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            select id, title, created_at, updated_at
            from conversations
            order by updated_at desc
            """
        ).fetchall()

    return [map_conversation_row(row) for row in rows]


def list_messages_by_conversation_id(conversation_id: str) -> list[dict[str, str]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            select id, conversation_id, role, content, created_at
            from messages
            where conversation_id = ?
            order by created_at asc
            """,
            (conversation_id,),
        ).fetchall()

    return [map_message_row(row) for row in rows]


def insert_message(
    conversation_id: str,
    role: MessageRole,
    content: str,
) -> dict[str, str]:
    # 这里先拼出 record，再统一写库，能让返回值和入库值保持一份来源。
    record = {
        "id": str(uuid.uuid4()),
        "conversationId": conversation_id,
        "role": role,
        "content": content,
        "createdAt": get_now(),
    }

    with get_connection() as connection:
        connection.execute(
            """
            insert into messages (id, conversation_id, role, content, created_at)
            values (?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["conversationId"],
                record["role"],
                record["content"],
                record["createdAt"],
            ),
        )

    return record


def touch_conversation(conversation_id: str):
    with get_connection() as connection:
        connection.execute(
            """
            update conversations
            set updated_at = ?
            where id = ?
            """,
            (get_now(), conversation_id),
        )


create_database()
