"""Migration bookkeeping must not rerun data backfills on every import."""
import hashlib

import pytest

from britain_exchange import db


class Connection:
    def __init__(self, recorded=None):
        self.recorded = recorded or {}
        self.statements = []
        self.commits = 0
        self.rollbacks = 0

    def execute(self, sql, params=None):
        self.statements.append(sql)
        if sql == 'BROKEN':
            raise RuntimeError('SQL failure')
        if sql.startswith('INSERT INTO schema_migration'):
            self.recorded[params[0]] = params[1]
        return self

    def fetchall(self):
        return [{'name': name, 'checksum_sha256': checksum} for name, checksum in self.recorded.items()]

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def test_only_pending_migrations_execute(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'MIGRATIONS_DIR', tmp_path)
    (tmp_path / '001.sql').write_text('BACKFILL')
    conn = Connection()
    assert db.apply_migrations(conn) == ['001.sql']
    assert db.apply_migrations(conn) == []
    assert conn.statements.count('BACKFILL') == 1
    assert conn.commits == 2


def test_changed_history_refused_before_any_pending_sql(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'MIGRATIONS_DIR', tmp_path)
    (tmp_path / '001.sql').write_text('PENDING')
    (tmp_path / '002.sql').write_text('CHANGED')
    conn = Connection({'002.sql': hashlib.sha256(b'ORIGINAL').hexdigest()})
    with pytest.raises(RuntimeError, match='has changed'):
        db.apply_migrations(conn)
    assert 'PENDING' not in conn.statements
    assert conn.rollbacks == 1
    assert conn.commits == 0


def test_failed_migration_rolls_back(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'MIGRATIONS_DIR', tmp_path)
    (tmp_path / '001.sql').write_text('BROKEN')
    conn = Connection()
    with pytest.raises(RuntimeError, match='SQL failure'):
        db.apply_migrations(conn)
    assert conn.rollbacks == 1
    assert not conn.recorded
    assert conn.commits == 0
