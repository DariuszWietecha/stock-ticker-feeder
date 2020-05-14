const redisClient = require("redis-connection")();
const Wreck = require("@hapi/wreck");
const WebSocket = require("ws");
const throat = require("throat");

const example = async () => {
	await redisClient.flushdb();
	const symbols =
		await Wreck.get(
			`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${process.env.FINNHUB_PASS}`, { json: true })
			// tslint:disable-next-line:no-console
			.catch((err) => console.error(err));
	// tslint:disable-next-line:no-console
	console.log("symbols.payload", symbols.payload);

	const symbolsToLoad = symbols.payload.slice(10, 20);
	await Promise.all(symbolsToLoad.map(async (symbol) => {
		await redisClient.rpush("symbols", JSON.stringify(symbol));
	}));
	// TODO move number for throath to config
	await Promise.all(symbolsToLoad.map(throat((1), async (symbol) => {
		const quote = await Wreck.get(`https://finnhub.io/api/v1/quote?symbol=${symbol.symbol}&token=${process.env.FINNHUB_PASS}`, { json: true });

		// console.log("payload.payload", quote.payload);
		await redisClient
			.hmset(
				symbol.symbol,
				[
					"pc", (typeof quote.payload.pc !== "undefined" ? quote.payload.pc : 0),
					"p", quote.payload.c,
					"s", symbol.symbol
				]);
	})));

	// trades
	const socket = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_PASS}`);

	socket.addEventListener("open", async (event) => {
		await Promise.all(symbolsToLoad.map(async (symbol) => {
			await socket.send(JSON.stringify({ "type": "subscribe", "symbol": symbol.symbol }));
		}));
	});

	// Listen for messages
	socket.addEventListener("message", (event) => {
		// tslint:disable-next-line:no-console
		console.log("Message from server ", event.data);
		const parsedData = JSON.parse(event.data);
		if (parsedData.type === "trade") {
			const stockData = parsedData.data[0];
			redisClient
				.hmset(stockData.s, ["p", stockData.p, "s", stockData.s, "t", stockData.t, "v", stockData.v]);
		}
	});

	// Unsubscribe
	var unsubscribe = (symbol) => {
		socket.send(JSON.stringify({ "type": "unsubscribe", "symbol": symbol }));
	};
};

try {
	example();
}
catch (ex) {
	// tslint:disable-next-line:no-console
	console.error(ex);
}
