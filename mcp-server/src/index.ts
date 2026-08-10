import { Server } from '@modelcontextprotocol/sdk/server'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '../../enacton-tracker.sqlite')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

function createMcpServer() {
  const server = new Server(
    {
      name: 'tracker-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'log_activity',
          description: 'Log a community outreach activity (Reddit, Quora, Dev.to, Medium, LinkedIn) into the Tracker database.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Direct link to the post, article, or comment',
              },
              platform: {
                type: 'string',
                enum: ['Reddit', 'Quora', 'Dev.to', 'Medium', 'LinkedIn', 'Other'],
                description: 'Target platform',
              },
              activity_type: {
                type: 'string',
                enum: ['Article', 'Post / Thread', 'Comment / Answer'],
                description: 'Format of the activity',
              },
              topic_tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Target topics (e.g. ["MVP Development & Rescue", "SaaS Development"])',
              },
              date_posted: {
                type: 'string',
                description: 'Date published in YYYY-MM-DD format (defaults to today)',
              },
              title: {
                type: 'string',
                description: 'Title or headline of the post',
              },
              notes: {
                type: 'string',
                description: 'Optional context or initial engagement notes',
              },
              logged_by: {
                type: 'string',
                description: 'Name of team member logging the activity',
              },
            },
            required: ['url', 'platform', 'activity_type', 'topic_tags'],
          },
        },
        {
          name: 'get_weekly_summary',
          description: 'Fetch weekly activity totals and platform breakdown from the database.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (name === 'log_activity') {
      const {
        url,
        platform,
        activity_type,
        topic_tags,
        date_posted = new Date().toISOString().split('T')[0],
        title = null,
        notes = null,
        logged_by = null,
      } = args as any

      try {
        db.prepare(`
          INSERT INTO activities (id, date_posted, platform, activity_type, url, title, topic_tags, notes, logged_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          date_posted,
          platform,
          activity_type,
          url,
          title,
          JSON.stringify(topic_tags),
          notes,
          logged_by
        )

        return {
          content: [
            {
              type: 'text',
              text: `✅ Successfully logged activity to Tracker!\n• Platform: ${platform}\n• Type: ${activity_type}\n• Topics: ${topic_tags.join(', ')}\n• URL: ${url}`,
            },
          ],
        }
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed')) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ This URL has already been logged in the Tracker: ${url}`,
              },
            ],
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error logging activity: ${e.message}`,
            },
          ],
        }
      }
    }

    if (name === 'get_weekly_summary') {
      const total = (db.prepare(`SELECT COUNT(*) as c FROM activities`).get() as any).c
      const thisWeek = (db.prepare(`
        SELECT COUNT(*) as c FROM activities
        WHERE date(date_posted) >= date('now', '-7 days')
      `).get() as any).c
      const platforms = db.prepare(`
        SELECT platform, COUNT(*) as count FROM activities
        WHERE date(date_posted) >= date('now', '-7 days')
        GROUP BY platform
      `).all() as any[]

      const summary = `📊 Tracker Status:\n• Total Activities (All time): ${total}\n• Activities This Week: ${thisWeek}\n• Platforms This Week:\n${platforms.map(p => `  - ${p.platform}: ${p.count}`).join('\n') || '  (No activity yet this week)'}`

      return {
        content: [{ type: 'text', text: summary }],
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  return server
}

// ─── HTTP / SSE Server for Remote MCP connectors ──────────────
const sseTransports = new Map<string, SSEServerTransport>()

const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (url.pathname === '/sse') {
    const transport = new SSEServerTransport('/messages', res)
    const sessionId = transport.sessionId
    sseTransports.set(sessionId, transport)

    transport.onclose = () => sseTransports.delete(sessionId)

    const serverInstance = createMcpServer()
    await serverInstance.connect(transport)
    return
  }

  if (url.pathname === '/messages') {
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId || !sseTransports.has(sessionId)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Invalid or missing sessionId')
      return
    }

    const transport = sseTransports.get(sessionId)!
    await transport.handlePostMessage(req, res)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.error(`Tracker MCP HTTP/SSE server running at http://localhost:${PORT}/sse`)
})

if (process.env.MCP_TRANSPORT === 'stdio') {
  const stdioServer = createMcpServer()
  const stdioTransport = new StdioServerTransport()
  stdioServer.connect(stdioTransport).catch(console.error)
}
