import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "android/**/build/**", "supabase/functions/messaging-agent-reply/civi-bundle.js", "supabase/functions/language-pack/base-bundle.js"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Classic Rules of Hooks. The v7 "recommended" preset adds React Compiler diagnostics
      // (purity, refs, set-state-in-effect, ...) that only matter when the app adopts React Compiler.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/components/ui/**/*.tsx", "src/contexts/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/components/layout/BuildOverlay.tsx",
      "src/pages/EndorseFlow.tsx",
      "src/pages/EndorseSelect.tsx",
      "src/pages/Home.tsx",
      "src/pages/home/**/*.{ts,tsx}",
      "src/pages/Profile.tsx",
      "src/pages/UserProfile.tsx",
      "src/pages/settings/EditProfile.tsx",
      "src/pages/settings/GovernanceAdmin.tsx",
      "src/pages/settings/Pillars.tsx",
    ],
    rules: {
      // These screens intentionally scope effects to specific identity/timing triggers.
      "react-hooks/exhaustive-deps": "off",
    },
  },
);
