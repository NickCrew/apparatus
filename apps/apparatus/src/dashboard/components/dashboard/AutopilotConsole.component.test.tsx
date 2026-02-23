// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutopilotConsole } from './AutopilotConsole';

const mockStart = vi.fn<(payload: any) => Promise<void>>(async () => undefined);
const mockStop = vi.fn(async () => undefined);
const mockKill = vi.fn(async () => undefined);
const mockFetchStatus = vi.fn(async () => undefined);

let mockSession: any = null;
let mockLatestReport: any = null;
let mockActive = false;
let mockIsLoading = false;
let mockError: string | null = null;
let mockConfig: any = {
  personas: [
    {
      id: 'script_kiddie',
      label: 'Script Kiddie',
      description: 'Noisy and fast with low stealth discipline.',
      tags: ['LOW_STEALTH', 'HIGH_NOISE', 'FAST_LOOP'],
    },
    {
      id: 'apt',
      label: 'APT',
      description: 'Stealth-oriented and adaptive with evasive posture.',
      tags: ['HIGH_STEALTH', 'ADAPTIVE', 'PERSISTENT'],
    },
  ],
  defaultPersona: 'script_kiddie',
};

vi.mock('../../hooks/useAutopilot', () => ({
  useAutopilot: () => ({
    session: mockSession,
    latestReport: mockLatestReport,
    active: mockActive,
    isLoading: mockIsLoading,
    error: mockError,
    config: mockConfig,
    fetchStatus: mockFetchStatus,
    start: mockStart,
    stop: mockStop,
    kill: mockKill,
  }),
}));

describe('AutopilotConsole component', () => {
  beforeEach(() => {
    mockSession = null;
    mockLatestReport = null;
    mockActive = false;
    mockIsLoading = false;
    mockError = null;
    mockConfig = {
      personas: [
        {
          id: 'script_kiddie',
          label: 'Script Kiddie',
          description: 'Noisy and fast with low stealth discipline.',
          tags: ['LOW_STEALTH', 'HIGH_NOISE', 'FAST_LOOP'],
        },
        {
          id: 'apt',
          label: 'APT',
          description: 'Stealth-oriented and adaptive with evasive posture.',
          tags: ['HIGH_STEALTH', 'ADAPTIVE', 'PERSISTENT'],
        },
      ],
      defaultPersona: 'script_kiddie',
    };
    mockStart.mockClear();
    mockStop.mockClear();
    mockKill.mockClear();
    mockFetchStatus.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('disables engage when objective is blank and enables it when objective is present', () => {
    render(<AutopilotConsole />);

    const objectiveInput = screen.getByPlaceholderText('Find the breaking point of the /checkout API');
    const engageButton = screen.getByRole('button', { name: /engage autopilot/i });

    fireEvent.change(objectiveInput, { target: { value: '   ' } });
    expect((engageButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(objectiveInput, { target: { value: 'Find break on /ratelimit' } });
    expect((engageButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('enforces forbidCrash safety interlock and strips chaos.crash from start payload', async () => {
    render(<AutopilotConsole />);

    const forbidCrashCheckbox = screen.getByLabelText(/forbid crash tool/i) as HTMLInputElement;
    const crashCheckbox = screen.getByLabelText(/crash process/i) as HTMLInputElement;
    const engageButton = screen.getByRole('button', { name: /engage autopilot/i });

    fireEvent.click(forbidCrashCheckbox);
    expect(forbidCrashCheckbox.checked).toBe(false);

    fireEvent.click(crashCheckbox);
    expect(crashCheckbox.checked).toBe(true);

    fireEvent.click(forbidCrashCheckbox);
    expect(forbidCrashCheckbox.checked).toBe(true);
    expect(crashCheckbox.disabled).toBe(true);
    expect(crashCheckbox.checked).toBe(false);

    fireEvent.click(engageButton);
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    const payload = mockStart.mock.calls.at(-1)?.[0] as any;
    expect(payload).toBeTruthy();
    expect(payload.scope.forbidCrash).toBe(true);
    expect(payload.scope.allowedTools).not.toContain('chaos.crash');
    expect(payload.persona).toBe('script_kiddie');
  });

  it('keeps kill switch enabled, disables engage when active, and wires soft stop state', () => {
    mockActive = true;
    render(<AutopilotConsole />);

    const engageButton = screen.getByRole('button', { name: /engage autopilot/i }) as HTMLButtonElement;
    const softStopButton = screen.getByRole('button', { name: /soft stop/i }) as HTMLButtonElement;
    const killButton = screen.getByRole('button', { name: /kill switch/i }) as HTMLButtonElement;

    expect(engageButton.disabled).toBe(true);
    expect(softStopButton.disabled).toBe(false);
    expect(killButton.disabled).toBe(false);

    fireEvent.click(softStopButton);
    fireEvent.click(killButton);
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockKill).toHaveBeenCalledTimes(1);
  });

  it('sends objective and clamped mission values in start payload', async () => {
    render(<AutopilotConsole />);

    const objectiveInput = screen.getByPlaceholderText('Find the breaking point of the /checkout API');
    const maxIterationsInput = screen.getByDisplayValue('12');
    const intervalInput = screen.getByDisplayValue('1500');
    const engageButton = screen.getByRole('button', { name: /engage autopilot/i });

    fireEvent.change(objectiveInput, { target: { value: 'Find break on /ratelimit' } });
    fireEvent.change(maxIterationsInput, { target: { value: '999' } });
    fireEvent.change(intervalInput, { target: { value: '-100' } });
    fireEvent.click(engageButton);

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    const payload = mockStart.mock.calls.at(-1)?.[0] as any;
    expect(payload.objective).toBe('Find break on /ratelimit');
    expect(payload.maxIterations).toBe(30);
    expect(payload.intervalMs).toBe(0);
    expect(payload.persona).toBe('script_kiddie');
  });

  it('allows selecting persona and sends selected persona in start payload', async () => {
    render(<AutopilotConsole />);

    const personaSelect = screen.getByLabelText(/persona/i);
    const engageButton = screen.getByRole('button', { name: /engage autopilot/i });
    fireEvent.change(personaSelect, { target: { value: 'apt' } });
    fireEvent.click(engageButton);

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    const payload = mockStart.mock.calls.at(-1)?.[0] as any;
    expect(payload.persona).toBe('apt');
    expect(screen.getByText('HIGH_STEALTH')).toBeTruthy();
  });
});
