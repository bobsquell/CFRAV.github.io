import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'json-api',
      configureServer(server) {
        const apiHandler = (filename) => (req, res) => {
          const file = path.resolve(__dirname, filename)
          res.setHeader('Content-Type', 'application/json')
          if (req.method === 'GET') {
            res.end(fs.readFileSync(file))
          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', c => (body += c))
            req.on('end', () => {
              fs.writeFileSync(file, JSON.stringify(JSON.parse(body), null, 2))
              res.end('{"ok":true}')
            })
          }
        }
        server.middlewares.use('/api/prices', apiHandler('prices.json'))
        server.middlewares.use('/api/config', apiHandler('config.json'))
      },
    },
  ],
})
