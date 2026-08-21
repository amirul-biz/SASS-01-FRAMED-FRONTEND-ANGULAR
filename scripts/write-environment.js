const fs = require('fs');
const path = require('path');

const envConfigJson = process.env.ENV_CONFIG_JSON;

if (!envConfigJson) {
  console.log('ENV_CONFIG_JSON not set — keeping committed environment file as-is.');
  process.exit(0);
}

const targetFileByConfig = {
  staging: 'environment.staging.ts',
  local: 'environment.local.ts',
};
const targetFile = targetFileByConfig[process.env.NG_BUILD_CONFIG] ?? 'environment.ts';
const targetPath = path.join(__dirname, '..', 'src', 'environments', targetFile);

const config = JSON.parse(envConfigJson);
fs.writeFileSync(targetPath, `export const environment = ${JSON.stringify(config, null, 2)};\n`);

console.log(`Wrote ${targetFile} from ENV_CONFIG_JSON`);
