import { spawn } from 'child_process'
import fs from 'fs'

const cf = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', 'http://localhost:3001'], { shell: true })

cf.stderr.on('data', (data) => {
  const str = data.toString()
  console.log(str)
  const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
  if (match) {
    const url = `${match[0]}/sse`
    console.log(`FOUND_URL: ${url}`)
    fs.writeFileSync('cf_url.txt', url)
  }
})

cf.stdout.on('data', (data) => {
  console.log(data.toString())
})
