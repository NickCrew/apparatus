import { describe, expect, it } from 'vitest';
import { sanitizeDecisionForTests } from '../src/ai/redteam.js';

describe('RedTeam Decision Sanitization', () => {
  it('should force cluster attack targets to same-origin safe paths', () => {
    const decision = sanitizeDecisionForTests(
      {
        thought: 'attack it',
        reason: 'test',
        tool: 'cluster.attack',
        params: { target: 'https://example.com/evil', rate: 9999 },
      },
      {
        allowedTools: ['cluster.attack', 'delay'],
        baseUrl: 'http://127.0.0.1:8090',
        objective: 'Find break on /checkout',
      }
    );

    expect(decision.tool).toBe('cluster.attack');
    expect(decision.params.target).toBe('http://127.0.0.1:8090/checkout');
    expect(decision.params.rate).toBe(2000);
  });

  it('should block dangerous internal paths even on same origin', () => {
    const decision = sanitizeDecisionForTests(
      {
        thought: 'attack control plane',
        reason: 'test',
        tool: 'cluster.attack',
        params: { target: 'http://127.0.0.1:8090/api/redteam/autopilot/start', rate: 100 },
      },
      {
        allowedTools: ['cluster.attack', 'delay'],
        baseUrl: 'http://127.0.0.1:8090',
        objective: 'Find break on /checkout',
      }
    );

    expect(decision.params.target).toBe('http://127.0.0.1:8090/checkout');
  });

  it('should downgrade disallowed tools to delay', () => {
    const decision = sanitizeDecisionForTests(
      {
        thought: 'crash now',
        reason: 'test',
        tool: 'chaos.crash',
        params: { delayMs: 10 },
      },
      {
        allowedTools: ['delay'],
        baseUrl: 'http://127.0.0.1:8090',
        objective: 'Find break',
      }
    );

    expect(decision.tool).toBe('delay');
    expect(decision.params.duration).toBe(1000);
  });
});
