// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HelpSearchModal } from './HelpSearchModal';

const openDoc = vi.fn();
const trackSearch = vi.fn();

vi.mock('../../providers/DocViewerProvider', () => ({
  useDocViewer: () => ({ openDoc }),
}));

vi.mock('../../hooks/useSearchAnalytics', () => ({
  useSearchAnalytics: () => ({ trackSearch }),
}));

vi.mock('../../utils/docSearch', () => ({
  searchDocs: vi.fn().mockResolvedValue([]),
}));

describe('HelpSearchModal keyboard shortcuts', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('opens on Cmd+/ (Slash key)', () => {
    const onOpenChange = vi.fn();
    render(<HelpSearchModal open={false} onOpenChange={onOpenChange} />);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('opens on Ctrl+? as well', () => {
    const onOpenChange = vi.fn();
    render(<HelpSearchModal open={false} onOpenChange={onOpenChange} />);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '?',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
