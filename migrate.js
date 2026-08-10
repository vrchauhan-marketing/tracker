const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// Parse .env file manually
const envPath = path.join(__dirname, '.env')
let databaseUrl = process.env.DATABASE_URL

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (match) {
    databaseUrl = match[1]
  }
}

if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  console.error('\n⚠️  ERROR: Please check your ".env" file configuration.');
  process.exit(1)
}

const postgres = require('postgres')

async function runMigration() {
  console.log('Connecting to local SQLite database...')
  const sqliteDbPath = path.join(__dirname, 'enacton-tracker.sqlite')
  if (!fs.existsSync(sqliteDbPath)) {
    console.error('SQLite database not found locally.')
    process.exit(1)
  }
  const sqlite = new Database(sqliteDbPath)

  console.log('Connecting to Supabase PostgreSQL database...')
  const sql = postgres(databaseUrl, { ssl: 'require' })

  try {
    // Check if tables need to be created
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename  = 'topics'
      );
    `

    if (!tableCheck[0].exists) {
      console.log('Creating tables on Supabase...')
      const schemaPath = path.join(__dirname, 'schema.sql')
      if (fs.existsSync(schemaPath)) {
        let schema = fs.readFileSync(schemaPath, 'utf-8')
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
            console.error('Migration statement error:', e.message)
          }
        }
        console.log('✓ Tables created successfully.')
      }
    }

    // 1. Migrate Topics
    console.log('\nMigrating topics...')
    const localTopics = sqlite.prepare('SELECT * FROM topics').all()
    let topicsMigrated = 0
    for (const t of localTopics) {
      await sql`
        INSERT INTO topics (id, name, color, is_active)
        VALUES (${t.id}, ${t.name}, ${t.color}, ${t.is_active})
        ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color, is_active = EXCLUDED.is_active
      `
      topicsMigrated++
    }
    console.log(`✓ Migrated ${topicsMigrated} topics.`);

    // 2. Migrate Settings
    console.log('\nMigrating settings...')
    const localSettings = sqlite.prepare('SELECT * FROM settings').all()
    let settingsMigrated = 0
    for (const s of localSettings) {
      await sql`
        INSERT INTO settings (key, value)
        VALUES (${s.key}, ${s.value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `
      settingsMigrated++
    }
    console.log(`✓ Migrated ${settingsMigrated} settings.`);

    // 3. Migrate Activities
    console.log('\nMigrating activities...')
    const localActivities = sqlite.prepare('SELECT * FROM activities').all()
    let activitiesMigrated = 0
    for (const a of localActivities) {
      await sql`
        INSERT INTO activities (
          id, created_at, date_posted, platform, activity_type, subreddit,
          is_promotional, url, title, topic_tags, notes, screenshot, logged_by,
          scraped_upvotes, scraped_comments, scraped_views, last_scraped_at
        )
        VALUES (
          ${a.id},
          ${a.created_at ? new Date(a.created_at) : new Date()},
          ${a.date_posted},
          ${a.platform},
          ${a.activity_type},
          ${a.subreddit || null},
          ${a.is_promotional ?? 0},
          ${a.url},
          ${a.title || null},
          ${a.topic_tags},
          ${a.notes || null},
          ${a.screenshot || null},
          ${a.logged_by || null},
          ${a.scraped_upvotes ?? 0},
          ${a.scraped_comments ?? 0},
          ${a.scraped_views ?? 0},
          ${a.last_scraped_at ? new Date(a.last_scraped_at) : null}
        )
        ON CONFLICT (url) DO NOTHING
      `
      activitiesMigrated++
    }
    console.log(`✓ Migrated ${activitiesMigrated} activities.`);

    console.log('\n🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
  } finally {
    await sql.end()
  }
}

runMigration()
