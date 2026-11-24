const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      ".agents/**",
      ".expo/**",
      "android/**",
      "ios/**",
      "archivos_asistente/**",
      "coverage/**",
      "docs/**",
      "dist/**",
      "dist-demo*/**",
      "tmp/**",
    ],
  },
]);
