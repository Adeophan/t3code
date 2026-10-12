import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  cancelDeferredThreadRename,
  canStartThreadRename,
  deferThreadRename,
  dropStaleDeferredThreadRename,
  flushDeferredThreadRename,
  requestThreadRename,
  subscribeThreadRename,
} from "./threadRenameActionBus";

const threadA = scopeThreadRef(EnvironmentId.make("environment:a"), ThreadId.make("thread-a"));
const threadB = scopeThreadRef(EnvironmentId.make("environment:a"), ThreadId.make("thread-b"));
const threadAElsewhere = scopeThreadRef(
  EnvironmentId.make("environment:b"),
  ThreadId.make("thread-a"),
);

describe("canStartThreadRename", () => {
  const available = {
    isServerThread: true,
    canOperate: true,
    rightPanelMaximized: false,
    rightPanelSheetLayout: false,
  };

  it("requires a server thread the user can operate", () => {
    expect(canStartThreadRename(available)).toBe(true);
    expect(canStartThreadRename({ ...available, isServerThread: false })).toBe(false);
    expect(canStartThreadRename({ ...available, canOperate: false })).toBe(false);
  });

  it("is unavailable while a maximized right panel hides the header", () => {
    expect(canStartThreadRename({ ...available, rightPanelMaximized: true })).toBe(false);
  });

  it("ignores the maximized flag in the sheet layout, where the header stays visible", () => {
    expect(
      canStartThreadRename({
        ...available,
        rightPanelMaximized: true,
        rightPanelSheetLayout: true,
      }),
    ).toBe(true);
  });
});

describe("thread rename requests", () => {
  beforeEach(() => {
    vi.stubGlobal("window", new EventTarget());
  });

  afterEach(() => {
    cancelDeferredThreadRename();
    vi.unstubAllGlobals();
  });

  it("only reaches the subscriber for the requested thread", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeThreadRename(threadA, listener);

    requestThreadRename(threadB);
    requestThreadRename(threadAElsewhere);
    expect(listener).not.toHaveBeenCalled();

    requestThreadRename(threadA);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    requestThreadRename(threadA);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("sends a deferred request once, when flushed", () => {
    const listener = vi.fn();
    subscribeThreadRename(threadA, listener);

    deferThreadRename(threadA);
    expect(listener).not.toHaveBeenCalled();

    flushDeferredThreadRename();
    flushDeferredThreadRename();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("drops a deferred request when the active thread changed before the flush", () => {
    const listenerA = vi.fn();
    const unsubscribeA = subscribeThreadRename(threadA, listenerA);
    deferThreadRename(threadA);

    unsubscribeA();
    const listenerB = vi.fn();
    subscribeThreadRename(threadB, listenerB);
    flushDeferredThreadRename();

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).not.toHaveBeenCalled();
  });

  it("keeps a deferred request while its thread stays routed", () => {
    const listener = vi.fn();
    subscribeThreadRename(threadA, listener);

    deferThreadRename(threadA);
    dropStaleDeferredThreadRename(scopeThreadRef(threadA.environmentId, threadA.threadId));
    flushDeferredThreadRename();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("drops a deferred request after navigating away, even if the user returns", () => {
    const listener = vi.fn();
    subscribeThreadRename(threadA, listener);

    deferThreadRename(threadA);
    dropStaleDeferredThreadRename(threadB);
    dropStaleDeferredThreadRename(threadA);
    flushDeferredThreadRename();

    deferThreadRename(threadA);
    dropStaleDeferredThreadRename(null);
    dropStaleDeferredThreadRename(threadA);
    flushDeferredThreadRename();

    expect(listener).not.toHaveBeenCalled();
  });

  it("drops a cancelled deferred request", () => {
    const listener = vi.fn();
    subscribeThreadRename(threadA, listener);

    deferThreadRename(threadA);
    cancelDeferredThreadRename();
    flushDeferredThreadRename();

    expect(listener).not.toHaveBeenCalled();
  });
});
