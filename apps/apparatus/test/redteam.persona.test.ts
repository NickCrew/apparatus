import { describe, expect, it } from 'vitest';
import {
  applyPersonaBiasForTests,
  buildSystemPromptForTests,
  parsePersonaForTests,
  pickPersonaWeightedToolForTests,
  sanitizePromptFragmentForTests,
  sanitizeDecisionForTests,
  selectPolicyDecisionForTests,
} from '../src/ai/redteam.js';

describe('RedTeam Persona Profiles', () => {
  it('normalizes persona input with safe default fallback', () => {
    expect(parsePersonaForTests('apt')).toBe('apt');
    expect(parsePersonaForTests('APT')).toBe('apt');
    expect(parsePersonaForTests('  researcher  ')).toBe('researcher');
    expect(parsePersonaForTests('invalid-persona')).toBe('script_kiddie');
    expect(parsePersonaForTests(undefined)).toBe('script_kiddie');
  });

  it('injects persona directives into planner system prompt', () => {
    const prompt = buildSystemPromptForTests({
      persona: 'apt',
      allowedTools: ['delay', 'mtd.rotate'],
    });

    expect(prompt).toContain('Active persona: APT (apt).');
    expect(prompt).toContain('Persona directive: Prioritize stealth and persistence over immediate disruption.');
    expect(prompt).toContain("tool must be one of allowed tools or 'none'.");
  });

  it('sanitizes prompt fragments by stripping control/bidi chars and truncating length', () => {
    const raw = `  APT\u0000\u0007\u202E stealth\u200B per\u{E0001}sona   `;
    const sanitized = sanitizePromptFragmentForTests(raw, 16);
    expect(sanitized).toBe('APT stealth pers');

    expect(sanitizePromptFragmentForTests(undefined, 10)).toBe('');
    expect(sanitizePromptFragmentForTests('x'.repeat(50), 8)).toBe('xxxxxxxx');
  });

  it('keeps sanitizeDecisionForTests callable with explicit context', () => {
    const decision = sanitizeDecisionForTests({
      thought: 'test sanitize',
      reason: 'coverage',
      tool: 'cluster.attack',
      params: { target: 'https://example.com/not-allowed', rate: 9000 },
    }, {
      allowedTools: ['cluster.attack', 'delay'],
      baseUrl: 'http://127.0.0.1:8090',
      objective: 'Find break on /checkout',
      persona: 'apt',
    });

    expect(decision.tool).toBe('cluster.attack');
    expect(decision.params.target).toBe('http://127.0.0.1:8090/checkout');
    expect(decision.params.rate).toBe(2000);
  });

  it('applies deterministic tool weighting differences across personas', () => {
    const allowedTools = ['cluster.attack', 'delay', 'mtd.rotate'] as const;
    let scriptKiddieMtdSelections = 0;
    let aptMtdSelections = 0;

    for (let iteration = 1; iteration <= 100; iteration += 1) {
      const scriptTool = pickPersonaWeightedToolForTests({
        allowedTools: [...allowedTools],
        persona: 'script_kiddie',
        iteration,
        sessionId: 'persona-seed',
      });
      const aptTool = pickPersonaWeightedToolForTests({
        allowedTools: [...allowedTools],
        persona: 'apt',
        iteration,
        sessionId: 'persona-seed',
      });

      expect(allowedTools).toContain(scriptTool as (typeof allowedTools)[number]);
      expect(allowedTools).toContain(aptTool as (typeof allowedTools)[number]);
      if (scriptTool === 'mtd.rotate') scriptKiddieMtdSelections += 1;
      if (aptTool === 'mtd.rotate') aptMtdSelections += 1;
    }

    expect(aptMtdSelections).toBeGreaterThan(scriptKiddieMtdSelections);
  });

  it('returns none for weighted selection when no tools are allowed', () => {
    const selected = pickPersonaWeightedToolForTests({
      allowedTools: [],
      persona: 'apt',
      iteration: 1,
      sessionId: 'persona-seed',
    });

    expect(selected).toBe('none');
  });

  it('resets params when persona bias pivots to a different tool', () => {
    let pivotedDecision: ReturnType<typeof applyPersonaBiasForTests> | null = null;

    for (let iteration = 1; iteration <= 300; iteration += 1) {
      const decision = applyPersonaBiasForTests({
        candidate: {
          thought: 'Try direct pressure',
          reason: 'first attempt',
          tool: 'cluster.attack',
          params: { target: 'http://127.0.0.1:8090/checkout', rate: 777 },
        },
        allowedTools: ['cluster.attack', 'delay'],
        baseUrl: 'http://127.0.0.1:8090',
        objective: 'Find break on /checkout',
        iteration,
        persona: 'researcher',
        sessionId: 'persona-param-pivot-seed',
      });

      if (decision.tool === 'delay') {
        pivotedDecision = decision;
        break;
      }
    }

    expect(pivotedDecision).not.toBeNull();
    expect(pivotedDecision?.tool).toBe('delay');
    expect(pivotedDecision?.params).toEqual({ duration: 1000 });
  });

  it('does not override explicit no-op decisions', () => {
    const decision = applyPersonaBiasForTests({
      candidate: {
        thought: 'pause',
        reason: 'none selected',
        tool: 'none',
        params: {},
      },
      allowedTools: ['cluster.attack', 'delay'],
      baseUrl: 'http://127.0.0.1:8090',
      objective: 'Find break on /checkout',
      iteration: 42,
      persona: 'apt',
      sessionId: 'none-seed',
    });

    expect(decision.tool).toBe('none');
    expect(decision.params).toEqual({});
  });

  it('keeps policy maneuvers persona-agnostic for identical defense signals', () => {
    const feedback = {
      capturedAt: new Date().toISOString(),
      targetPath: '/checkout',
      statusCode: 429,
      signal: 'rate_limited' as const,
      reason: 'rate limit',
      basedOnTool: 'cluster.attack' as const,
      toolFailed: false,
    };

    const aptDecision = selectPolicyDecisionForTests({
      recentDefenseFeedback: feedback,
      iteration: 5,
      context: {
        allowedTools: ['delay', 'cluster.attack'],
        baseUrl: 'http://127.0.0.1:8090',
        objective: 'Find break on /checkout',
        persona: 'apt',
      },
    });

    const scriptKiddieDecision = selectPolicyDecisionForTests({
      recentDefenseFeedback: feedback,
      iteration: 5,
      context: {
        allowedTools: ['delay', 'cluster.attack'],
        baseUrl: 'http://127.0.0.1:8090',
        objective: 'Find break on /checkout',
        persona: 'script_kiddie',
      },
    });

    expect(aptDecision).not.toBeNull();
    expect(scriptKiddieDecision).not.toBeNull();
    expect(aptDecision?.tool).toBe('delay');
    expect(scriptKiddieDecision?.tool).toBe('delay');
    expect(aptDecision?.params).toEqual(scriptKiddieDecision?.params);
    expect(aptDecision?.maneuver).toEqual(scriptKiddieDecision?.maneuver);
  });
});
