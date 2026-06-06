import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Subprocess } from 'bun';

const rootDir = resolve(import.meta.dir, '..');
const serverDir = resolve(rootDir, 'server');
const clientDir = resolve(rootDir, 'client');
const workersDir = resolve(rootDir, 'python-workers');
const pythonBin = resolve(workersDir, '.venv/bin/python');

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const SERVICE_COLORS: Record<string, string> = {
  server: '\x1b[34m',
  client: '\x1b[35m',
  worker: '\x1b[33m',
};

type DevService = {
  name: string;
  cwd: string;
  cmd: string[];
};

type DevOptions = {
  startDocker: boolean;
  startWorkers: boolean;
};

function colorsEnabled(): boolean {
  return process.env.NO_COLOR === undefined;
}

function formatPrefix(name: string): string {
  const label = `[${name}]`;
  if (!colorsEnabled()) {
    return label;
  }
  const color = SERVICE_COLORS[name] ?? '\x1b[37m';
  return `${color}${label}${RESET}`;
}

function formatDevMessage(text: string): string {
  if (!colorsEnabled()) {
    return `[dev] ${text}`;
  }
  return `${DIM}[dev]${RESET} ${text}`;
}

function parseArgs(argv: string[]): DevOptions {
  const startDocker = !argv.includes('--no-docker');
  const startWorkers = !argv.includes('--no-workers');
  return { startDocker, startWorkers };
}

function printUsage(): void {
  console.log('Usage: bun scripts/dev.ts [--no-docker] [--no-workers]');
  console.log('');
  console.log('Starts Postgres/Redis (docker compose), API server, Vite client,');
  console.log('and the Python realtime worker. Press Ctrl+C to stop all processes.');
}

async function runDockerCompose(): Promise<void> {
  const proc = Bun.spawn(['docker', 'compose', 'up', '-d'], {
    cwd: rootDir,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`docker compose up failed with exit code ${String(exitCode)}`);
  }
}

async function pipeLines(
  stream: ReadableStream<Uint8Array> | null,
  prefix: string,
  isError: boolean,
): Promise<void> {
  if (stream === null) {
    return;
  }
  const writer = isError ? process.stderr : process.stdout;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.length > 0) {
        writer.write(`${prefix} ${buffer}`);
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      writer.write(`${prefix} ${line}\n`);
    }
  }
}

function spawnService(service: DevService): Subprocess {
  const proc = Bun.spawn(service.cmd, {
    cwd: service.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  const prefix = formatPrefix(service.name);
  void pipeLines(proc.stdout, prefix, false);
  void pipeLines(proc.stderr, prefix, true);
  return proc;
}

function buildServices(options: DevOptions): DevService[] {
  const services: DevService[] = [
    { name: 'server', cwd: serverDir, cmd: ['bun', 'run', 'dev'] },
    { name: 'client', cwd: clientDir, cmd: ['bun', 'run', 'dev'] },
  ];

  if (options.startWorkers) {
    if (!existsSync(pythonBin)) {
      throw new Error(
        `Python venv not found at ${pythonBin}. Run: cd python-workers && python -m venv .venv && .venv/bin/pip install -r requirements.lock.txt`,
      );
    }
    services.push({
      name: 'worker',
      cwd: workersDir,
      cmd: [pythonBin, 'src/realtime_worker.py'],
    });
  }

  return services;
}

function registerShutdown(procs: Subprocess[]): void {
  const shutdown = (signal: NodeJS.Signals): void => {
    console.log(`\n${formatDevMessage(`received ${signal}, stopping processes...`)}`);
    for (const proc of procs) {
      if (!proc.killed) {
        proc.kill();
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return;
  }

  const options = parseArgs(argv);

  if (options.startDocker) {
    console.log(formatDevMessage('starting docker compose (postgres + redis)...'));
    await runDockerCompose();
  }

  const services = buildServices(options);
  const procs = services.map(spawnService);
  registerShutdown(procs);

  console.log(formatDevMessage('running:'));
  for (const service of services) {
    const detail = `${service.cmd.join(' ')} (cwd: ${service.cwd})`;
    if (colorsEnabled()) {
      console.log(`  ${formatPrefix(service.name)} ${DIM}${detail}${RESET}`);
    } else {
      console.log(`  - ${service.name}: ${detail}`);
    }
  }
  console.log(`${formatDevMessage('press Ctrl+C to stop')}\n`);

  const results = await Promise.all(procs.map((proc) => proc.exited));
  const failed = results.find((code) => code !== 0);
  if (failed !== undefined) {
    process.exit(failed);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(formatDevMessage(`fatal: ${message}`));
  process.exit(1);
});
