import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { 
  PlaywrightStepExecutor, 
  type BrowserStepDefinition,
  type StepExecutionReport,
  type StepExecutionDetail
} from '../src/lib/server/playwright-step-executor.js';

describe('PlaywrightStepExecutor (TDD-007)', () => {
  let mockServer: http.Server;
  let serverUrl: string;
  const testScreenshotDir = './reports/screenshots';

  beforeEach(async () => {
    if (!fs.existsSync(testScreenshotDir)) {
      fs.mkdirSync(testScreenshotDir, { recursive: true });
    }

    mockServer = http.createServer((req, res) => {
      if (req.url === '/test-page') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>E2E Step Test Page</title></head>
          <body>
            <h1 id="main-title">Welcome to Pentest Lab</h1>
            <input type="text" id="username-input" placeholder="Enter username" />
            <button id="submit-btn" onclick="document.getElementById('result-msg').innerText = 'Submitted: ' + document.getElementById('username-input').value">Submit</button>
            <div id="result-msg">Ready</div>
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
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  it('should execute a sequential multi-step browser interaction successfully', async () => {
    const executor = new PlaywrightStepExecutor();
    const steps: BrowserStepDefinition[] = [
      { id: 's1', action: 'GOTO', name: 'Open Page', url: `${serverUrl}/test-page` },
      { id: 's2', action: 'FILL', name: 'Fill Username', selector: '#username-input', value: 'pentester_alice' },
      { id: 's3', action: 'CLICK', name: 'Click Submit', selector: '#submit-btn' },
      { id: 's4', action: 'ASSERT_TEXT', name: 'Verify Result', selector: '#result-msg', expectedText: 'Submitted: pentester_alice' },
      { id: 's5', action: 'SCREENSHOT', name: 'Capture Evidence' }
    ];

    const progressEvents: StepExecutionDetail[] = [];
    const report: StepExecutionReport = await executor.executeScenario({
      testRunId: 'test-run-e2e-001',
      scenarioName: 'Login Form Submission Flow',
      steps,
      screenshotDir: testScreenshotDir,
      onStepProgress: (detail: StepExecutionDetail) => progressEvents.push(detail)
    });

    expect(report.status).toBe('PASSED');
    expect(report.stepsCompleted).toBe(5);
    expect(report.totalSteps).toBe(5);
    expect(report.stepDetails.length).toBe(5);
    expect(progressEvents.length).toBe(5);

    // Verify screenshot was created on step 5
    const screenshotStep = report.stepDetails[4];
    expect(screenshotStep.action).toBe('SCREENSHOT');
    expect(screenshotStep.screenshotPath).toBeDefined();
    expect(fs.existsSync(screenshotStep.screenshotPath!)).toBe(true);
  });

  it('should fail gracefully and capture on-failure screenshot when assertion fails', async () => {
    const executor = new PlaywrightStepExecutor();
    const steps: BrowserStepDefinition[] = [
      { id: 's1', action: 'GOTO', name: 'Open Page', url: `${serverUrl}/test-page` },
      { id: 's2', action: 'ASSERT_TEXT', name: 'Fail Assertion', selector: '#main-title', expectedText: 'Non Existent Title' }
    ];

    const report: StepExecutionReport = await executor.executeScenario({
      testRunId: 'test-run-e2e-fail',
      scenarioName: 'Failing Title Check',
      steps,
      screenshotDir: testScreenshotDir,
      stopOnError: true
    });

    expect(report.status).toBe('FAILED');
    expect(report.stepsCompleted).toBe(1); // Only step 1 passed
    expect(report.errorMessage).toContain('Assertion failed');
    expect(report.failureScreenshotPath).toBeDefined();
    expect(fs.existsSync(report.failureScreenshotPath!)).toBe(true);
  });

  it('should handle element not found error with timeout', async () => {
    const executor = new PlaywrightStepExecutor();
    const steps: BrowserStepDefinition[] = [
      { id: 's1', action: 'GOTO', name: 'Open Page', url: `${serverUrl}/test-page` },
      { id: 's2', action: 'CLICK', name: 'Click Ghost Element', selector: '#non-existent-button', timeoutMs: 1000 }
    ];

    const report = await executor.executeScenario({
      testRunId: 'test-run-ghost',
      scenarioName: 'Ghost Element Click',
      steps,
      screenshotDir: testScreenshotDir,
      stopOnError: true
    });

    expect(report.status).toBe('FAILED');
    expect(report.errorMessage).toBeDefined();
  });
});
