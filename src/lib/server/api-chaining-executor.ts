export interface ApiStepDefinition {
  id: string;
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  extractVars?: Record<string, string>; // e.g. { "authToken": "token", "userId": "data.user.id" }
  assertStatus?: number;
  assertJsonPath?: {
    path: string;
    expected: any;
  };
  timeoutMs?: number;
}

export interface ApiStepExecutionDetail {
  stepIndex: number;
  stepId: string;
  name: string;
  method: string;
  url: string;
  statusCode?: number;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  errorMessage?: string;
  extractedVars?: Record<string, any>;
  responseBody?: any;
}

export interface ExecuteChainOptions {
  testRunId: string;
  chainName: string;
  steps: ApiStepDefinition[];
  initialContext?: Record<string, any>;
  stopOnError?: boolean;
  onStepProgress?: (detail: ApiStepExecutionDetail) => void;
  abortSignal?: AbortSignal;
}

export interface ApiChainingReport {
  testRunId: string;
  chainName: string;
  status: 'PASSED' | 'FAILED';
  totalSteps: number;
  stepsCompleted: number;
  durationMs: number;
  extractedContext: Record<string, any>;
  errorMessage?: string;
  stepDetails: ApiStepExecutionDetail[];
}

function resolvePath(obj: any, pathStr: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const cleanPath = pathStr.startsWith('body.') ? pathStr.slice(5) : pathStr;
  const parts = cleanPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function interpolate(template: string, context: Record<string, any>): string {
  if (!template) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    return context[key] !== undefined ? String(context[key]) : match;
  });
}

export class ApiChainingExecutor {
  async executeChain(options: ExecuteChainOptions): Promise<ApiChainingReport> {
    const startTime = Date.now();
    const context: Record<string, any> = { ...(options.initialContext || {}) };
    const stopOnError = options.stopOnError !== undefined ? options.stopOnError : true;
    const stepDetails: ApiStepExecutionDetail[] = [];

    let overallStatus: 'PASSED' | 'FAILED' = 'PASSED';
    let overallErrorMessage: string | undefined;

    for (let i = 0; i < options.steps.length; i++) {
      if (options.abortSignal?.aborted) {
        overallStatus = 'FAILED';
        overallErrorMessage = 'Chain aborted by signal';
        break;
      }

      const step = options.steps[i];
      const stepStartTime = Date.now();
      const method = (step.method || 'GET').toUpperCase();

      // Interpolate URL
      const finalUrl = interpolate(step.url, context);

      // Interpolate Headers
      const finalHeaders: Record<string, string> = {};
      if (step.headers) {
        for (const [k, v] of Object.entries(step.headers)) {
          finalHeaders[k] = interpolate(v, context);
        }
      }

      // Interpolate Body
      const finalBody = step.body ? interpolate(step.body, context) : undefined;

      let stepStatus: 'PASSED' | 'FAILED' = 'PASSED';
      let stepError: string | undefined;
      let statusCode: number | undefined;
      let responseData: any = null;
      const extractedThisStep: Record<string, any> = {};

      try {
        const timeoutMs = step.timeoutMs || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (options.abortSignal) {
          options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        const res = await fetch(finalUrl, {
          method,
          headers: finalHeaders,
          body: ['GET', 'HEAD'].includes(method) ? undefined : finalBody,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        statusCode = res.status;

        // Parse Response
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            responseData = await res.json();
          } catch {
            responseData = await res.text();
          }
        } else {
          responseData = await res.text();
        }

        // 1. Status Code Assertion
        if (step.assertStatus !== undefined && step.assertStatus !== statusCode) {
          throw new Error(`Status assertion failed: Expected ${step.assertStatus}, got ${statusCode}`);
        }

        // 2. JSON Path Assertion
        if (step.assertJsonPath && typeof responseData === 'object') {
          const actualValue = resolvePath(responseData, step.assertJsonPath.path);
          if (actualValue !== step.assertJsonPath.expected) {
            throw new Error(`JSON Path assertion failed on "${step.assertJsonPath.path}": Expected "${step.assertJsonPath.expected}", got "${actualValue}"`);
          }
        }

        // 3. Variable Extraction
        if (step.extractVars && typeof responseData === 'object') {
          for (const [varName, pathStr] of Object.entries(step.extractVars)) {
            const extractedVal = resolvePath(responseData, pathStr);
            if (extractedVal !== undefined) {
              context[varName] = extractedVal;
              extractedThisStep[varName] = extractedVal;
            }
          }
        }
      } catch (err: any) {
        stepStatus = 'FAILED';
        stepError = err.message || String(err);
        overallStatus = 'FAILED';
        overallErrorMessage = `Step ${i + 1} (${step.name}) failed: ${stepError}`;
      }

      const detail: ApiStepExecutionDetail = {
        stepIndex: i + 1,
        stepId: step.id,
        name: step.name,
        method,
        url: finalUrl,
        statusCode,
        status: stepStatus,
        durationMs: Date.now() - stepStartTime,
        errorMessage: stepError,
        extractedVars: Object.keys(extractedThisStep).length > 0 ? extractedThisStep : undefined,
        responseBody: typeof responseData === 'object' ? responseData : undefined
      };

      stepDetails.push(detail);

      if (options.onStepProgress) {
        options.onStepProgress(detail);
      }

      if (stepStatus === 'FAILED' && stopOnError) {
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    const stepsCompleted = stepDetails.filter(s => s.status === 'PASSED').length;

    return {
      testRunId: options.testRunId,
      chainName: options.chainName,
      status: overallStatus,
      totalSteps: options.steps.length,
      stepsCompleted,
      durationMs,
      extractedContext: context,
      errorMessage: overallErrorMessage,
      stepDetails
    };
  }
}
