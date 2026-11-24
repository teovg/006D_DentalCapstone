import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const variant = "mobile";
await import("./prepare-panelui.mjs");
const portIndex = process.argv.indexOf("--port");
const port =
  portIndex >= 0
    ? process.argv[portIndex + 1]
    : variant === "mobile"
      ? "8113"
      : "8110";
if (!port || !/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
  throw new Error("El puerto debe estar entre 1024 y 65535.");
const env = {
  ...process.env,
  EXPO_NO_DOTENV: "1",
  EXPO_PUBLIC_DESIGN_PREVIEW: variant,
  EXPO_PUBLIC_UI_REVIEW: "",
};
// La comparación no usa la cuenta, claves ni registros de la aplicación real.
for (const key of Object.keys(env))
  if (/SUPABASE|TAVILY|BRAVE|DIFY|OCR/.test(key)) delete env[key];
const exportPlatform = process.argv.includes("--native") ? "android" : "web";
const args = process.argv.includes("--export")
  ? [
      "export",
      "--platform",
      exportPlatform,
      "--output-dir",
      `tmp/${variant}-${exportPlatform}`,
    ]
  : [
      "start",
      "--port",
      port,
      ...(!process.argv.includes("--native") ? ["--web"] : []),
    ];
const child = spawn(
  process.execPath,
  [require.resolve("expo/bin/cli"), ...args],
  { env, stdio: "inherit", windowsHide: true },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("close", (code, signal) => {
  if (code !== 0) console.error(`La revisión terminó sin completarse (${signal ?? code ?? "sin código"}).`);
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
