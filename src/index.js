'use strict';

const lib = require("./lib");
const WebSocket = require("ws");

try {
	(async () => {
		lib.clearConsole();

		await lib.flushdbAsync();
		console.log("DB flushed");

		const requiredSymbols = await lib.getSymbolsList();
		console.log("Symbols retrieved");

		await lib.saveSymbols(requiredSymbols);
		console.log("Symbols saved in DB");

		await lib.savePreviousPrices(requiredSymbols);
		console.log("Previous day's closing prices for requiredSymbols saved in DB");

		const socket = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_PASS}`);

		socket.addEventListener("open", async function () {
			await lib.subscribeSymbols(socket, requiredSymbols);
			console.log("Subscribed for events related to requiredSymbols \nTrades for requiredSymbols updating DB data");
		});

		let counter = 0;
		socket.addEventListener("message", async (event) => {
			lib.updateSymbol(event, counter);
			counter++;
		});
	})();
}
catch (ex) {
	console.error(ex);
}
