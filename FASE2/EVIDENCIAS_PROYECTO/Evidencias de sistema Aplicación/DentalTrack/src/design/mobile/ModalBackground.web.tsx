import type { ReactNode } from "react";
import { useModalIsolationActive } from "panelui-native/primitives/portal";
export function ModalBackground({
  children,
  inactive = false,
  fill = false,
}: {
  children: ReactNode;
  inactive?: boolean;
  fill?: boolean;
}) {
  return (
    <div
      inert={inactive}
      aria-hidden={inactive}
      style={fill ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : undefined}
    >
      {children}
    </div>
  );
}
export function AppBackground({ children }: { children: ReactNode }) {
  const inactive = useModalIsolationActive();
  return (
    <ModalBackground inactive={inactive} fill>
      {children}
    </ModalBackground>
  );
}
