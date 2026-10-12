import type { ScopedThreadRef } from "@t3tools/contracts";

const THREAD_RENAME_START_EVENT = "t3:thread-rename-start";

/**
 * Whether the active thread's title can be renamed in place: it must be a server thread the
 * user can operate, with its header visible. A maximized right panel hides the chat column,
 * except in the narrow layout where the panel is a sheet and cannot maximize.
 */
export function canStartThreadRename(input: {
  readonly isServerThread: boolean;
  readonly canOperate: boolean;
  readonly rightPanelMaximized: boolean;
  readonly rightPanelSheetLayout: boolean;
}): boolean {
  return (
    input.isServerThread &&
    input.canOperate &&
    (!input.rightPanelMaximized || input.rightPanelSheetLayout)
  );
}

function isSameThread(left: ScopedThreadRef, right: ScopedThreadRef): boolean {
  return left.environmentId === right.environmentId && left.threadId === right.threadId;
}

export function requestThreadRename(target: ScopedThreadRef): void {
  window.dispatchEvent(new CustomEvent(THREAD_RENAME_START_EVENT, { detail: target }));
}

/** Calls the listener only for requests that target `threadRef`. */
export function subscribeThreadRename(
  threadRef: ScopedThreadRef,
  listener: () => void,
): () => void {
  const handler = (event: Event) => {
    if (isSameThread((event as CustomEvent<ScopedThreadRef>).detail, threadRef)) listener();
  };
  window.addEventListener(THREAD_RENAME_START_EVENT, handler);
  return () => window.removeEventListener(THREAD_RENAME_START_EVENT, handler);
}

// The command palette restores focus to the composer as it finishes closing, which would
// blur the rename field at once. Its rename action parks the request here instead, and the
// palette sends it after that restore.
let deferredRenameTarget: ScopedThreadRef | null = null;

export function deferThreadRename(target: ScopedThreadRef): void {
  deferredRenameTarget = target;
}

export function cancelDeferredThreadRename(): void {
  deferredRenameTarget = null;
}

/** Drops a parked request once the routed thread is no longer its target, even if it returns. */
export function dropStaleDeferredThreadRename(activeThread: ScopedThreadRef | null): void {
  if (
    deferredRenameTarget !== null &&
    (activeThread === null || !isSameThread(deferredRenameTarget, activeThread))
  ) {
    deferredRenameTarget = null;
  }
}

export function flushDeferredThreadRename(): void {
  const target = deferredRenameTarget;
  deferredRenameTarget = null;
  if (target) requestThreadRename(target);
}
