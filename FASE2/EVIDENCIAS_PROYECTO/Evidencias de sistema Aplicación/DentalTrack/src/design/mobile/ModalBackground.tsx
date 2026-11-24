import type { ReactNode } from "react";
import { View } from "react-native";
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
    <View
      style={fill ? { flex: 1, minHeight: 0, flexDirection: "column" } : undefined}
      accessibilityElementsHidden={inactive}
      importantForAccessibility={inactive ? "no-hide-descendants" : "auto"}
    >
      {children}
    </View>
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
