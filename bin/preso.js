#!/usr/bin/env node
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import openBrowser from 'open'
import { startServer } from '../server/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = join(__dirname, '..', 'src')

yargs(hideBin(process.argv))
  .scriptName('preso')
  .command(
    'serve [path]',
    'Serve a git repository as an interactive presentation',
    (y) =>
      y
        .positional('path', {
          describe: 'Path to the git repository (defaults to current directory)',
          default: '.',
          type: 'string',
        })
        .option('port', { alias: 'p', default: 5173, type: 'number', describe: 'Frontend port' })
        .option('api-port', { default: 3001, type: 'number', describe: 'API server port' })
        .option('open', { alias: 'o', default: true, type: 'boolean', describe: 'Open browser' })
        .option('verbose', { alias: 'v', default: false, type: 'boolean', describe: 'Verbose logging' }),
    async (argv) => {
      const repoPath = resolve(argv.path)
      const apiPort = argv.apiPort
      const frontPort = argv.port

      console.log(`\n  git-architecture-preso`)
      console.log(`  Repo: ${repoPath}`)
      console.log()

      // Start Express API server
      try {
        await startServer(repoPath, apiPort, { verbose: argv.verbose })
      } catch (err) {
        console.error(`Failed to start API server on port ${apiPort}:`, err.message)
        process.exit(1)
      }

      // Start Vite dev server
      const vite = spawn(
        'npx',
        ['vite', '--port', String(frontPort), '--host', '127.0.0.1'],
        {
          cwd: FRONTEND_DIR,
          stdio: 'inherit',
          env: {
            ...process.env,
            VITE_API_PORT: String(apiPort),
          },
        }
      )

      vite.on('error', (err) => {
        console.error('Failed to start Vite:', err.message)
        process.exit(1)
      })

      // Open browser after a short delay
      if (argv.open) {
        setTimeout(() => {
          openBrowser(`http://127.0.0.1:${frontPort}`).catch(() => {})
        }, 2000)
      }

      console.log(`  Frontend: http://127.0.0.1:${frontPort}`)
      console.log()

      const shutdown = () => {
        vite.kill()
        process.exit(0)
      }
      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)
    }
  )
  .demandCommand(1, 'Specify a command: serve')
  .help()
  .parse()
