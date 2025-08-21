#!/usr/bin/env node
"use strict";
const React = require("react");
const importJsx = require("import-jsx");
const { render } = require("ink");
const meow = require("meow");
const { logExit } = require("./bot/exit");

// check for .env file
const { checkForEnvFile, checkWallet, checkArbReady } = require("./utils");
checkForEnvFile();

require("dotenv").config();

checkWallet();

// Ensure environment prerequisites before starting the wizard
checkArbReady().catch((error) => {
    logExit(1, error);
    process.exit(1);
});

const wizard = importJsx("./wizard/index");

const cli = meow(`
	Usage
	  $ solana-jupiter-bot

	Options
		--name  Your name

	Examples
	  $ solana-jupiter-bot --name=Jane
	  Hello, Master
`);

console.clear();

render(React.createElement(wizard, cli.flags)).waitUntilExit();