import { defineConfig } from "eslint/config";
import eslintPlugin from "@eslint/js";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import eslintReactPlugin from "@eslint-react/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y-x";
import nextPlugin from "@next/eslint-plugin-next";
import promisePlugin from "eslint-plugin-promise";

// Global ignores configuration
// Must be in its own config object to act as global ignores
const ignoresConfig = defineConfig([
  {
    name: "project/ignores",
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      ".vscode/",
      "next-env.d.ts",
      "playwright-report/",
      ".vercel/",
      "**/pnpm-*/dist/",
    ],
  },
]);

// ESLint recommended rules for JavaScript/TypeScript
const eslintConfig = defineConfig([
  {
    name: "project/javascript-recommended",
    files: ["**/*.{js,mjs,ts,tsx}"],
    ...eslintPlugin.configs.recommended,
  },
]);

// TypeScript configuration with type-checked rules
const typescriptConfig = defineConfig([
  {
    name: "project/typescript-strict",
    files: ["**/*.{ts,tsx,mjs}"],
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },
    extends: [
      "@typescript-eslint/strict-type-checked",
      "@typescript-eslint/stylistic-type-checked",
    ],
    rules: {
      // Disable rules that conflict with TypeScript's own error checking
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      // Allow ts-expect-error and ts-ignore with descriptions
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": false,
          "ts-check": false,
          minimumDescriptionLength: 3,
        },
      ],
    },
  },
  // For plain JS files, you may want to disable type-checked rules
  {
    name: "project/javascript-disable-type-check",
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    extends: ["@typescript-eslint/disable-type-checked"],
  },
]);

// @eslint-react ports the react-hooks rules too; keep the official
// eslint-plugin-react-hooks versions and switch off the duplicates
const eslintReactRecommended =
  eslintReactPlugin.configs["recommended-type-checked"];
const eslintReactHooksDuplicates = Object.fromEntries(
  Object.keys(
    eslintReactPlugin.configs["disable-conflict-eslint-plugin-react-hooks"]
      .rules,
  )
    .map((rule) => rule.replace("react-hooks/", "@eslint-react/"))
    .filter((rule) => rule in eslintReactRecommended.rules)
    .map((rule) => [rule, "off"]),
);

// React and Next.js configuration
const reactConfig = defineConfig([
  {
    name: "project/react-next",
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      ...eslintReactRecommended.plugins,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y-x": jsxA11yPlugin,
      "@next/next": nextPlugin,
      promise: promisePlugin,
    },
    rules: {
      // React recommended rules
      ...eslintReactRecommended.rules,
      ...eslintReactHooksDuplicates,
      // React Hooks rules (use recommended-latest for latest features)
      ...reactHooksPlugin.configs["recommended-latest"].rules,
      // Accessibility rules (strict mode for better a11y)
      ...jsxA11yPlugin.configs.strict.rules,
      // Next.js recommended rules
      ...nextPlugin.configs.recommended.rules,
      // Next.js Core Web Vitals rules
      ...nextPlugin.configs["core-web-vitals"].rules,

      // Fine-tuned accessibility rules
      "jsx-a11y-x/alt-text": [
        "warn",
        {
          elements: ["img"],
          img: ["Image"], // Next.js Image component
        },
      ],
      "jsx-a11y-x/media-has-caption": "warn",
      "jsx-a11y-x/aria-props": "warn",
      "jsx-a11y-x/aria-proptypes": "warn",
      "jsx-a11y-x/aria-unsupported-elements": "warn",
      "jsx-a11y-x/role-has-required-aria-props": "warn",
      "jsx-a11y-x/role-supports-aria-props": "warn",
    },
    settings: eslintReactRecommended.settings,
  },
]);

// Export the complete configuration
// Order matters: ignores first, then general configs, then specific overrides
export default defineConfig([
  ...ignoresConfig,
  ...eslintConfig,
  ...typescriptConfig,
  ...reactConfig,
]);
