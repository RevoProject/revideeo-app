import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, stat, unlink, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'

// Serwuje media edytora (bloby z IndexedDB) przez dev-server pod HTTP URL zamiast
// blob:. W kontekście niezabezpieczonym (http na LAN) mobile Chrome/Brave blokują
// blob: dla <video>, co powoduje timeout delayRender w Remotion. Zwykły URL HTTP
// tego samego pochodzenia odtwarza się na telefonach poprawnie.
// Uwaga: ścieżka musi być zsynchronizowana z MEDIA_SERVER_PREFIX w src/App.tsx.
const MEDIA_SERVER_PREFIX = '/__revideeo_media'

function revideeoMediaServer(): Plugin {
  const storeDir = join(tmpdir(), 'revideeo-media')
  return {
    name: 'revideeo-media-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(MEDIA_SERVER_PREFIX, async (req, res, next) => {
        try {
          const pathname = (req.url ?? '/').split('?')[0].replace(/^\//, '')
          if (!pathname) {
            res.statusCode = 400
            res.end('missing media id')
            return
          }
          const safeId = pathname.replace(/[^a-zA-Z0-9._-]/g, '_')
          const filePath = join(storeDir, safeId)
          const ctPath = `${filePath}.ct`

          if (req.method === 'POST') {
            await mkdir(storeDir, { recursive: true })
            const ct = (req.headers['content-type'] as string) || 'application/octet-stream'
            const tmp = `${filePath}.tmp-${randomUUID()}`
            await pipeline(req, createWriteStream(tmp))
            await rename(tmp, filePath)
            await writeFile(ctPath, ct, 'utf8')
            res.statusCode = 200
            res.end('ok')
            return
          }

          if (req.method === 'DELETE') {
            await Promise.all([unlink(filePath).catch(() => undefined), unlink(ctPath).catch(() => undefined)])
            res.statusCode = 200
            res.end('ok')
            return
          }

          if (req.method === 'GET' || req.method === 'HEAD') {
            let st
            try {
              st = await stat(filePath)
            } catch {
              res.statusCode = 404
              res.end('media not found')
              return
            }
            const ct =
              (await readFile(ctPath, 'utf8').catch(() => 'application/octet-stream')) || 'application/octet-stream'
            const total = st.size
            let start = 0
            let end = total - 1
            let status = 200
            const range = req.headers.range
            if (range) {
              const m = /bytes=(\d+)-(\d*)/.exec(range as string)
              if (m) {
                start = parseInt(m[1], 10)
                end = m[2] ? parseInt(m[2], 10) : total - 1
                if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= total) {
                  res.statusCode = 416
                  res.setHeader('Content-Range', `bytes */${total}`)
                  res.end()
                  return
                }
                status = 206
              }
            }
            const chunkSize = end - start + 1
            res.statusCode = status
            res.setHeader('Content-Type', ct.trim())
            res.setHeader('Accept-Ranges', 'bytes')
            res.setHeader('Content-Length', chunkSize)
            if (status === 206) {
              res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
            }
            if (req.method === 'HEAD') {
              res.end()
              return
            }
            const stream = createReadStream(filePath, { start, end })
            stream.on('error', () => {
              try {
                res.destroy()
              } catch {
                /* noop */
              }
            })
            stream.pipe(res)
            return
          }

          res.statusCode = 405
          res.end('method not allowed')
        } catch (err) {
          next(err)
        }
      })

      server.httpServer?.on('close', () => {
        rm(storeDir, { recursive: true, force: true }).catch(() => undefined)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), revideeoMediaServer()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/@remotion/player') || id.includes('node_modules/remotion/')) return 'vendor-remotion'
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
        },
      },
    },
  },
})
