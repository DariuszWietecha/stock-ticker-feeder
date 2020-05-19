"use strict";

const cliMethods = require("./cliMethods");
const lib = require("./lib");
const redisClient = require("redis-connection")();
const WebSocket = require("ws");
// TODO: alphabet order of requires
try {
	(async () => {
		cliMethods.clearConsole();

		await lib.flushdbAsync(redisClient);
		console.log("DB flushed");

		const requiredSymbols = await lib.getSymbolsList(
			process.env.USE_SYMBOLS_FROM_CONFIG,
			process.env.REQUIRED_SYMBOLS,
			process.env.NARROW_SYMBOL_LIST,
			process.env.INDEX_FIRST_SYMBOL,
			process.env.INDEX_LAST_SYMBOL
		);
		console.log("Symbols retrieved");

		await lib.saveSymbols(redisClient, requiredSymbols);
		console.log("Symbols saved in DB");

		await lib.savePreviousPrices(redisClient, requiredSymbols);
		console.log("Previous day's closing prices for requiredSymbols saved in DB");

		const socket = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_PASS}`);

		socket.addEventListener("open", async function () {
			await lib.subscribeSymbols(socket, requiredSymbols);
			console.log("Subscribed for events related to requiredSymbols \nTrades for requiredSymbols updating DB data");
		});

		let counter = 0;
		socket.addEventListener("message", async (event) => {
			lib.updateSymbol(redisClient, event, counter);
			counter++;
		});
	})();
}
catch (ex) {
	console.error(ex);
}
