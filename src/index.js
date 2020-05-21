"use strict";

const http = require("http");
const lib = require("./lib");
const redisClient = require("redis-connection")();
const WebSocket = require("ws");

const hostname = process.env.HOST || "0.0.0.0"; 
const port = process.env.PORT || 8080;
const server = http.createServer();
server.listen(port, hostname, () => {
  console.log(
		`Service listening at http://${hostname}:${port}/ to fulfill Heroku requirements for web processes.`);
});

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

		socket.addEventListener("message", async (event) => {
			lib.updateSymbol(redisClient, event);
		});
	})();
}
catch (ex) {
	console.error(ex);
}
