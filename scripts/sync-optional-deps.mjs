import fs from "node:fs";

const packagePath = "package.json";
const lockPath = "package-lock.json";
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const packageVersion = packageJson.version;
const platformPackages = [
  "@sleepinsummer/agent-browser-cli-darwin-arm64",
  "@sleepinsummer/agent-browser-cli-darwin-x64",
  "@sleepinsummer/agent-browser-cli-linux-x64",
  "@sleepinsummer/agent-browser-cli-linux-arm64",
  "@sleepinsummer/agent-browser-cli-win32-x64"
];

packageJson.optionalDependencies ||= {};
for (const packageName of platformPackages) {
  packageJson.optionalDependencies[packageName] = packageVersion;
}

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");

if (fs.existsSync(lockPath)) {
  const lockJson = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const rootPackage = lockJson.packages?.[""];
  if (rootPackage) {
    rootPackage.optionalDependencies ||= {};
    for (const packageName of platformPackages) {
      rootPackage.optionalDependencies[packageName] = packageVersion;
    }
  }
  fs.writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + "\n", "utf8");
}
