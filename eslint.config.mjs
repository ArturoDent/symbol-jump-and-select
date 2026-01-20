import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [{
    files: ["**/*.ts"]
},
{
    // Note: there should be no other properties in this object
    ignores: ["**/temp.js", "config/*", "dist/", "out/", "node_modules/"],
},
{
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["off", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        curly: "off",
        eqeqeq: "off",
        "no-throw-literal": "warn",
        semi: "warn"
    }
}];