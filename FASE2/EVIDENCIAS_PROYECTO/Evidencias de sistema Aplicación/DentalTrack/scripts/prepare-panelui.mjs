import {readFile,writeFile} from "node:fs/promises";
const root=new URL("../node_modules/panelui-native/",import.meta.url);
const pkg=JSON.parse(await readFile(new URL("package.json",root),"utf8"));
if(pkg.version!=="1.4.0")throw new Error("Revisar parches: PanelUI requiere 1.4.0");
const patches=[
  {
    "file": "lib/module/components/bottom-sheet/index.js",
    "before": "\"use strict\";\n\n",
    "after": "import { ScrollFade } from '../scroll-fade';\n\"use strict\";\n\n"
  },
  {
    "file": "lib/module/components/bottom-sheet/index.js",
    "before": "            blur: blur\n          }), /*#__PURE__*/_jsx(Pressable, {\n            accessibilityLabel: \"Close sheet\",\n            className: \"flex-1\",\n            onPress: dismissible ? close : undefined\n",
    "after": "            blur: blur\n          }), /*#__PURE__*/_jsx(Pressable, {\n            accessibilityLabel: \"Cerrar hoja\",\n            className: \"flex-1\",\n            onPress: dismissible ? close : undefined\n"
  },
  {
    "file": "lib/module/components/bottom-sheet/index.js",
    "before": "            entering: reducedMotion ? FadeIn.duration(150) : undefined,\n            accessibilityViewIsModal: true,\n            className: sheetVariants({\n              detached,\n",
    "after": "            entering: reducedMotion ? FadeIn.duration(150) : undefined,\n            accessibilityViewIsModal: true,\n          role: typeof document !== \"undefined\" ? \"dialog\" : undefined,\n          \"aria-modal\": typeof document !== \"undefined\" ? true : undefined,\n            className: sheetVariants({\n              detached,\n"
  },
  {
    "file": "lib/module/components/bottom-sheet/index.js",
    "before": "                }) : null, textChildren(children), showClose ? /*#__PURE__*/_jsx(Pressable, {\n                  accessibilityRole: \"button\",\n                  accessibilityLabel: \"Close\",\n                  onPress: close,\n                  hitSlop: 8,\n",
    "after": "                }) : null, textChildren(children), showClose ? /*#__PURE__*/_jsx(Pressable, {\n                  accessibilityRole: \"button\",\n                  accessibilityLabel: \"Cerrar\",\n                  onPress: close,\n                  hitSlop: 8,\n"
  },
  {
    "file": "lib/module/components/bottom-sheet/index.js",
    "before": "   * touch outright — which is the whole bug this part exists to solve.\n   */\n  if (!surface) return body;\n  return /*#__PURE__*/_jsx(GestureDetector, {\n    gesture: surface.scrollGesture,\n    children: body\n  });\n});\n",
    "after": "   * touch outright — which is the whole bug this part exists to solve.\n   */\n  const fadedBody = _jsx(ScrollFade, {className: sized ? 'flex-1 min-h-0' : 'shrink grow-0', edges: 'both', size: 18, children: body});\n  if (!surface) return fadedBody;\n  return /*#__PURE__*/_jsx(GestureDetector, {\n    gesture: surface.scrollGesture,\n    children: fadedBody\n  });\n});\n"
  },
  {
    "file": "lib/module/components/calendar/index.js",
    "before": "    hitSlop: 8,\n    accessibilityRole: \"button\",\n    accessibilityLabel: direction === 'next' ? 'Next month' : 'Previous month',\n    accessibilityState: {\n      disabled\n",
    "after": "    hitSlop: 8,\n    accessibilityRole: \"button\",\n    accessibilityLabel: direction === 'next' ? 'Mes siguiente' : 'Mes anterior',\n    accessibilityState: {\n      disabled\n"
  },
  {
    "file": "lib/module/components/calendar/index.js",
    "before": "    children: [/*#__PURE__*/_jsx(CaptionDropdown, {\n      label: months[current.month - 1] ?? String(current.month),\n      accessibilityLabel: \"Month\",\n      options: monthOptions.map(option => option.label),\n      active: monthOptions.findIndex(option => option.month === current.month),\n",
    "after": "    children: [/*#__PURE__*/_jsx(CaptionDropdown, {\n      label: months[current.month - 1] ?? String(current.month),\n      accessibilityLabel: \"Mes\",\n      options: monthOptions.map(option => option.label),\n      active: monthOptions.findIndex(option => option.month === current.month),\n"
  },
  {
    "file": "lib/module/components/calendar/index.js",
    "before": "    }), /*#__PURE__*/_jsx(CaptionDropdown, {\n      label: String(current.year),\n      accessibilityLabel: \"Year\",\n      options: years.map(String),\n      active: years.indexOf(current.year),\n",
    "after": "    }), /*#__PURE__*/_jsx(CaptionDropdown, {\n      label: String(current.year),\n      accessibilityLabel: \"Año\",\n      options: years.map(String),\n      active: years.indexOf(current.year),\n"
  },
  {
    "file": "lib/module/components/checkbox/index.js",
    "before": "    accessibilityLabel: accessibilityLabel ?? (typeof label === 'string' ? label : undefined),\n    accessibilityHint: description,\n    disabled: disabled\n    // An indeterminate box resolves upward: the press turns the group on.\n",
    "after": "    accessibilityLabel: accessibilityLabel ?? (typeof label === 'string' ? label : undefined),\n    accessibilityHint: description,\n    \"aria-checked\": typeof document !== \"undefined\" ? (indeterminate ? \"mixed\" : checked) : undefined,\n    disabled: disabled\n    // An indeterminate box resolves upward: the press turns the group on.\n"
  },
  {
    "file": "lib/module/components/date-time-picker/index.js",
    "before": "        children: trigger\n      }), /*#__PURE__*/_jsxs(Dialog.Content, {\n        blur: true,\n        className: \"items-center gap-0 p-4\",\n",
    "after": "        children: trigger\n      }), /*#__PURE__*/_jsxs(Dialog.Content, {\n        accessibilityLabel: \"Elegir fecha y hora\",\n        blur: true,\n        className: \"items-center gap-0 p-4\",\n"
  },
  {
    "file": "lib/module/components/dialog/index.js",
    "before": "          blur: blur\n        }), /*#__PURE__*/_jsx(Pressable, {\n          accessibilityLabel: \"Close dialog\",\n          className: \"absolute inset-0\",\n          onPress: dismissible ? () => setOpen(false) : undefined\n",
    "after": "          blur: blur\n        }), /*#__PURE__*/_jsx(Pressable, {\n          accessibilityLabel: \"Cerrar diálogo\",\n          className: \"absolute inset-0\",\n          onPress: dismissible ? () => setOpen(false) : undefined\n"
  },
  {
    "file": "lib/module/components/dialog/index.js",
    "before": "          entering: ZoomIn.springify().damping(18).stiffness(250).mass(0.6),\n          exiting: FadeOut.duration(120),\n          accessibilityViewIsModal: true\n          // `p-5` is `DIALOG_PADDING` above — a panel footer bleeds back out\n          // through exactly this much, so the two move together.\n",
    "after": "          entering: ZoomIn.springify().damping(18).stiffness(250).mass(0.6),\n          exiting: FadeOut.duration(120),\n          accessibilityViewIsModal: true,\n          role: typeof document !== \"undefined\" ? \"dialog\" : undefined,\n          \"aria-modal\": typeof document !== \"undefined\" ? true : undefined\n          // `p-5` is `DIALOG_PADDING` above — a panel footer bleeds back out\n          // through exactly this much, so the two move together.\n"
  },
  {
    "file": "lib/module/components/fab/index.js",
    "before": "  const nativeScrim = open ? /*#__PURE__*/_jsx(Pressable, {\n    accessibilityRole: \"button\",\n    accessibilityLabel: \"Close\",\n    onPress: close,\n    style: StyleSheet.absoluteFill,\n    children: /*#__PURE__*/_jsx(Scrim, {\n      blur: blur,\n      dimClassName: \"bg-black/32\"\n    })\n  }) : null;\n",
    "after": "  const nativeScrim = open ? /*#__PURE__*/_jsx(Pressable, {\n    accessibilityRole: \"button\",\n    accessibilityLabel: \"Cerrar\",\n    onPress: close,\n    style: StyleSheet.absoluteFill,\n    children: /*#__PURE__*/_jsx(Scrim, {\n      blur: blur,\n      dimClassName: \"bg-transparent\"\n    })\n  }) : null;\n"
  },
  {
    "file": "lib/module/components/fab/index.js",
    "before": "    _jsx(Pressable, {\n      accessibilityRole: \"button\",\n      accessibilityLabel: \"Close\",\n      onPress: close,\n      style: StyleSheet.absoluteFill,\n      children: /*#__PURE__*/_jsx(Scrim, {\n        blur: blur,\n        dimClassName: \"bg-black/32\"\n      })\n    }) : null, /*#__PURE__*/_jsx(FabGroupContext.Provider, {\n",
    "after": "    _jsx(Pressable, {\n      accessibilityRole: \"button\",\n      accessibilityLabel: \"Cerrar\",\n      onPress: close,\n      style: StyleSheet.absoluteFill,\n      children: /*#__PURE__*/_jsx(Scrim, {\n        blur: blur,\n        dimClassName: \"bg-transparent\"\n      })\n    }) : null, /*#__PURE__*/_jsx(FabGroupContext.Provider, {\n"
  },
  {
    "file": "lib/module/components/planner/index.js",
    "before": "    hitSlop: 6,\n    accessibilityRole: \"button\",\n    accessibilityLabel: \"Go to this month\",\n    accessibilityState: {\n      disabled: alreadyHere\n",
    "after": "    hitSlop: 6,\n    accessibilityRole: \"button\",\n    accessibilityLabel: \"Ir al mes actual\",\n    accessibilityState: {\n      disabled: alreadyHere\n"
  },
  {
    "file": "lib/module/components/planner/index.js",
    "before": "    hitSlop: 8,\n    accessibilityRole: \"button\",\n    accessibilityLabel: direction === 'next' ? 'Next month' : 'Previous month',\n    className: \"h-8 w-8 items-center justify-center rounded-lg active:bg-accent\",\n    children: direction === 'next' ? /*#__PURE__*/_jsx(ChevronRightIcon, {\n",
    "after": "    hitSlop: 8,\n    accessibilityRole: \"button\",\n    accessibilityLabel: direction === 'next' ? 'Mes siguiente' : 'Mes anterior',\n    className: \"h-8 w-8 items-center justify-center rounded-lg active:bg-accent\",\n    children: direction === 'next' ? /*#__PURE__*/_jsx(ChevronRightIcon, {\n"
  },
  {
    "file": "lib/module/components/popover/index.js",
    "before": "          dimClassName: scrimClassName\n        }) : null, /*#__PURE__*/_jsx(Pressable, {\n          accessibilityLabel: \"Close\",\n          className: \"absolute inset-0\",\n          onPress: dismissible ? () => setOpen(false) : undefined\n",
    "after": "          dimClassName: scrimClassName\n        }) : null, /*#__PURE__*/_jsx(Pressable, {\n          accessibilityLabel: \"Cerrar\",\n          className: \"absolute inset-0\",\n          onPress: dismissible ? () => setOpen(false) : undefined\n"
  },
  {
    "file": "lib/module/components/select/index.js",
    "before": "     */,\n    accessibilityRole: \"combobox\",\n    accessibilityState: {\n      disabled: !!disabled,\n",
    "after": "     */,\n    accessibilityRole: \"combobox\",\n    accessibilityLabel: title ?? selectedLabel ?? placeholder,\n    accessibilityState: {\n      disabled: !!disabled,\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "   * where it already is, cancelling the user's own momentum.\n   */\n  const resting = useRef(index);\n  const snapToOffsets = useMemo(() => items.map((_, i) => i * ROW_HEIGHT), [items]);\n  const handler = useAnimatedScrollHandler(event => {\n",
    "after": "   * where it already is, cancelling the user's own momentum.\n   */\n  const resting = useRef(-1);\n  const snapToOffsets = useMemo(() => items.map((_, i) => i * ROW_HEIGHT), [items]);\n  const handler = useAnimatedScrollHandler(event => {\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "      y: index * ROW_HEIGHT\n    },\n    onScroll: handler,\n    scrollEventThrottle: 16,\n    scrollEnabled: !disabled,\n",
    "after": "      y: index * ROW_HEIGHT\n    },\n    onScroll: typeof document !== 'undefined' ? event => { offset.value = event.nativeEvent.contentOffset.y; onDragEnd(event); } : handler,\n    scrollEventThrottle: 16,\n    scrollEnabled: !disabled,\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "      label: hour => hourCycle === 24 ? padTwo(hour) : String(hour),\n      disabled: disabled,\n      accessibilityLabel: \"Hour\",\n      className: slots.column()\n    }), /*#__PURE__*/_jsx(Column, {\n",
    "after": "      label: hour => hourCycle === 24 ? padTwo(hour) : String(hour),\n      disabled: disabled,\n      accessibilityLabel: \"Hora\",\n      className: slots.column()\n    }), /*#__PURE__*/_jsx(Column, {\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "      label: padTwo,\n      disabled: disabled,\n      accessibilityLabel: \"Minute\",\n      className: slots.column()\n    }), hourCycle === 12 ? /*#__PURE__*/_jsx(Column, {\n",
    "after": "      label: padTwo,\n      disabled: disabled,\n      accessibilityLabel: \"Minuto\",\n      className: slots.column()\n    }), hourCycle === 12 ? /*#__PURE__*/_jsx(Column, {\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "      }),\n      disabled: disabled,\n      accessibilityLabel: \"Time\",\n      className: slots.column()\n    })]\n",
    "after": "      }),\n      disabled: disabled,\n      accessibilityLabel: \"Hora\",\n      className: slots.column()\n    })]\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "    index\n  } = useBoundedTimes(minuteStep, minTime, maxTime, value);\n  const resting = useRef(index);\n  /*\n   * Measured, not assumed: the scroller is narrower than the panel by whatever\n",
    "after": "    index\n  } = useBoundedTimes(minuteStep, minTime, maxTime, value);\n  const resting = useRef(-1);\n  /*\n   * Measured, not assumed: the scroller is narrower than the panel by whatever\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "        onMomentumScrollEnd: onMomentumEnd,\n        accessibilityRole: \"adjustable\",\n        accessibilityLabel: \"Time\",\n        accessibilityState: {\n          disabled\n",
    "after": "        onMomentumScrollEnd: onMomentumEnd,\n        accessibilityRole: \"adjustable\",\n        accessibilityLabel: \"Hora\",\n        accessibilityState: {\n          disabled\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "        }],\n        onAccessibilityAction: onAccessibilityAction,\n        children: [/*#__PURE__*/_jsx(View, {\n          style: {\n",
    "after": "        }],\n        onAccessibilityAction: onAccessibilityAction,\n        ...(typeof document !== \"undefined\" ? {\n          tabIndex: disabled ? -1 : 0,\n          \"aria-valuemin\": 0,\n          \"aria-valuemax\": Math.max(0, times.length - 1),\n          \"aria-valuenow\": index,\n          \"aria-valuetext\": formatTime(value, { hourCycle, locale }),\n          onKeyDown: (event) => {\n            if (disabled) return;\n            const direction = [\"ArrowRight\", \"ArrowUp\"].includes(event.key) ? 1 : [\"ArrowLeft\", \"ArrowDown\"].includes(event.key) ? -1 : 0;\n            const next = event.key === \"Home\" ? 0 : event.key === \"End\" ? times.length - 1 : direction ? Math.min(Math.max(index + direction, 0), times.length - 1) : undefined;\n            if (next === undefined) return;\n            event.preventDefault();\n            const time = times[next];\n            if (time) { onValueChange(time); ref.current?.scrollTo({ x: next * TICK_SPACING, animated: false }); }\n          }\n        } : {}),\n        children: [/*#__PURE__*/_jsx(View, {\n          style: {\n"
  },
  {
    "file": "lib/module/components/time-picker/index.js",
    "before": "  if (presentation === 'inline') {\n    return /*#__PURE__*/_jsx(Panel, {\n      layout: layout,\n      className: className,\n",
    "after": "  if (presentation === 'inline') {\n    return /*#__PURE__*/_jsx(Panel, {\n      fullWidth: true,\n      layout: layout,\n      className: className,\n"
  },
  {
    "file": "src/components/bottom-sheet/index.tsx",
    "before": "import {\n  cloneElement,\n",
    "after": "import { ScrollFade } from '../scroll-fade';\nimport {\n  cloneElement,\n"
  },
  {
    "file": "src/components/bottom-sheet/index.tsx",
    "before": "          <Scrim blur={blur} />\n          <Pressable\n            accessibilityLabel=\"Close sheet\"\n            className=\"flex-1\"\n            onPress={dismissible ? close : undefined}\n",
    "after": "          <Scrim blur={blur} />\n          <Pressable\n            accessibilityLabel=\"Cerrar hoja\"\n            className=\"flex-1\"\n            onPress={dismissible ? close : undefined}\n"
  },
  {
    "file": "src/components/bottom-sheet/index.tsx",
    "before": "            entering={reducedMotion ? FadeIn.duration(150) : undefined}\n            accessibilityViewIsModal\n            className={sheetVariants({ detached, className })}\n            {...props}\n",
    "after": "            entering={reducedMotion ? FadeIn.duration(150) : undefined}\n            accessibilityViewIsModal\n          role={typeof document !== \"undefined\" ? \"dialog\" : undefined}\n          aria-modal={typeof document !== \"undefined\" ? true : undefined}\n            className={sheetVariants({ detached, className })}\n            {...props}\n"
  },
  {
    "file": "src/components/bottom-sheet/index.tsx",
    "before": "                <Pressable\n                  accessibilityRole=\"button\"\n                  accessibilityLabel=\"Close\"\n                  onPress={close}\n                  hitSlop={8}\n",
    "after": "                <Pressable\n                  accessibilityRole=\"button\"\n                  accessibilityLabel=\"Cerrar\"\n                  onPress={close}\n                  hitSlop={8}\n"
  },
  {
    "file": "src/components/bottom-sheet/index.tsx",
    "before": "   * touch outright — which is the whole bug this part exists to solve.\n   */\n  if (!surface) return body;\n  return <GestureDetector gesture={surface.scrollGesture}>{body}</GestureDetector>;\n});\nBottomSheetBody.displayName = 'BottomSheet.Body';\n",
    "after": "   * touch outright — which is the whole bug this part exists to solve.\n   */\n  const fadedBody = <ScrollFade className={sized ? 'flex-1 min-h-0' : 'shrink grow-0'} edges=\"both\" size={18}>{body}</ScrollFade>;\n  if (!surface) return fadedBody;\n  return <GestureDetector gesture={surface.scrollGesture}>{fadedBody}</GestureDetector>;\n});\nBottomSheetBody.displayName = 'BottomSheet.Body';\n"
  },
  {
    "file": "src/components/calendar/index.tsx",
    "before": "      hitSlop={8}\n      accessibilityRole=\"button\"\n      accessibilityLabel={direction === 'next' ? 'Next month' : 'Previous month'}\n      accessibilityState={{ disabled }}\n      className={cn(nav(), disabled ? 'opacity-30' : 'active:bg-accent')}\n",
    "after": "      hitSlop={8}\n      accessibilityRole=\"button\"\n      accessibilityLabel={direction === 'next' ? 'Mes siguiente' : 'Mes anterior'}\n      accessibilityState={{ disabled }}\n      className={cn(nav(), disabled ? 'opacity-30' : 'active:bg-accent')}\n"
  },
  {
    "file": "src/components/calendar/index.tsx",
    "before": "      <CaptionDropdown\n        label={months[current.month - 1] ?? String(current.month)}\n        accessibilityLabel=\"Month\"\n        options={monthOptions.map((option) => option.label)}\n        active={monthOptions.findIndex((option) => option.month === current.month)}\n",
    "after": "      <CaptionDropdown\n        label={months[current.month - 1] ?? String(current.month)}\n        accessibilityLabel=\"Mes\"\n        options={monthOptions.map((option) => option.label)}\n        active={monthOptions.findIndex((option) => option.month === current.month)}\n"
  },
  {
    "file": "src/components/calendar/index.tsx",
    "before": "      <CaptionDropdown\n        label={String(current.year)}\n        accessibilityLabel=\"Year\"\n        options={years.map(String)}\n        active={years.indexOf(current.year)}\n",
    "after": "      <CaptionDropdown\n        label={String(current.year)}\n        accessibilityLabel=\"Año\"\n        options={years.map(String)}\n        active={years.indexOf(current.year)}\n"
  },
  {
    "file": "src/components/checkbox/index.tsx",
    "before": "        }\n        accessibilityHint={description}\n        disabled={disabled}\n        // An indeterminate box resolves upward: the press turns the group on.\n",
    "after": "        }\n        accessibilityHint={description}\n        aria-checked={typeof document !== \"undefined\" ? (indeterminate ? \"mixed\" : checked) : undefined}\n        disabled={disabled}\n        // An indeterminate box resolves upward: the press turns the group on.\n"
  },
  {
    "file": "src/components/date-time-picker/index.tsx",
    "before": "        {/* Blurred rather than dimmed: a dialog is what you reach for when the\n            appointment *is* the decision on the screen. */}\n        <Dialog.Content blur className=\"items-center gap-0 p-4\">\n          {panel}\n          <Dialog.Close>\n",
    "after": "        {/* Blurred rather than dimmed: a dialog is what you reach for when the\n            appointment *is* the decision on the screen. */}\n        <Dialog.Content accessibilityLabel=\"Elegir fecha y hora\" blur className=\"items-center gap-0 p-4\">\n          {panel}\n          <Dialog.Close>\n"
  },
  {
    "file": "src/components/dialog/index.tsx",
    "before": "        <Scrim blur={blur} />\n        <Pressable\n          accessibilityLabel=\"Close dialog\"\n          className=\"absolute inset-0\"\n          onPress={dismissible ? () => setOpen(false) : undefined}\n",
    "after": "        <Scrim blur={blur} />\n        <Pressable\n          accessibilityLabel=\"Cerrar diálogo\"\n          className=\"absolute inset-0\"\n          onPress={dismissible ? () => setOpen(false) : undefined}\n"
  },
  {
    "file": "src/components/dialog/index.tsx",
    "before": "          exiting={FadeOut.duration(120)}\n          accessibilityViewIsModal\n          // `p-5` is `DIALOG_PADDING` above — a panel footer bleeds back out\n          // through exactly this much, so the two move together.\n",
    "after": "          exiting={FadeOut.duration(120)}\n          accessibilityViewIsModal\n          role={typeof document !== \"undefined\" ? \"dialog\" : undefined}\n          aria-modal={typeof document !== \"undefined\" ? true : undefined}\n          // `p-5` is `DIALOG_PADDING` above — a panel footer bleeds back out\n          // through exactly this much, so the two move together.\n"
  },
  {
    "file": "src/components/fab/index.tsx",
    "before": "      <Pressable\n        accessibilityRole=\"button\"\n        accessibilityLabel=\"Close\"\n        onPress={close}\n        style={StyleSheet.absoluteFill}\n      >\n        <Scrim blur={blur} dimClassName=\"bg-black/32\" />\n      </Pressable>\n    ) : null;\n",
    "after": "      <Pressable\n        accessibilityRole=\"button\"\n        accessibilityLabel=\"Cerrar\"\n        onPress={close}\n        style={StyleSheet.absoluteFill}\n      >\n        <Scrim blur={blur} dimClassName=\"bg-transparent\" />\n      </Pressable>\n    ) : null;\n"
  },
  {
    "file": "src/components/fab/index.tsx",
    "before": "          <Pressable\n            accessibilityRole=\"button\"\n            accessibilityLabel=\"Close\"\n            onPress={close}\n            style={StyleSheet.absoluteFill}\n          >\n            <Scrim blur={blur} dimClassName=\"bg-black/32\" />\n          </Pressable>\n        ) : null}\n",
    "after": "          <Pressable\n            accessibilityRole=\"button\"\n            accessibilityLabel=\"Cerrar\"\n            onPress={close}\n            style={StyleSheet.absoluteFill}\n          >\n            <Scrim blur={blur} dimClassName=\"bg-transparent\" />\n          </Pressable>\n        ) : null}\n"
  },
  {
    "file": "src/components/planner/index.tsx",
    "before": "      hitSlop={6}\n      accessibilityRole=\"button\"\n      accessibilityLabel=\"Go to this month\"\n      accessibilityState={{ disabled: alreadyHere }}\n      className={cn(\n",
    "after": "      hitSlop={6}\n      accessibilityRole=\"button\"\n      accessibilityLabel=\"Ir al mes actual\"\n      accessibilityState={{ disabled: alreadyHere }}\n      className={cn(\n"
  },
  {
    "file": "src/components/planner/index.tsx",
    "before": "      hitSlop={8}\n      accessibilityRole=\"button\"\n      accessibilityLabel={direction === 'next' ? 'Next month' : 'Previous month'}\n      className=\"h-8 w-8 items-center justify-center rounded-lg active:bg-accent\"\n    >\n",
    "after": "      hitSlop={8}\n      accessibilityRole=\"button\"\n      accessibilityLabel={direction === 'next' ? 'Mes siguiente' : 'Mes anterior'}\n      className=\"h-8 w-8 items-center justify-center rounded-lg active:bg-accent\"\n    >\n"
  },
  {
    "file": "src/components/popover/index.tsx",
    "before": "          ) : null}\n          <Pressable\n            accessibilityLabel=\"Close\"\n            className=\"absolute inset-0\"\n            onPress={dismissible ? () => setOpen(false) : undefined}\n",
    "after": "          ) : null}\n          <Pressable\n            accessibilityLabel=\"Cerrar\"\n            className=\"absolute inset-0\"\n            onPress={dismissible ? () => setOpen(false) : undefined}\n"
  },
  {
    "file": "src/components/select/index.tsx",
    "before": "       */\n      accessibilityRole=\"combobox\"\n      accessibilityState={{ disabled: !!disabled, expanded: open }}\n      hitSlop={size === 'xs' ? XS_TRIGGER_HIT_SLOP : undefined}\n",
    "after": "       */\n      accessibilityRole=\"combobox\"\n      accessibilityLabel={title ?? selectedLabel ?? placeholder}\n      accessibilityState={{ disabled: !!disabled, expanded: open }}\n      hitSlop={size === 'xs' ? XS_TRIGGER_HIT_SLOP : undefined}\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "   * where it already is, cancelling the user's own momentum.\n   */\n  const resting = useRef(index);\n\n  const snapToOffsets = useMemo(\n",
    "after": "   * where it already is, cancelling the user's own momentum.\n   */\n  const resting = useRef(-1);\n\n  const snapToOffsets = useMemo(\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "      contentContainerStyle={{ paddingVertical: (COLUMN_HEIGHT - ROW_HEIGHT) / 2 }}\n      contentOffset={{ x: 0, y: index * ROW_HEIGHT }}\n      onScroll={handler}\n      scrollEventThrottle={16}\n      scrollEnabled={!disabled}\n",
    "after": "      contentContainerStyle={{ paddingVertical: (COLUMN_HEIGHT - ROW_HEIGHT) / 2 }}\n      contentOffset={{ x: 0, y: index * ROW_HEIGHT }}\n      onScroll={typeof document !== 'undefined' ? (event: NativeSyntheticEvent<NativeScrollEvent>) => { offset.value = event.nativeEvent.contentOffset.y; onDragEnd(event); } : handler}\n      scrollEventThrottle={16}\n      scrollEnabled={!disabled}\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "        label={(hour) => (hourCycle === 24 ? padTwo(hour) : String(hour))}\n        disabled={disabled}\n        accessibilityLabel=\"Hour\"\n        className={slots.column()}\n      />\n",
    "after": "        label={(hour) => (hourCycle === 24 ? padTwo(hour) : String(hour))}\n        disabled={disabled}\n        accessibilityLabel=\"Hora\"\n        className={slots.column()}\n      />\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "        label={padTwo}\n        disabled={disabled}\n        accessibilityLabel=\"Minute\"\n        className={slots.column()}\n      />\n",
    "after": "        label={padTwo}\n        disabled={disabled}\n        accessibilityLabel=\"Minuto\"\n        className={slots.column()}\n      />\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "        label={(time) => formatTime(time, { hourCycle, locale })}\n        disabled={disabled}\n        accessibilityLabel=\"Time\"\n        className={slots.column()}\n      />\n",
    "after": "        label={(time) => formatTime(time, { hourCycle, locale })}\n        disabled={disabled}\n        accessibilityLabel=\"Hora\"\n        className={slots.column()}\n      />\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "  const ref = useRef<ScrollViewRef>(null);\n  const { times, index } = useBoundedTimes(minuteStep, minTime, maxTime, value);\n  const resting = useRef(index);\n  /*\n   * Measured, not assumed: the scroller is narrower than the panel by whatever\n",
    "after": "  const ref = useRef<ScrollViewRef>(null);\n  const { times, index } = useBoundedTimes(minuteStep, minTime, maxTime, value);\n  const resting = useRef(-1);\n  /*\n   * Measured, not assumed: the scroller is narrower than the panel by whatever\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "          onMomentumScrollEnd={onMomentumEnd}\n          accessibilityRole=\"adjustable\"\n          accessibilityLabel=\"Time\"\n          accessibilityState={{ disabled }}\n          accessibilityValue={accessibilityValueForIndex(\n",
    "after": "          onMomentumScrollEnd={onMomentumEnd}\n          accessibilityRole=\"adjustable\"\n          accessibilityLabel=\"Hora\"\n          accessibilityState={{ disabled }}\n          accessibilityValue={accessibilityValueForIndex(\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}\n          onAccessibilityAction={onAccessibilityAction}\n        >\n          {/*\n",
    "after": "          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}\n          onAccessibilityAction={onAccessibilityAction}\n          {...(typeof document !== \"undefined\" ? {\n          tabIndex: disabled ? -1 : 0,\n          \"aria-valuemin\": 0,\n          \"aria-valuemax\": Math.max(0, times.length - 1),\n          \"aria-valuenow\": index,\n          \"aria-valuetext\": formatTime(value, { hourCycle, locale }),\n          onKeyDown: (event: {key:string;preventDefault:()=>void}) => {\n            if (disabled) return;\n            const direction = [\"ArrowRight\", \"ArrowUp\"].includes(event.key) ? 1 : [\"ArrowLeft\", \"ArrowDown\"].includes(event.key) ? -1 : 0;\n            const next = event.key === \"Home\" ? 0 : event.key === \"End\" ? times.length - 1 : direction ? Math.min(Math.max(index + direction, 0), times.length - 1) : undefined;\n            if (next === undefined) return;\n            event.preventDefault();\n            const time = times[next];\n            if (time) { onValueChange(time); ref.current?.scrollTo({ x: next * TICK_SPACING, animated: false }); }\n          }\n        } : {})}\n        >\n          {/*\n"
  },
  {
    "file": "src/components/time-picker/index.tsx",
    "before": "\n  if (presentation === 'inline') {\n    return <Panel layout={layout} className={className} {...face} />;\n  }\n\n",
    "after": "\n  if (presentation === 'inline') {\n    return <Panel fullWidth layout={layout} className={className} {...face} />;\n  }\n\n"
  }
,
{"file": "lib/module/components/tabs/index.js", "all": true, "before": "accessibilityRole: \"tab\",\n    accessibilityState:", "after": "accessibilityRole: \"tab\",\n    ...(typeof document !== \"undefined\" ? { \"aria-selected\": active, tabIndex: disabled || !active ? -1 : 0, onKeyDown: (event) => {\n  const keys = ['ArrowLeft','ArrowRight','Home','End'];\n  if (!keys.includes(event.key)) return;\n  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll('[role=\"tab\"]') ?? []).filter(tab => tab.getAttribute('aria-disabled') !== 'true');\n  const at = tabs.indexOf(event.currentTarget);\n  const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;\n  const next = tabs[index];\n  if (next) { event.preventDefault(); next.focus(); next.click(); }\n} } : {}),\n    accessibilityState:"},
{"file": "src/components/tabs/index.tsx", "all": true, "before": "accessibilityRole=\"tab\"\n      accessibilityState=", "after": "accessibilityRole=\"tab\"\n      {...(typeof document !== \"undefined\" ? { \"aria-selected\": active, tabIndex: disabled || !active ? -1 : 0, onKeyDown: (event: {key:string;preventDefault:()=>void;currentTarget:HTMLElement}) => {\n  const keys = ['ArrowLeft','ArrowRight','Home','End'];\n  if (!keys.includes(event.key)) return;\n  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role=\"tab\"]') ?? []).filter(tab => tab.getAttribute('aria-disabled') !== 'true');\n  const at = tabs.indexOf(event.currentTarget);\n  const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;\n  const next = tabs[index];\n  if (next) { event.preventDefault(); next.focus(); next.click(); }\n} } : {})}\n      accessibilityState="}
];
for(const p of patches){const file=new URL(p.file,root);let current=(await readFile(file,"utf8")).replace(/\r\n/g,"\n");if(p.after && current.includes(p.after))continue;if(current.includes(p.before)){await writeFile(file,(p.all ? current.replaceAll(p.before,p.after) : current.replace(p.before,p.after)));continue;}throw new Error("PanelUI cambió: revisar parche "+p.file);}
console.log("Compatibilidad PanelUI y anotaciones aplicadas.");
