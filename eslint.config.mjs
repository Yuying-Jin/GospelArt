import next from "eslint-config-next/core-web-vitals";

/**
 * eslint-config-next 16 ships flat config, so its arrays are spread directly
 * rather than bridged through @eslint/eslintrc's FlatCompat — the legacy bridge
 * serializes the config and throws on the plugin's circular references.
 *
 * `core-web-vitals` already bundles `next/typescript`, which used to be
 * extended separately.
 */
const eslintConfig = [
  // The Studio is a separate project with its own eslint config and deps.
  { ignores: [".next/**", "out/**", "next-env.d.ts", "sanity/**"] },
  ...next,
];

export default eslintConfig;
