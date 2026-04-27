import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import fs from 'fs'
import path from 'path'

const rootDir = path.resolve('.')
const logsDir = path.resolve('.logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const TAILWIND_LOG_RE = /^tailwindcss-\d+\.log$/

function moveTailwindLogs() {
  try {
    for (const f of fs.readdirSync(rootDir)) {
      if (TAILWIND_LOG_RE.test(f)) {
        fs.renameSync(path.join(rootDir, f), path.join(logsDir, f))
      }
    }
  // eslint-disable-next-line no-unused-vars
  } catch (_e) { /* file busy or already moved */ }
}

function tailwindLogMover() {
  return {
    name: 'tailwind-log-mover',
    buildStart: moveTailwindLogs,
    closeBundle: moveTailwindLogs,
    configureServer(server) {
      moveTailwindLogs()
      const watcher = fs.watch(rootDir, (_, filename) => {
        if (filename && TAILWIND_LOG_RE.test(filename)) {
          setTimeout(() => {
            try {
              fs.renameSync(path.join(rootDir, filename), path.join(logsDir, filename))
            // eslint-disable-next-line no-unused-vars
  } catch (_e) { /* file busy or already moved */ }
          }, 50)
        }
      })
      server.httpServer?.on('close', () => watcher.close())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindLogMover(),
  ],
  logLevel: 'warn',
})
