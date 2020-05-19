const cliMethods = require("./cliMethods");
const redisClient = require("redis-connection")();
const throat = require("throat");
const { promisify } = require("util");
const Wreck = require("@hapi/wreck");

const flushdbAsync = promisify(redisClient.flushdb).bind(redisClient);
const rpushAsync = promisify(redisClient.rpush).bind(redisClient);
const hmsetAsync = promisify(redisClient.hmset).bind(redisClient);

/**
 * @returns {Promise<object[]>}
 */
const getSymbolsList = () => {
  return new Promise(async (resolve, reject) => {
    const symbols =
      await Wreck.get(
        `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${process.env.FINNHUB_PASS}`,
        { json: true })
        .catch((err) => reject(err));

    if (process.env.USE_SYMBOLS_FROM_CONFIG === "true") {
      console.log("Symbols from config will be used");
      const requiredSymbolsFromConfig = process.env.REQUIRED_SYMBOLS.split(", ");
      const requiredSymbolsFromConfigWithDescription =
        symbols.payload.filter((symbol) => requiredSymbolsFromConfig.includes(symbol.symbol));
      resolve(requiredSymbolsFromConfigWithDescription);
      return;
    }

    if (process.env.NARROW_SYMBOL_LIST === "true") {
      console.log("Symbols will be narrowed");
      resolve(symbols.payload.slice(process.env.INDEX_FIRST_SYMBOL, process.env.INDEX_LAST_SYMBOL));
      return;
    }

    console.log("All available symbols will be used");
    resolve(symbols.payload);
  });
};

/**
 * @param {object[]} requiredSymbols
 * @returns {Promise<any[]>}
 */
const savePreviousPrices = (requiredSymbols) => {
  return Promise.all(
    requiredSymbols.map(throat((parseInt(process.env.NUMBER_OF_REQUESTS_AT_A_TIME, 10)), async (symbol) => {
      const quote = await Wreck.get(`https://finnhub.io/api/v1/quote?symbol=${symbol.symbol}&token=${process.env.FINNHUB_PASS}`, { json: true })
        .catch((error) => console.error(error));
      let symbolData = [
        "p", quote.payload.c,
        "s", symbol.symbol
      ];

      if (typeof quote.payload.pc !== "undefined") {
        symbolData = [...symbolData, "pc", quote.payload.pc];
      }
      await hmsetAsync(symbol.symbol, symbolData);
    })));
};

/**
 * @param {object[]} requiredSymbols
 * @returns {Promise<any[]>}
 */
const saveSymbols = (requiredSymbols) => {
  return Promise.all(
    requiredSymbols.map(async (symbol) => rpushAsync("symbols", JSON.stringify(symbol))));
};

/**
 * @param {object} socket
 * @param {string} symbol
 * @returns {Promise<void>}
 */
const subscribeSymbol = (socket, symbol) => {
  return new Promise((resolve, reject) => {
    socket.send(JSON.stringify({ "type": "subscribe", "symbol": symbol }), (err, reply) => {
      if (err) { reject(err); }

      resolve();
    });
  });
};

/**
 * @param {object} socket
 * @param {object[]} requiredSymbols
 * @returns {Promise<any[]>}
 */
const subscribeSymbols = (socket, requiredSymbols) => {
  return Promise.all(requiredSymbols.map(async (symbol) =>
    subscribeSymbol(socket, symbol.symbol)));
};

/**
 * @param {object} event
 * @param {number} counter
 * @returns {void}
 */
const updateSymbol = (event, counter) => {
  const parsedData = JSON.parse(event.data);
  if (parsedData.type === "trade") {
    cliMethods.displayProgresIndicator(counter);

    const stockData = parsedData.data[0];
    hmsetAsync(stockData.s, ["p", stockData.p, "s", stockData.s, "t", stockData.t, "v", stockData.v]);
  }
};

exports.flushdbAsync = flushdbAsync;
exports.getSymbolsList = getSymbolsList;
exports.saveSymbols = saveSymbols;
exports.savePreviousPrices = savePreviousPrices;
exports.subscribeSymbols = subscribeSymbols;
exports.updateSymbol = updateSymbol;