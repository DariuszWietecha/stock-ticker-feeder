const throat = require("throat");
const { promisify } = require("util");
const Wreck = require("@hapi/wreck");

/**
 * @param {object} redisClient
 * @returns {Promise<void>}
 */
const flushdbAsync = (redisClient) => promisify(redisClient.flushdb).bind(redisClient);

/**
 * @param {object} redisClient
 * @returns {Promise<void>}
 */
const hmsetAsync = (redisClient, key, data) => {
  const hmsetP = promisify(redisClient.hmset).bind(redisClient);
  return hmsetP(key, data);
};

/**
 * @param {object} redisClient
 * @returns {Promise<void>}
 */
const rpushAsync = (redisClient, key, data) => {
  const rpushP = promisify(redisClient.rpush).bind(redisClient);
  return rpushP(key, data);
};

/**
 * @param {string} useSymbolsFromConfig
 * @param {string} requireSymbolsConfig
 * @param {string} narrowSymbolList
 * @param {string} indexFirstSymbol
 * @param {string} indexLastSymbol
 * @returns {Promise<object[]>}
 */
const getSymbolsList = async (
  useSymbolsFromConfig, requireSymbolsConfig, narrowSymbolList, indexFirstSymbol, indexLastSymbol) => {
  const symbols =
    await Wreck.get(
      `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${process.env.FINNHUB_PASS}`,
      { json: true });

  if (useSymbolsFromConfig === "true") {
    console.log("Symbols from config will be used");

    const requiredSymbolsFromConfig = requireSymbolsConfig.split(", ");

    const requiredSymbolsFromConfigWithDescription =
      symbols.payload.filter((symbol) => requiredSymbolsFromConfig.includes(symbol.symbol));
    return requiredSymbolsFromConfigWithDescription;
  }

  if (narrowSymbolList === "true") {
    console.log("Symbols will be narrowed");
    return symbols.payload.slice(indexFirstSymbol, indexLastSymbol);
  }

  console.log("All available symbols will be used");
  return (symbols.payload);
};

/**
 * @param {object} redisClient
 * @param {object[]} requiredSymbols
 * @returns {Promise<any[]>}
 */
const savePreviousPrices = (redisClient, requiredSymbols) => {
  return Promise.all(
    requiredSymbols.map(throat((parseInt(process.env.NUMBER_OF_REQUESTS_AT_A_TIME, 10)), async (symbol) => {
      const quote = await Wreck.get(`https://finnhub.io/api/v1/quote?symbol=${symbol.symbol}&token=${process.env.FINNHUB_PASS}`, { json: true });

      let symbolData = [
        "p", quote.payload.c,
        "s", symbol.symbol
      ];

      if (typeof quote.payload.pc !== "undefined") {
        symbolData = [...symbolData, "pc", quote.payload.pc];
      }
      await hmsetAsync(redisClient, symbol.symbol, symbolData);
    })));
};

/**
 * @param {object} redisClient
 * @param {object[]} requiredSymbols
 * @returns {Promise<any[]>}
 */
const saveSymbols = (redisClient, requiredSymbols) => {
  return Promise.all(
    requiredSymbols.map(async (symbol) => rpushAsync(redisClient, "symbols", JSON.stringify(symbol))));
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
 * @param {object} redisClient
 * @param {object} event
 * @returns {Promise<void>}
 */
const updateSymbol = async (redisClient, event) => {
  const parsedData = JSON.parse(event.data);
  if (parsedData.type === "trade") {
    const stockData = parsedData.data[0];
    await hmsetAsync(
      redisClient, stockData.s, ["p", stockData.p, "s", stockData.s, "t", stockData.t, "v", stockData.v]);
  }
};

exports.flushdbAsync = flushdbAsync;
exports.getSymbolsList = getSymbolsList;
exports.saveSymbols = saveSymbols;
exports.savePreviousPrices = savePreviousPrices;
exports.subscribeSymbols = subscribeSymbols;
exports.updateSymbol = updateSymbol;