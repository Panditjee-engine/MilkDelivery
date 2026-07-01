const fs = require("fs");
const path = require("path");

const appJsonPath = path.join(__dirname, "..", "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

const currentVersion = appJson.expo.version || "1.0.0";
const parts = currentVersion.split(".").map((part) => Number(part));
while (parts.length < 3) parts.push(0);

parts[2] += 1;

appJson.expo.version = parts.join(".");
appJson.expo.android = appJson.expo.android || {};
appJson.expo.android.versionCode = Number(appJson.expo.android.versionCode || 0) + 1;

fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

console.log(
  `Bumped app version to ${appJson.expo.version} and Android versionCode to ${appJson.expo.android.versionCode}`,
);
