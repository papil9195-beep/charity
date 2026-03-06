import { spawn } from 'node:child_process'
import process from 'node:process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const processes = []
let shuttingDown = false

function startProcess(name, args) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    console.error(`${name} exited with ${reason}. Stopping remaining dev processes.`)
    shutdown(typeof code === 'number' ? code : 1)
  })

  processes.push(child)
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGINT')
    }
  }

  setTimeout(() => {
    for (const child of processes) {
      if (!child.killed) {
        child.kill('SIGTERM')
      }
    }
    process.exit(exitCode)
  }, 250)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

startProcess('API server', ['run', 'api'])
startProcess('Vite dev server', ['run', 'dev'])
