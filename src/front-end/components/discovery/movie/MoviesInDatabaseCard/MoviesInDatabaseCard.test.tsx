import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoviesInDatabaseCard } from './MoviesInDatabaseCard';

const mocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useState: vi.fn(),
  fetchCatalogSummary: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: mocks.useEffect,
    useState: mocks.useState,
  };
});

vi.mock('../../../../services/catalog-summary', () => ({
  fetchCatalogSummary: mocks.fetchCatalogSummary,
}));

describe('MoviesInDatabaseCard', () => {
  let effectCallback: (() => void | (() => void)) | undefined;

  beforeEach(() => {
    effectCallback = undefined;
    mocks.useEffect.mockImplementation(
      (callback: () => void | (() => void)) => {
        effectCallback = callback;
      },
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('starts in the loading state and registers an effect with no dependencies', () => {
    const setState = vi.fn();
    mocks.useState.mockReturnValue([{ status: 'loading' }, setState]);

    const element = MoviesInDatabaseCard();

    expect(element.props.state).toEqual({ status: 'loading' });
    expect(mocks.useState).toHaveBeenCalledWith({ status: 'loading' });
    expect(mocks.useEffect).toHaveBeenCalledOnce();
    expect(mocks.useEffect).toHaveBeenCalledWith(expect.any(Function), []);
  });

  it('updates to the success state when the catalog summary loads', async () => {
    const data = { movieCount: 1234, years: [2024, 2020, 2022] };
    const setState = vi.fn();
    mocks.useState.mockReturnValue([{ status: 'loading' }, setState]);
    mocks.fetchCatalogSummary.mockResolvedValue(data);

    MoviesInDatabaseCard();
    effectCallback?.();

    await vi.waitFor(() => {
      expect(setState).toHaveBeenCalledWith({ status: 'success', data });
    });
    expect(mocks.fetchCatalogSummary).toHaveBeenCalledOnce();
  });

  it('logs fetch failures and updates to the error state', async () => {
    const error = new Error('Request failed');
    const setState = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mocks.useState.mockReturnValue([{ status: 'loading' }, setState]);
    mocks.fetchCatalogSummary.mockRejectedValue(error);

    MoviesInDatabaseCard();
    effectCallback?.();

    await vi.waitFor(() => {
      expect(setState).toHaveBeenCalledWith({
        status: 'error',
        message: 'Chargement impossible.',
      });
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Impossible de charger les informations du catalogue :',
      error,
    );
  });

  it('does not update state if the request resolves after cleanup', async () => {
    const data = { movieCount: 10, years: [2024] };
    const setState = vi.fn();
    let resolveFetch!: (value: typeof data) => void;
    const pendingFetch = new Promise<typeof data>((resolve) => {
      resolveFetch = resolve;
    });
    mocks.useState.mockReturnValue([{ status: 'loading' }, setState]);
    mocks.fetchCatalogSummary.mockReturnValue(pendingFetch);

    MoviesInDatabaseCard();
    const cleanup = effectCallback?.();
    expect(typeof cleanup).toBe('function');
    if (typeof cleanup === 'function') cleanup();

    resolveFetch(data);
    await pendingFetch;
    await Promise.resolve();

    expect(setState).not.toHaveBeenCalled();
  });

  it('ignores fetch failures that arrive after cleanup', async () => {
    const error = new Error('Request failed after cleanup');
    const setState = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    let rejectFetch!: (reason: Error) => void;
    const pendingFetch = new Promise<never>((_resolve, reject) => {
      rejectFetch = reject;
    });
    mocks.useState.mockReturnValue([{ status: 'loading' }, setState]);
    mocks.fetchCatalogSummary.mockReturnValue(pendingFetch);

    MoviesInDatabaseCard();
    const cleanup = effectCallback?.();
    expect(typeof cleanup).toBe('function');
    if (typeof cleanup === 'function') cleanup();

    rejectFetch(error);
    await pendingFetch.catch(() => undefined);

    expect(setState).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
