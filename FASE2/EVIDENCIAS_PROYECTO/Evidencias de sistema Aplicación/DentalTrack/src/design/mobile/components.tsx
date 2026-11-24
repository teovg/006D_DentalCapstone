import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Alert } from "panelui-native/components/alert";
import { Badge } from "panelui-native/components/badge";
import { Button as PanelButton } from "panelui-native/components/button";
import { EmptyState } from "panelui-native/components/empty-state";
import { Item } from "panelui-native/components/item";
import { ScrollFade } from "panelui-native/components/scroll-fade";
import { Select } from "panelui-native/components/select";
import { Surface as PanelSurface } from "panelui-native/components/surface";
import { Text } from "panelui-native/primitives/text";
import {
  ToggleButton,
  ToggleButtonGroup,
} from "panelui-native/components/toggle-button";
import { Popover } from "panelui-native/components/popover";
import { Collapsible } from "panelui-native/components/collapsible";
import { useCSSVariable } from "uniwind";
import { Icon, type IconName } from "../../ui/Icon";
import { ModalBackground } from "./ModalBackground";
export function NumberingControl({
  value,
  onChange,
  guide = false,
}: {
  value: "fdi" | "universal";
  onChange: (value: "fdi" | "universal") => void;
  guide?: boolean;
}) {
  return (
    <View className="gap-2">
      <ToggleButtonGroup
        selectionMode="single"
        value={[value]}
        onValueChange={(values) => {
          const next = values[0];
          if (next === "fdi" || next === "universal") onChange(next);
        }}
        className="flex-row"
        accessibilityLabel="Numeración dental"
      >
        <ToggleButton id="fdi" className="flex-1 min-h-12">
          FDI
        </ToggleButton>
        <ToggleButton id="universal" className="flex-1 min-h-12">
          Universal
        </ToggleButton>
      </ToggleButtonGroup>
      {guide ? (
        <Text muted size="sm">
          FDI: dos dígitos por pieza, como 16 o 26. Universal: números del 1 al
          32. Un número como 16 puede existir en ambos: comprueba la leyenda del
          documento o consulta al profesional.
        </Text>
      ) : null}
    </View>
  );
}
export function OptionalSection({
  title,
  children,
  initial = false,
}: {
  title: string;
  children: ReactNode;
  initial?: boolean;
}) {
  const [expanded, setExpanded] = useState(initial);
  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} variant="ghost">
      <Collapsible.Trigger className="min-h-12">
        <Collapsible.Title>{title}</Collapsible.Title>
        <Collapsible.Indicator />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <ModalBackground inactive={!expanded}>
          <View className="gap-3 pb-3">{children}</View>
        </ModalBackground>
      </Collapsible.Content>
    </Collapsible>
  );
}
// El objetivo táctil común crece sin cambiar la API ni los estados de PanelUI.
export function Button({
  className = "",
  ...props
}: ComponentProps<typeof PanelButton>) {
  return (
    <PanelButton className={`min-h-12 min-w-12 ${className}`} {...props} />
  );
}
export function useInk() {
  const [ink, secondary, primary, background, card, border] = useCSSVariable([
    "--color-foreground",
    "--color-muted-foreground",
    "--color-primary",
    "--color-background",
    "--color-card",
    "--color-border",
  ]);
  return {
    ink: ink as string,
    secondary: secondary as string,
    primary: primary as string,
    background: background as string,
    card: card as string,
    border: border as string,
  };
}
export function PIcon({
  name,
  size = 22,
  muted = false,
  onPrimary = false,
}: {
  name: IconName;
  size?: number;
  muted?: boolean;
  onPrimary?: boolean;
}) {
  const c = useInk();
  const foreground = useCSSVariable("--color-primary-foreground");
  return (
    <Icon
      name={name}
      size={size}
      color={
        onPrimary ? (foreground as string) : muted ? c.secondary : c.primary
      }
    />
  );
}
export function Title({
  children,
  subtitle,
  action,
}: {
  children: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1 gap-1">
        <Text className="text-xl font-semibold tracking-tight">{children}</Text>
        {subtitle ? (
          <Text muted size="sm">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
export function Section({
  title,
  children,
  action,
  bounded = false,
}: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  bounded?: boolean;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          {typeof title === "string" ? (
            <Text weight="semibold" className="text-lg">
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
        {action}
      </View>
      {bounded ? (
        <View className="border border-border rounded-xl overflow-hidden">
          <ScrollFade size={18} edges="both">
            <ScrollView
              style={{ maxHeight: 200 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {children}
            </ScrollView>
          </ScrollFade>
        </View>
      ) : (
        children
      )}
    </View>
  );
}
export function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PanelSurface className={`rounded-xl gap-3 ${className}`}>
      {children}
    </PanelSurface>
  );
}
export function Page({
  children,
  compact = false,
  bottomPadding = 28,
  header,
}: {
  children: ReactNode;
  compact?: boolean;
  bottomPadding?: number;
  header?: ReactNode;
}) {
  return (
    <View className="flex-1 min-h-0">
      {header ? (
        <View className="px-5 py-3 gap-3 bg-background">{header}</View>
      ) : null}
      <ScrollFade
        className="flex-1 min-h-0"
        size={12}
        edges="both"
        orientation="vertical"
      >
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 20,
            paddingTop: compact ? 12 : 20,
            paddingBottom: bottomPadding,
          }}
          showsVerticalScrollIndicator
        >
          <View style={{ gap: compact ? 12 : 22 }}>{children}</View>
        </ScrollView>
      </ScrollFade>
    </View>
  );
}
export function Row({
  title,
  description,
  icon = "documents",
  onPress,
  trailing,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Item
      {...(onPress ? { onPress } : {})}
      className="py-4 min-h-16"
      accessibilityLabel={[title, description].filter(Boolean).join(". ")}
    >
      <Item.Media>
        <PIcon name={icon} />
      </Item.Media>
      <Item.Content>
        <Item.Title>{title}</Item.Title>
        {description ? (
          <Item.Description>{description}</Item.Description>
        ) : null}
      </Item.Content>
      {trailing ?? (onPress ? <PIcon name="chevron" size={17} muted /> : null)}
    </Item>
  );
}
export function Blank({
  title,
  description,
  label,
  onPress,
}: {
  title: string;
  description: string;
  label?: string;
  onPress?: () => void;
}) {
  return (
    <EmptyState variant="card" className="bg-card border-0 py-8">
      <EmptyState.Media>
        <PIcon name="documents" size={28} />
      </EmptyState.Media>
      <EmptyState.Title>{title}</EmptyState.Title>
      <EmptyState.Description>{description}</EmptyState.Description>
      {label && onPress ? (
        <EmptyState.Content>
          <Button onPress={onPress}>{label}</Button>
        </EmptyState.Content>
      ) : null}
    </EmptyState>
  );
}
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <Alert
      variant={warning ? "warning" : "info"}
      accessibilityLiveRegion="polite"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
export function Status({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return <Badge variant={success ? "success" : "secondary"}>{children}</Badge>;
}
// La versión 1.4 no expone etiqueta de trigger: conservar una etiqueta visible junto al control.
export const NamedSelect = Object.assign(
  function NamedSelect({
    accessibilityLabel,
    hideLabel = false,
    ...props
  }: ComponentProps<typeof Select> & {
    accessibilityLabel?: string;
    hideLabel?: boolean;
  }) {
    return (
      <View className="gap-2">
        {accessibilityLabel && !hideLabel ? (
          <Text size="sm" weight="medium">
            {accessibilityLabel}
          </Text>
        ) : null}
        <Select
          {...props}
          {...(accessibilityLabel ? { title: accessibilityLabel } : {})}
        />
      </View>
    );
  },
  { Item: Select.Item, Group: Select.Group },
);

export function HelpLabel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open || typeof window === "undefined")return;
    const dismiss=(event: KeyboardEvent)=>{if(event.key!=="Escape")return;event.preventDefault();event.stopPropagation();setOpen(false);};
    window.addEventListener("keydown",dismiss,true);
    return()=>window.removeEventListener("keydown",dismiss,true);
  },[open]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button
          variant="ghost"
          className="self-start px-0"
          accessibilityLabel={`Información: ${title}`}
        >
          <Text weight="semibold">{title}</Text>
          <PIcon name="info" size={17} />
        </Button>
      </Popover.Trigger>
      <Popover.Content width={280}>
        <Text size="sm">{children}</Text>
      </Popover.Content>
    </Popover>
  );
}
