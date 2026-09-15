import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useDebouncedCallback } from "@/lib/admin/use-debounced-callback";

/**
 * Real timing behavior of the autosave debounce primitive (Task 13b) —
 * not just that the hook renders. Mirrors how page-editor.tsx uses it:
 * `watchKey` changes on every keystroke (a JSON.stringify of the live
 * form values), and the callback should fire once, `delayMs` after the
 * *last* change, never once per keystroke.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDebouncedCallback", () => {
  it("fires the callback once, delayMs after watchKey stops changing", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ watchKey }) => useDebouncedCallback({ watchKey, delayMs: 4000, enabled: true, callback }),
      { initialProps: { watchKey: "v1" } },
    );

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ watchKey: "v1" }); // unchanged key must not schedule again on its own
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("restarts the timer on every change instead of firing once per change (real debounce, not throttle)", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ watchKey }) => useDebouncedCallback({ watchKey, delayMs: 4000, enabled: true, callback }),
      { initialProps: { watchKey: "v1" } },
    );

    // Five rapid "keystrokes", each well within the 4s window.
    for (const key of ["v2", "v3", "v4", "v5", "v6"]) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      rerender({ watchKey: key });
    }
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("never schedules while disabled", () => {
    const callback = vi.fn();
    renderHook(() => useDebouncedCallback({ watchKey: "v1", delayMs: 4000, enabled: false, callback }));

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it("always invokes the latest callback closure, not the one captured when the timer was scheduled", () => {
    // Guards the ref-vs-dependency-array choice: page-editor.tsx's callback
    // closes over current form values/state setters, which are a new
    // closure every render — the timer must still call the *latest* one.
    let latestValue = "first";
    const { rerender } = renderHook(
      ({ callback }: { callback: () => void }) =>
        useDebouncedCallback({ watchKey: "same-key", delayMs: 1000, enabled: true, callback }),
      {
        initialProps: {
          callback: () => {
            latestValue = "first";
          },
        },
      },
    );

    rerender({
      callback: () => {
        latestValue = "second";
      },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(latestValue).toBe("second");
  });

  it("cancels the pending timer on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useDebouncedCallback({ watchKey: "v1", delayMs: 1000, enabled: true, callback }),
    );

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(callback).not.toHaveBeenCalled();
  });
});
