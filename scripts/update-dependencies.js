#!/usr/bin/env node

/**
 * Dependency Update Script
 * Helps manage and update dependencies safely
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const packageJsonPath = path.join(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

console.log("🔍 Analyzing dependencies...\n");

// Check for deprecated packages
const deprecatedPackages = [
	"@jup-ag/core",
	"@project-serum/anchor",
	"@switchboard-xyz/switchboard-v2"
];

const foundDeprecated = deprecatedPackages.filter(pkg => 
	packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]
);

if (foundDeprecated.length > 0) {
	console.log("⚠️  Found deprecated packages:");
	foundDeprecated.forEach(pkg => {
		console.log(`   - ${pkg}`);
	});
	console.log();
}

// Check for outdated packages
console.log("📦 Checking for outdated packages...");
try {
	const outdated = execSync("yarn outdated --json", { encoding: "utf8" });
	const outdatedData = JSON.parse(outdated);
	
	if (outdatedData.data && outdatedData.data.body.length > 0) {
		console.log("🔄 Outdated packages found:");
		outdatedData.data.body.forEach(pkg => {
			console.log(`   - ${pkg[0]}: ${pkg[1]} → ${pkg[2]}`);
		});
	} else {
		console.log("✅ All packages are up to date!");
	}
} catch (error) {
	console.log("ℹ️  Could not check for outdated packages");
}

console.log("\n🔒 Running security audit...");
try {
	execSync("yarn audit", { stdio: "inherit" });
} catch (error) {
	console.log("⚠️  Security vulnerabilities found. Run 'yarn audit --fix' to fix what can be fixed automatically.");
}

console.log("\n📋 Recommended actions:");
console.log("1. Run 'yarn add @jup-ag/api@^6.0.0' to upgrade to new Jupiter API");
console.log("2. Run 'yarn remove @jup-ag/core' to remove deprecated package");
console.log("3. Run 'yarn audit --fix' to fix security vulnerabilities");
console.log("4. Test thoroughly after updates");
console.log("5. Consider using 'yarn upgrade-interactive' for selective updates");

console.log("\n🚀 Quick update commands:");
console.log("yarn add @jup-ag/api@^6.0.0");
console.log("yarn remove @jup-ag/core");
console.log("yarn audit --fix");
console.log("yarn install");