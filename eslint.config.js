import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import angular from "angular-eslint";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      js,
      "@stylistic": stylistic,
    },
    extends: [
      "js/recommended",
      js.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      "@stylistic/array-bracket-newline": ["error", "consistent"],
      "@stylistic/array-bracket-spacing": ["error"],
      "@stylistic/arrow-spacing": ["error"],
      "@stylistic/block-spacing": ["error"],
      "@stylistic/brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/comma-spacing": ["error"],
      "@stylistic/comma-style": ["error", "last"],
      "@stylistic/computed-property-spacing": ["error", "never"],
      "@stylistic/curly-newline": ["error", { "consistent": true }],
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/function-call-spacing": ["error", "never"],
      "@stylistic/function-paren-newline": ["error", "multiline-arguments"],
      "@stylistic/implicit-arrow-linebreak": ["error", "beside"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/key-spacing": ["error", {
        "beforeColon": false, "afterColon": true, "mode": "strict"
      }],
      "@stylistic/keyword-spacing": ["error"],
      "@stylistic/member-delimiter-style": [
        "error",
        {
          "multiline": {
            "delimiter": "semi",
            "requireLast": true
          },
          "singleline": {
            "delimiter": "semi",
            "requireLast": true
          },
          "multilineDetection": "brackets"
        }
      ],
      "@stylistic/no-confusing-arrow": ["error"],
      "@stylistic/no-extra-semi": ["error"],
      "@stylistic/no-floating-decimal": ["error"],
      "@stylistic/no-mixed-operators": ["error"],
      "@stylistic/no-mixed-spaces-and-tabs": ["error"],
      "@stylistic/no-multi-spaces": ["error", { "ignoreEOLComments": true }],
      "@stylistic/no-multiple-empty-lines": ["error", { "max": 2, "maxBOF": 1 }],
      "@stylistic/no-tabs": ["error"],
      "@stylistic/no-trailing-spaces": ["error"],
      "@stylistic/no-whitespace-before-property": ["error"],
      "@stylistic/nonblock-statement-body-position": ["error", "beside"],
      "@stylistic/object-curly-newline": ["error", { "consistent": true }],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/padded-blocks": ["error", "never", { "allowSingleLineBlocks": true }],
      "@stylistic/quote-props": ["error", "as-needed"],
      "@stylistic/quotes": ["error", "single", {
        "allowTemplateLiterals": "always"
      }],
      "@stylistic/rest-spread-spacing": ["error", "never"],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/semi-spacing": ["error", { "before": false, "after": true }],
      "@stylistic/semi-style": ["error", "last"],
      "@stylistic/space-before-blocks": ["error", "always"],
      "@stylistic/space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always",
        "catch": "always"
      }],
      "@stylistic/space-in-parens": ["error", "never"],
      "@stylistic/space-infix-ops": ["error"],
      "@stylistic/space-unary-ops": ["error"],
      "@stylistic/switch-colon-spacing": ["error"],
      "@stylistic/template-curly-spacing": ["error"],
      "@stylistic/type-annotation-spacing": ["error"],
      "@stylistic/type-generic-spacing": ["error"],
      "@stylistic/type-named-tuple-spacing": ["error"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/init-declarations": [
        "error"
      ],
      "@typescript-eslint/no-explicit-any": [
        "error"
      ],
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": [
        "error"
      ],
      "@typescript-eslint/no-useless-constructor": [
        "error"
      ],
      "@typescript-eslint/prefer-includes": [
        "error"
      ],
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error"
      ],
      "@typescript-eslint/prefer-optional-chain": [
        "error"
      ],
      "@typescript-eslint/prefer-string-starts-ends-with": [
        "error"
      ],
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "variable",
          "format": [
            "camelCase",
            "UPPER_CASE"
          ]
        }
      ],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],

      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
    ignores: [],
  },
  {
    files: ["**/*.{htm,html}"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/interactive-supports-focus": "off",
      "@angular-eslint/template/click-events-have-key-events": "off",
      "@angular-eslint/template/label-has-associated-control": "off",
    },
    ignores: [],
  },
]);
