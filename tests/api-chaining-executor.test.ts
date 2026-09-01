import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { 
  ApiChainingExecutor, 
  type ApiStepDefinition,
  type ApiChainingReport
} from '../src/lib/server/api-chaining-executor.js';

describe('ApiChainingExecutor (TDD-008)', () => {
  let mockServer: http.Server;
  let serverUrl: string;

  beforeEach(async () => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        if (req.url === '/auth/login' && req.method === 'POST') {
          const parsed = JSON.parse(body || '{}');
          if (parsed.username === 'admin' && parsed.password === 'secret') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token: 'jwt_token_secret_123', userId: 99 }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
          }
        } else if (req.url === '/api/profile' && req.method === 'GET') {
          const auth = req.headers['authorization'];
          if (auth === 'Bearer jwt_token_secret_123') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: 99, role: 'admin', balance: 5000 }));
          } else {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
          }
        } else if (req.url === '/api/orders' && req.method === 'POST') {
          const auth = req.headers['authorization'];
          const parsed = JSON.parse(body || '{}');
          if (auth === 'Bearer jwt_token_secret_123' && parsed.userId === '99') {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ orderId: 'ord_7788', status: 'created' }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bad Request' }));
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      });
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

  it('should execute a 3-step REST API chaining flow with token extraction and variable interpolation', async () => {
    const executor = new ApiChainingExecutor();
    const steps: ApiStepDefinition[] = [
      {
        id: 'step-login',
        name: 'POST Login & Extract Token',
        url: `${serverUrl}/auth/login`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'secret' }),
        extractVars: { authToken: 'token', targetUserId: 'userId' },
        assertStatus: 200
      },
      {
        id: 'step-profile',
        name: 'GET Profile with Bearer Token',
        url: `${serverUrl}/api/profile`,
        method: 'GET',
        headers: { 'Authorization': 'Bearer {{authToken}}' },
        assertStatus: 200,
        assertJsonPath: { path: 'role', expected: 'admin' }
      },
      {
        id: 'step-order',
        name: 'POST Create Order with Injected UserID',
        url: `${serverUrl}/api/orders`,
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer {{authToken}}',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: '{{targetUserId}}', item: 'Server Licence' }),
        assertStatus: 201,
        assertJsonPath: { path: 'status', expected: 'created' }
      }
    ];

    const report: ApiChainingReport = await executor.executeChain({
      testRunId: 'api-chain-001',
      chainName: 'Complete Auth & Checkout Flow',
      steps
    });

    expect(report.status).toBe('PASSED');
    expect(report.totalSteps).toBe(3);
    expect(report.stepsCompleted).toBe(3);
    expect(report.extractedContext.authToken).toBe('jwt_token_secret_123');
    expect(report.extractedContext.targetUserId).toBe(99);
    expect(report.stepDetails.length).toBe(3);
    expect(report.stepDetails[0].statusCode).toBe(200);
    expect(report.stepDetails[1].statusCode).toBe(200);
    expect(report.stepDetails[2].statusCode).toBe(201);
  });

  it('should fail and stop when an assertion or status check fails in the chain', async () => {
    const executor = new ApiChainingExecutor();
    const steps: ApiStepDefinition[] = [
      {
        id: 'step-login-fail',
        name: 'POST Login with Bad Password',
        url: `${serverUrl}/auth/login`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'wrong_password' }),
        assertStatus: 200 // expects 200, will get 401
      },
      {
        id: 'step-never-reached',
        name: 'Should Not Run',
        url: `${serverUrl}/api/profile`,
        method: 'GET'
      }
    ];

    const report = await executor.executeChain({
      testRunId: 'api-chain-fail',
      chainName: 'Failing Auth Chain',
      steps,
      stopOnError: true
    });

    expect(report.status).toBe('FAILED');
    expect(report.stepsCompleted).toBe(0);
    expect(report.stepDetails.length).toBe(1);
    expect(report.stepDetails[0].statusCode).toBe(401);
    expect(report.errorMessage).toContain('Status assertion failed: Expected 200, got 401');
  });
});
