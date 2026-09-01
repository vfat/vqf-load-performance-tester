import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs, runCli, type CliOptions } from '../src/cli.js';
import { SqliteHistoryRepository } from '../src/lib/server/storage.js';
import { TestExecutionEngine } from '../src/lib/server/engine.js';

describe('CLI Test Runner (TDD-009)', () => {
  let mockServer: http.Server;
  let serverUrl: string;
  let receivedAuthHeader: string | null = null;
  const testDbPath = './data/test_cli_runner.db';
  const tempScenarioFile = './reports/test-scenario.json';

  beforeEach(async () => {
    receivedAuthHeader = null;
    mockServer = http.createServer((req, res) => {
      receivedAuthHeader = (req.headers['authorization'] as string) || null;
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', vus: 1 }));
      } else if (req.url === '/test-page') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <body>
            <h1 id="heading">Pentest CLI Target</h1>
            <button id="cli-btn" onclick="document.getElementById('heading').innerText = 'Clicked!'">Click Me</button>
          </body>
          </html>
        `);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = mockServer.address() as any;
    serverUrl = `http://127.0.0.1:${addr.port}`;

    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports', { recursive: true });
    }
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    if (fs.existsSync(tempScenarioFile)) {
      try { fs.unlinkSync(tempScenarioFile); } catch {}
    }
  });

  describe('parseCliArgs', () => {
    it('should correctly parse CLI flags into CliOptions', () => {
      const argv = [
        '--mode=e2e',
        '--url=https://example.com',
        '--vus=25',
        '--duration=15',
        '--profile=spike',
        '--method=POST',
        '--user-agent=PentestBot/1.0',
        '--headers={"Authorization":"Bearer token123"}'
      ];

      const opts = parseCliArgs(argv);

      expect(opts.mode).toBe('e2e');
      expect(opts.url).toBe('https://example.com');
      expect(opts.vus).toBe(25);
      expect(opts.duration).toBe(15);
      expect(opts.profile).toBe('spike');
      expect(opts.method).toBe('POST');
      expect(opts.userAgent).toBe('PentestBot/1.0');
      expect(opts.headers).toEqual({ Authorization: 'Bearer token123' });
    });

    it('should load scenario file if --scenario flag is provided', () => {
      const scenarioContent = {
        name: 'File Based Test',
        mode: 'e2e',
        browserSteps: [
          { id: 's1', action: 'GOTO', name: 'Open Page', url: 'https://example.com' }
        ]
      };
      fs.writeFileSync(tempScenarioFile, JSON.stringify(scenarioContent));

      const argv = [`--scenario=${tempScenarioFile}`];
      const opts = parseCliArgs(argv);

      expect(opts.scenarioFile).toBe(tempScenarioFile);
      expect(opts.suiteName).toBe('File Based Test');
      expect(opts.browserSteps?.length).toBe(1);
    });
  });

  describe('runCli Execution', () => {
    it('should execute a REST API load test headlessly with exitCode 0', async () => {
      const storage = new SqliteHistoryRepository(testDbPath);
      storage.init();
      const engine = new TestExecutionEngine({ storage });

      const cliOpts: CliOptions = {
        mode: 'api',
        url: `${serverUrl}/api/health`,
        method: 'GET',
        vus: 2,
        duration: 1,
        profile: 'fixed',
        userAgent: 'CliTester/1.0',
        headers: { Authorization: 'Bearer secret_cli_auth' },
        silent: true
      };

      const result = await runCli(cliOpts, { engine, storage });

      expect(result.exitCode).toBe(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalRequests).toBeGreaterThan(0);
      expect(result.summary.errorRatePercent).toBe(0);
      expect(receivedAuthHeader).toBe('Bearer secret_cli_auth');
    });

    it('should execute Playwright E2E steps headlessly with exitCode 0', async () => {
      const storage = new SqliteHistoryRepository(testDbPath);
      storage.init();
      const engine = new TestExecutionEngine({ storage });

      const cliOpts: CliOptions = {
        mode: 'e2e',
        suiteName: 'CLI E2E Verification',
        browserSteps: [
          { id: 's1', action: 'GOTO', name: 'Open Page', url: `${serverUrl}/test-page` },
          { id: 's2', action: 'CLICK', name: 'Click Button', selector: '#cli-btn' },
          { id: 's3', action: 'ASSERT_TEXT', name: 'Verify Heading Text', selector: '#heading', expectedText: 'Clicked!' }
        ],
        silent: true
      };

      const result = await runCli(cliOpts, { engine, storage });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe('COMPLETED');
    });

    it('should return exitCode 1 when assertion fails in E2E mode', async () => {
      const storage = new SqliteHistoryRepository(testDbPath);
      storage.init();
      const engine = new TestExecutionEngine({ storage });

      const cliOpts: CliOptions = {
        mode: 'e2e',
        suiteName: 'Failing CLI Test',
        browserSteps: [
          { id: 's1', action: 'GOTO', name: 'Open Page', url: `${serverUrl}/test-page` },
          { id: 's2', action: 'ASSERT_TEXT', name: 'Fail Assertion', selector: '#heading', expectedText: 'Non-existent' }
        ],
        silent: true
      };

      const result = await runCli(cliOpts, { engine, storage });

      expect(result.exitCode).toBe(1);
    });
  });
});
