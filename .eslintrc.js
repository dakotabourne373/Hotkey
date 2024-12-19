// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  ignorePatterns: ["/dist/*", "/app-example/*"],
  rules: {
    "import/export": 0,
    "prettier/prettier": "error",
    "no-redeclare": "off",
    "@typescript-eslint/no-redeclare": "off",
  },
};
