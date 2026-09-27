import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import path from "node:path";

// Resolve relative imports too, so ../ cannot bypass the layer boundaries.
const boundaries = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const source = path.relative(process.cwd(), context.filename).replaceAll("\\", "/");
    function check(node) {
      const value = node.source?.value;
      if (typeof value !== "string") return;
      const target = value.startsWith("@/")
        ? `src/${value.slice(2)}`
        : value.startsWith(".")
          ? path.posix.normalize(path.posix.join(path.posix.dirname(source), value))
          : value;
      const from = source.split("/");
      const to = target.split("/");
      if (from[0] !== "src" || to[0] !== "src") return;
      const ranks = { core: 0, shared: 1, features: 2, app: 3 };
      if (ranks[from[1]] < ranks[to[1]])
        context.report({ node, message: "Imports must follow app → features → shared → core." });
      if (
        to[1] === "features" &&
        (from[1] !== "features" || from[2] !== to[2]) &&
        to.length > 3 &&
        to[3] !== "index"
      ) {
        context.report({
          node,
          message: "Import features through their public index.ts entry point.",
        });
      }
      if (from[1] === "features" && to[1] === "features" && from[2] !== to[2]) {
        context.report({
          node,
          message:
            "Compose features in app; cross-feature imports require an explicit architecture decision.",
        });
      }
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression(node) {
        check({ ...node, source: node.source });
      },
    };
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { architecture: { rules: { boundaries } } },
    rules: {
      "architecture/boundaries": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "node_modules/**"]),
]);
