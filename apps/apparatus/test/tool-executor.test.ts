import { describe, expect, it } from 'vitest';
import { executeToolStep, sanitizeToolParams } from '../src/tool-executor.js';

describe('Tool Executor', () => {
  it('should sanitize and clamp cluster attack params', () => {
    const params = sanitizeToolParams('cluster.attack', {
      target: 'http://127.0.0.1:8090/echo',
      rate: 99999,
    });

    expect(params.rate).toBe(2000);
    expect(params.target).toBe('http://127.0.0.1:8090/echo');
  });

  it('should reject invalid cluster protocols', () => {
    expect(() => sanitizeToolParams('cluster.attack', {
      target: 'file:///etc/passwd',
      rate: 10,
    })).toThrow('http/https');
  });

  it('should support cancellation for delay actions', async () => {
    const result = await executeToolStep(
      {
        id: 'delay-cancel',
        action: 'delay',
        params: { duration: 500 },
      },
      {
        shouldCancel: () => true,
      }
    );

    expect(result.ok).toBe(false);
    expect(result.message.toLowerCase()).toContain('cancel');
  });
});
