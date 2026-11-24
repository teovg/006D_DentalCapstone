const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const { createHash } = require("node:crypto");

const config = getDefaultConfig(__dirname);
// Environment inlining must never reuse a demo transform in an authenticated build.
config.cacheVersion = createHash("sha256")
  .update(
    JSON.stringify([
      process.env.EXPO_PUBLIC_DESIGN_PREVIEW,
      process.env.EXPO_PUBLIC_UI_REVIEW,
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ]),
  )
  .digest("hex");

// La revisión aislada es explícita; la entrada normal conserva AppShell/Auth.
const designVariant = process.env.EXPO_PUBLIC_DESIGN_PREVIEW;
if (designVariant === "mobile") {
  const previousResolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
      moduleName === "./App" &&
      path.resolve(context.originModulePath) ===
        path.join(__dirname, "index.ts")
    ) {
      return {
        type: "sourceFile",
        filePath: path.join(__dirname, `src/design/${designVariant}/entry.tsx`),
      };
    }
    return previousResolve
      ? previousResolve(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
  const { withUniwindConfig } = require("uniwind/metro");
  module.exports = withUniwindConfig(config, {
    cssEntryFile: `./src/design/${designVariant}/global.css`,
    dtsFile: `./src/design/${designVariant}/uniwind-types.d.ts`,
  });
} else {
  const { withUniwindConfig } = require("uniwind/metro");
  module.exports = withUniwindConfig(config, {
    cssEntryFile: "./src/design/mobile/global.css",
    dtsFile: "./src/design/mobile/uniwind-types.d.ts",
  });
}
