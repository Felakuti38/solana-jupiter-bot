#!/usr/bin/env node
"use strict";
const React = require("react");
const importJsx = require("import-jsx");
const { render } = require("ink");
const meow = require("meow");

// check for .env file
const { checkForEnvFile, checkWallet } = require("./utils");
checkForEnvFile();

require("dotenv").config();

checkWallet();

// ARB token requirement check removed - bot is now open to all users

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
