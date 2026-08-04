import 'server-only'

declare global {
  var _sqlite: any
}

function getDatabase() {
  if (global._sqlite) return global._sqlite
  try {
    // Dynamic require so webpack/turbopack doesn't break when bundling for Edge
    const Database = require('better-sqlite3')
    const path = require('path')
    const fs = require('fs')

    const dbPath = path.join(process.cwd(), 'enacton-tracker.sqlite')
    const schemaPath = path.join(process.cwd(), 'schema.sql')

    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8')
      db.exec(schema)
    }
    global._sqlite = db
    return db
  } catch (e) {
    // Graceful fallback for Edge / Cloudflare Workers environment
    return null
  }
}

export const db = getDatabase()
