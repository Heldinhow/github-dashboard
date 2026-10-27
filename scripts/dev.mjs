import { spawn } from 'node:child_process'

const processes = [
  spawn(process.execPath, ['--watch', 'server/index.ts'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
]

const stop = () => {
  for (const child of processes) child.kill('SIGTERM')
}

process.on('SIGINT', () => {
  stop()
  process.exit(0)
})
process.on('SIGTERM', () => {
  stop()
  process.exit(0)
})

for (const child of processes) {
  child.on('exit', (code) => {
    if (code !== 0) {
      stop()
      process.exit(code ?? 1)
    }
  })
}
