import localtunnel from 'localtunnel'
import fs from 'fs'

async function startTunnel() {
  console.log('Connecting localtunnel...')
  const tunnel = await localtunnel({ port: 3001 })
  const url = `${tunnel.url}/sse`
  console.log(`HTTPS_URL: ${url}`)
  fs.writeFileSync('tunnel_url.txt', url)

  tunnel.on('close', () => {
    console.log('Tunnel closed')
  })
}

startTunnel().catch(console.error)
