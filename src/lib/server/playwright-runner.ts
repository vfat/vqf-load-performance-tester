import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { 
  PlaywrightStepExecutor, 
  type BrowserStepDefinition, 
  type StepExecutionReport,
  type StepExecutionDetail
} from './playwright-step-executor.js';

export interface ScenarioRunOptions {
  testRunId: string;
  scenarioName: string;
  scenarioFn: () => Promise<any>;
  maxRetries?: number;
}

export interface TargetScenarioOptions {
  testRunId: string;
  scenarioName: string;
  targetUrl: string;
  screenshotDir?: string;
  maxRetries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface StepScenarioOptions {
  testRunId: string;
  scenarioName: string;
  steps: BrowserStepDefinition[];
  screenshotDir?: string;
  stopOnError?: boolean;
  userAgent?: string;
  headers?: Record<string, string>;
  onStepProgress?: (detail: StepExecutionDetail) => void;
}

export interface ScenarioExecutionResult {
  testRunId: string;
  scenarioName: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  retryCount: number;
  errorMessage: string | null;
  screenshotPath: string | null;
  report?: StepExecutionReport;
}

export class PlaywrightRunner {
  private stepExecutor: PlaywrightStepExecutor;

  constructor() {
    this.stepExecutor = new PlaywrightStepExecutor();
  }

  async runScenario(options: ScenarioRunOptions): Promise<ScenarioExecutionResult> {
    const maxRetries = options.maxRetries ?? 0;
    let attempt = 0;
    let lastError: Error | null = null;
    const startTime = Date.now();

    while (attempt <= maxRetries) {
      try {
        await options.scenarioFn();
        const durationMs = Date.now() - startTime;

        return {
          testRunId: options.testRunId,
          scenarioName: options.scenarioName,
          status: 'PASSED',
          durationMs,
          retryCount: attempt,
          errorMessage: null,
          screenshotPath: null
        };
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempt++;
        if (attempt > maxRetries) {
          break;
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      testRunId: options.testRunId,
      scenarioName: options.scenarioName,
      status: 'FAILED',
      durationMs,
      retryCount: attempt - 1,
      errorMessage: lastError?.message || 'Scenario execution failed',
      screenshotPath: null
    };
  }

  async executeTargetScenario(options: TargetScenarioOptions): Promise<ScenarioExecutionResult> {
    const startTime = Date.now();
    const screenshotDir = options.screenshotDir || path.resolve(process.cwd(), 'reports/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const sanitizedName = options.scenarioName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const screenshotFilename = `target-${options.testRunId}-${sanitizedName}.png`;
    const screenshotPath = path.join(screenshotDir, screenshotFilename);

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: options.userAgent || undefined,
        extraHTTPHeaders: options.headers || undefined
      });
      const page = await context.newPage();

      // Wait for complete page load, async data fetches, and network idle
      try {
        await page.goto(options.targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      } catch {
        // If networkidle times out (e.g. infinite polling), ensure window load state is reached
        await page.waitForLoadState('load');
      }

      // Grace period for client-side JS hydration / SPA framework renders
      await page.waitForTimeout(800);

      await page.screenshot({ path: screenshotPath, fullPage: false });

      await context.close();
      await browser.close();

      const durationMs = Date.now() - startTime;
      return {
        testRunId: options.testRunId,
        scenarioName: options.scenarioName,
        status: 'PASSED',
        durationMs,
        retryCount: 0,
        errorMessage: null,
        screenshotPath
      };
    } catch (err: any) {
      if (browser) {
        try { await browser.close(); } catch {}
      }
      const durationMs = Date.now() - startTime;
      return {
        testRunId: options.testRunId,
        scenarioName: options.scenarioName,
        status: 'FAILED',
        durationMs,
        retryCount: 0,
        errorMessage: err.message,
        screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : null
      };
    }
  }

  async executeStepScenario(options: StepScenarioOptions): Promise<ScenarioExecutionResult> {
    const report = await this.stepExecutor.executeScenario({
      testRunId: options.testRunId,
      scenarioName: options.scenarioName,
      steps: options.steps,
      screenshotDir: options.screenshotDir,
      stopOnError: options.stopOnError,
      userAgent: options.userAgent,
      headers: options.headers,
      onStepProgress: options.onStepProgress
    });

    const lastScreenshot = report.stepDetails
      .filter(s => s.screenshotPath)
      .pop()?.screenshotPath || report.failureScreenshotPath || null;

    return {
      testRunId: options.testRunId,
      scenarioName: options.scenarioName,
      status: report.status,
      durationMs: report.durationMs,
      retryCount: 0,
      errorMessage: report.errorMessage || null,
      screenshotPath: lastScreenshot,
      report
    };
  }
}
