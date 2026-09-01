import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export type BrowserActionType = 
  | 'GOTO'
  | 'CLICK'
  | 'FILL'
  | 'WAIT'
  | 'ASSERT_TEXT'
  | 'SCREENSHOT';

export interface BrowserStepDefinition {
  id: string;
  action: BrowserActionType;
  name: string;
  url?: string;
  selector?: string;
  value?: string;
  expectedText?: string;
  timeoutMs?: number;
}

export interface StepExecutionDetail {
  stepIndex: number;
  stepId: string;
  name: string;
  action: BrowserActionType;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  errorMessage?: string;
  screenshotPath?: string;
}

export interface ExecuteScenarioOptions {
  testRunId: string;
  scenarioName: string;
  steps: BrowserStepDefinition[];
  screenshotDir?: string;
  stopOnError?: boolean;
  userAgent?: string;
  headers?: Record<string, string>;
  onStepProgress?: (detail: StepExecutionDetail) => void;
}

export interface StepExecutionReport {
  testRunId: string;
  scenarioName: string;
  status: 'PASSED' | 'FAILED';
  totalSteps: number;
  stepsCompleted: number;
  durationMs: number;
  errorMessage?: string;
  failureScreenshotPath?: string;
  stepDetails: StepExecutionDetail[];
}

export class PlaywrightStepExecutor {
  private screenshotDir: string;

  constructor(screenshotDir = './reports/screenshots') {
    this.screenshotDir = screenshotDir;
  }

  async executeScenario(options: ExecuteScenarioOptions): Promise<StepExecutionReport> {
    const startTime = Date.now();
    const screenshotDir = options.screenshotDir || this.screenshotDir;
    const stopOnError = options.stopOnError !== undefined ? options.stopOnError : true;

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const stepDetails: StepExecutionDetail[] = [];
    let scenarioStatus: 'PASSED' | 'FAILED' = 'PASSED';
    let overallErrorMessage: string | undefined;
    let failureScreenshotPath: string | undefined;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: options.userAgent || undefined,
        extraHTTPHeaders: options.headers || undefined
      });

      page = await context.newPage();

      for (let i = 0; i < options.steps.length; i++) {
        const step = options.steps[i];
        const stepStartTime = Date.now();
        let stepStatus: 'PASSED' | 'FAILED' = 'PASSED';
        let stepError: string | undefined;
        let stepScreenshotPath: string | undefined;

        try {
          const timeout = step.timeoutMs || 10000;

          switch (step.action) {
            case 'GOTO': {
              if (!step.url) throw new Error('Action GOTO requires a valid "url" parameter');
              try {
                await page.goto(step.url, { waitUntil: 'networkidle', timeout });
              } catch {
                // Fallback to load state
                await page.waitForLoadState('load', { timeout: 5000 });
              }
              await page.waitForTimeout(400); // hydration buffer
              break;
            }

            case 'CLICK': {
              if (!step.selector) throw new Error('Action CLICK requires a valid "selector" parameter');
              await page.waitForSelector(step.selector, { timeout });
              await page.click(step.selector, { timeout });
              break;
            }

            case 'FILL': {
              if (!step.selector) throw new Error('Action FILL requires a valid "selector" parameter');
              await page.waitForSelector(step.selector, { timeout });
              await page.fill(step.selector, step.value || '', { timeout });
              break;
            }

            case 'WAIT': {
              if (step.selector) {
                await page.waitForSelector(step.selector, { timeout });
              } else if (step.timeoutMs) {
                await page.waitForTimeout(step.timeoutMs);
              } else {
                await page.waitForTimeout(1000);
              }
              break;
            }

            case 'ASSERT_TEXT': {
              if (!step.selector) throw new Error('Action ASSERT_TEXT requires a valid "selector" parameter');
              await page.waitForSelector(step.selector, { timeout });
              const actualText = await page.textContent(step.selector);
              const expected = step.expectedText || '';
              if (!actualText || !actualText.includes(expected)) {
                throw new Error(`Assertion failed on selector "${step.selector}": Expected text containing "${expected}", got "${actualText?.trim() || ''}"`);
              }
              break;
            }

            case 'SCREENSHOT': {
              const sanitizedName = step.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
              const filename = `step-${options.testRunId}-${i + 1}-${sanitizedName}.png`;
              const filePath = path.join(screenshotDir, filename);
              await page.screenshot({ path: filePath, fullPage: false });
              stepScreenshotPath = filePath;
              break;
            }

            default:
              throw new Error(`Unsupported step action: ${(step as any).action}`);
          }
        } catch (err: any) {
          stepStatus = 'FAILED';
          stepError = err.message || String(err);
          scenarioStatus = 'FAILED';
          overallErrorMessage = `Step ${i + 1} (${step.name}) failed: ${stepError}`;

          // Capture on-failure screenshot
          try {
            const failFilename = `fail-${options.testRunId}-step-${i + 1}.png`;
            const failPath = path.join(screenshotDir, failFilename);
            await page.screenshot({ path: failPath, fullPage: false });
            failureScreenshotPath = failPath;
            stepScreenshotPath = failPath;
          } catch {
            // ignore screenshot failure
          }
        }

        const stepDetail: StepExecutionDetail = {
          stepIndex: i + 1,
          stepId: step.id,
          name: step.name,
          action: step.action,
          status: stepStatus,
          durationMs: Date.now() - stepStartTime,
          errorMessage: stepError,
          screenshotPath: stepScreenshotPath
        };

        stepDetails.push(stepDetail);

        if (options.onStepProgress) {
          options.onStepProgress(stepDetail);
        }

        if (stepStatus === 'FAILED' && stopOnError) {
          break;
        }
      }
    } catch (globalErr: any) {
      scenarioStatus = 'FAILED';
      overallErrorMessage = globalErr.message || String(globalErr);
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }

    const durationMs = Date.now() - startTime;
    const stepsCompleted = stepDetails.filter(s => s.status === 'PASSED').length;

    return {
      testRunId: options.testRunId,
      scenarioName: options.scenarioName,
      status: scenarioStatus,
      totalSteps: options.steps.length,
      stepsCompleted,
      durationMs,
      errorMessage: overallErrorMessage,
      failureScreenshotPath,
      stepDetails
    };
  }
}
