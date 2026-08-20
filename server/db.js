/**
 * server/db.js —— SQLite 数据层（Node 内置 node:sqlite）
 * ---------------------------------------------------
 * 持久化用户账号与分析记录。使用 Node >= 22.5 内置的 node:sqlite，
 * 无需任何原生 npm 依赖。数据库文件位于 server/data/agentmind.db（已 gitignore）。
 *
 * 表结构：
 *   users   —— id / username(唯一) / password_hash / created_at
 *   records —— id / user_id / keyword / source / platform /
 *              result_json(完整分析结果) / created_at
 */

import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_PATH = process.env.AGENTMIND_DB_PATH || path.join(DATA_DIR, 'agentmind.db')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'search',
    platform TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'running',
    step_state TEXT NOT NULL DEFAULT '{}',
    pipeline_json TEXT NOT NULL DEFAULT '{}',
    result_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id, created_at DESC);
`)

// 旧库迁移：为既有 records 表补充新列（status/step_state/pipeline_json）
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}
ensureColumn('records', 'status', `TEXT NOT NULL DEFAULT 'completed'`)
ensureColumn('records', 'step_state', `TEXT NOT NULL DEFAULT '{}'`)
ensureColumn('records', 'pipeline_json', `TEXT NOT NULL DEFAULT '{}'`)
ensureColumn('records', 'updated_at', `INTEGER NOT NULL DEFAULT (strftime('%s','now'))`)

// 旧库迁移：早期版本的 result_json 是 NOT NULL 且无默认值，
// SQLite 无法通过 ALTER 解除约束，需要整表重建（保留既有数据）。
{
  const cols = db.prepare('PRAGMA table_info(records)').all()
  const resultJson = cols.find((c) => c.name === 'result_json')
  if (resultJson && resultJson.notnull === 1) {
    db.exec(`
      ALTER TABLE records RENAME TO records_old;
      CREATE TABLE records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'search',
        platform TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'completed',
        step_state TEXT NOT NULL DEFAULT '{}',
        pipeline_json TEXT NOT NULL DEFAULT '{}',
        result_json TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
      INSERT INTO records
        (id, user_id, keyword, source, platform, status, step_state, pipeline_json, result_json, created_at, updated_at)
      SELECT
        id, user_id, keyword, source, platform,
        'completed' AS status, '{}' AS step_state, '{}' AS pipeline_json,
        result_json, created_at, created_at AS updated_at
      FROM records_old;
      DROP TABLE records_old;
      CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id, created_at DESC);
    `)
  }
}

/** ---------- users ---------- */

export function createUser(username, passwordHash) {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
  const info = stmt.run(username, passwordHash)
  return getUserById(Number(info.lastInsertRowid))
}

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null
}

export function getUserById(id) {
  return db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id) || null
}

/** ---------- records ---------- */

export function createRecord({ userId, keyword, source, platform, status = 'running' }) {
  const stmt = db.prepare(
    'INSERT INTO records (user_id, keyword, source, platform, status) VALUES (?, ?, ?, ?, ?)'
  )
  const info = stmt.run(userId, keyword, source, platform, status)
  return getRecordById(userId, Number(info.lastInsertRowid))
}

export function listRecords(userId) {
  // 列表不带大字段（result/pipeline），用 json_extract 提取摘要信息
  const rows = db
    .prepare(
      `SELECT id, keyword, source, platform, status, created_at, updated_at,
              json_extract(result_json, '$.ir.meta.templateName') AS template_name,
              json_extract(step_state, '$.clean.detail.after') AS sample_count
       FROM records WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50`
    )
    .all(userId)
  return rows.map((r) => ({
    ...r,
    template_name: r.template_name || null,
    sample_count: r.sample_count != null ? Number(r.sample_count) : null
  }))
}

export function getRecordById(userId, recordId) {
  const row = db
    .prepare('SELECT * FROM records WHERE id = ? AND user_id = ?')
    .get(recordId, userId)
  if (!row) return null
  try {
    row.step_state = JSON.parse(row.step_state || '{}')
  } catch {
    row.step_state = {}
  }
  try {
    row.pipeline = JSON.parse(row.pipeline_json || '{}')
  } catch {
    row.pipeline = {}
  }
  delete row.pipeline_json
  try {
    row.result = row.result_json ? JSON.parse(row.result_json) : null
  } catch {
    row.result = null
  }
  delete row.result_json
  return row
}

export function deleteRecord(userId, recordId) {
  return db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(recordId, userId)
}

/** 增量保存步骤状态与流水线快照（断点续跑的基础） */
export function updateRecordStep({ userId, recordId, stepState, pipeline }) {
  const updatedAt = Math.floor(Date.now() / 1000)
  db.prepare(
    'UPDATE records SET step_state = ?, pipeline_json = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(
    JSON.stringify(stepState || {}),
    JSON.stringify(pipeline || {}),
    updatedAt,
    recordId,
    userId
  )
  return getRecordById(userId, recordId)
}

/** 流程收尾：完成（写入结果）或失败（保留流水线快照，供继续） */
export function finishRecord({ userId, recordId, status, result }) {
  const updatedAt = Math.floor(Date.now() / 1000)
  db.prepare(
    'UPDATE records SET status = ?, result_json = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(status, result ? JSON.stringify(result) : null, updatedAt, recordId, userId)
  return getRecordById(userId, recordId)
}

export default db
