import 'server-only'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

declare global {
  var _postgres: any
}

async function initDatabase() {
  if (global._postgres) return global._postgres

  const connectionString = process.env.DATABASE_URL
  if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
    console.error('DATABASE_URL is missing or contains placeholder [YOUR-PASSWORD].')
    return null
  }

  try {
    const sql = postgres(connectionString, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
    })

    // Auto-create tables in Supabase if topics doesn't exist
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename  = 'topics'
      );
    `

    if (!tableCheck[0].exists) {
      const schemaPath = path.join(process.cwd(), 'schema.sql')
      if (fs.existsSync(schemaPath)) {
        let schema = fs.readFileSync(schemaPath, 'utf-8')
        
        // Convert SQLite syntax to PostgreSQL syntax dynamically
        schema = schema
          .replace(/DATETIME DEFAULT \(datetime\('now'\)\)/gi, "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
          .replace(/DATETIME/gi, "TIMESTAMP WITH TIME ZONE")
          .replace(/INTEGER NOT NULL DEFAULT 0/gi, "INTEGER NOT NULL DEFAULT 0")
          .replace(/INSERT OR IGNORE/gi, "INSERT INTO")
        
        const statements = schema
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0)
        
        for (const statement of statements) {
          try {
            await sql.unsafe(statement)
          } catch (e) {
            console.error('Failed to run migration statement:', statement, e)
          }
        }
      }
    }

    global._postgres = sql
    return sql
  } catch (e) {
    console.error('Failed to initialize PostgreSQL client:', e)
    return null
  }
}

export const sqlPromise = initDatabase()

let sqlClient: any = null
export async function getSql() {
  if (sqlClient) return sqlClient
  sqlClient = await sqlPromise
  return sqlClient
}
