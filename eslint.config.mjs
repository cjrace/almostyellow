import { defineConfig } from "eslint/config";
import eslintPlugin from "@eslint/js";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import nextPlugin from "@next/eslint-plugin-next";

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
      // disabled next rule due to bug:
      // https://github.com/typescript-eslint/typescript-eslint/issues/11732
      // https://github.com/eslint/eslint/issues/20272
      "@typescript-eslint/unified-signatures": "off",
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

// React and Next.js configuration
const reactConfig = defineConfig([
  {
    name: "project/react-next",
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // React recommended rules
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      // React Hooks rules (use recommended-latest for latest features)
      ...reactHooksPlugin.configs["recommended-latest"].rules,
      // Accessibility rules (strict mode for better a11y)
      ...jsxA11yPlugin.configs.strict.rules,
      // Next.js recommended rules
      ...nextPlugin.configs.recommended.rules,
      // Next.js Core Web Vitals rules
      ...nextPlugin.configs["core-web-vitals"].rules,

      // Customizations for modern React/Next.js
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Use TypeScript instead
      "react/no-unknown-property": "off", // Conflicts with custom attributes
      "react/jsx-no-target-blank": "off", // Next.js handles this

      // Fine-tuned accessibility rules
      "jsx-a11y/alt-text": [
        "warn",
        {
          elements: ["img"],
          img: ["Image"], // Next.js Image component
        },
      ],
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
    },
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
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
