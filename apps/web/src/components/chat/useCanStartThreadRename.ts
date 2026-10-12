import { AuthOrchestrationOperateScope, type ScopedThreadRef } from "@t3tools/contracts";
import { useMediaQuery } from "~/hooks/useMediaQuery";
import { RIGHT_PANEL_INLINE_LAYOUT_MEDIA_QUERY } from "~/rightPanelLayout";
import { selectThreadRightPanelState, useRightPanelStore } from "~/rightPanelStore";
import { useEnvironmentScope } from "~/state/session";
import { canStartThreadRename } from "./threadRenameActionBus";

/** Shared availability for every way to start renaming the active thread's title in place. */
export function useCanStartThreadRename(
  threadRef: ScopedThreadRef | null,
  isServerThread: boolean,
): boolean {
  const canOperate = useEnvironmentScope(
    threadRef?.environmentId ?? null,
    AuthOrchestrationOperateScope,
  );
  const rightPanelSheetLayout = useMediaQuery(RIGHT_PANEL_INLINE_LAYOUT_MEDIA_QUERY);
  const rightPanelMaximized = useRightPanelStore((state) => {
    const panel = selectThreadRightPanelState(state.byThreadKey, threadRef);
    return panel.isOpen && panel.maximized === true;
  });
  return canStartThreadRename({
    isServerThread: isServerThread && threadRef !== null,
    canOperate,
    rightPanelMaximized,
    rightPanelSheetLayout,
  });
}
