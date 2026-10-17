// 프로젝트 루트의 eslint.config.js(flat config)가 아니라
// 이 폴더의 .eslintrc.js를 쓰도록 하고 ESLint를 실행한다.
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const bin = path.join(__dirname, "..", "node_modules", "eslint", "bin", "eslint.js");
const result = spawnSync(process.execPath, [bin, "--ext", ".ts", "src"], {
  stdio: "inherit",
  env: {...process.env, ESLINT_USE_FLAT_CONFIG: "false"},
});
process.exit(result.status ?? 1);
