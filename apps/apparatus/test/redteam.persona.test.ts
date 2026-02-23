import { describe, expect, it } from 'vitest';
import {
  buildSystemPromptForTests,
  parsePersonaForTests,
  pickPersonaWeightedToolForTests,
} from '../src/ai/redteam.js';

describe('RedTeam Persona Profiles', () => {
  it('normalizes persona input with safe default fallback', () => {
    expect(parsePersonaForTests('apt')).toBe('apt');
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
});
