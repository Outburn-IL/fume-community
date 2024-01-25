const fs = require('fs');
const { execSync } = require('child_process');

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Append the commit hash to the existing version
packageJson.version += `+${commitHash}`;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
