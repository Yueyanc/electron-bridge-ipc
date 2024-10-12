// eslint.config.mjs
import antfu from "@antfu/eslint-config";

export default antfu({
  typescript: true,
  markdown: false,
  ignores: ["packages/cli/babel.js"],
  rules: {
    "node/prefer-global/process": "off",
    "ts/no-require-imports": "off",
    "no-console": "off",
    "unused-imports/no-unused-vars": "off",
    "ts/no-var-requires": "off",
    "ts/no-use-before-define": "off",
    "ts/ban-ts-comment": "off",
    "ts/prefer-ts-expect-error": "off",
    "prefer-promise-reject-errors": "off",
    "unicorn/no-new-array": "off",
    "accessor-pairs": "off",
    "style/operator-linebreak": "off",
    "ts/no-duplicate-enum-values": "off",
    "style/no-tabs": "off",
    "style/max-statements-per-line": "off",
    "style/no-mixed-spaces-and-tabs": "off",
    "ts/no-unsafe-function-type": "off",
    "no-async-promise-executor": "off",
    "ts/no-namespace": "off",
    "unicorn/error-message": "off",
    "regexp/no-unused-capturing-group": "off",
    "ts/no-this-alias": "off",
    "prefer-rest-params": "off",
  },
});
