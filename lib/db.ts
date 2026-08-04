import 'server-only'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Singleton pattern: prevents multiple connections on Next.js hot reload
declare global {
  var _sqlite: Database.Database | undefined
}

function getDatabase(): Database.Database {
  if (!global._sqlite) {
    const dbPath = path.join(process.cwd(), 'enacton-tracker.sqlite')
    const schemaPath = path.join(process.cwd(), 'schema.sql')

    global._sqlite = new Database(dbPath)
    global._sqlite.pragma('journal_mode = WAL')
    global._sqlite.pragma('foreign_keys = ON')

    // Run schema on first connection (idempotent — uses IF NOT EXISTS)
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    global._sqlite.exec(schema)
  }
  return global._sqlite
}

export const db = getDatabase()
