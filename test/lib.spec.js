"use strict";

require("dotenv").config();
const Lab = require("@hapi/lab");
const { describe, it } = exports.lab = Lab.script();
const { expect } = require("@hapi/code");
const sinon = require("sinon");
const Rewire = require("rewire");

const libModule = Rewire("../src/lib.js");
//  TODO: check if all assignment of process attribute is needed
describe("lib", () => {
  const redisClientMock = {};
  const requiredSymbols = [
    { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
    { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
  ];

  describe("getSymbolsList", () => {
    describe(`USE_SYMBOLS_FROM_CONFIG === "true"`, () => {
      it("success", async () => {
        const WreckMock = {
          get: sinon.stub().resolves({
            payload: [
              { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
              { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
            ]
          })
        };

        const revert = libModule.__set__("Wreck", WreckMock);

        const symbols = await libModule.getSymbolsList("true", "AAPL, MSFT", "true", "0", "1");
        expect(symbols).to.equal(requiredSymbols);
        revert();
      });
    });
    describe(`USE_SYMBOLS_FROM_CONFIG === "false", process.env.NARROW_SYMBOL_LIST === "true"`, () => {
      it("success", async () => {
        const WreckMock = {
          get: sinon.stub().resolves({
            payload: [
              { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
              { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
            ]
          })
        };

        const revert = libModule.__set__("Wreck", WreckMock);

        const symbols = await libModule.getSymbolsList("false", "AAPL, MSFT", "true", "0", "1");
        expect(symbols).to.equal([requiredSymbols[0]]);
        revert();
      });
    });
    describe(`USE_SYMBOLS_FROM_CONFIG === "false" process.env.NARROW_SYMBOL_LIST === "false"`, () => {
      it("success", async () => {
        const WreckMock = {
          get: sinon.stub().resolves({
            payload: [
              { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
              { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
            ]
          })
        };

        const revert = libModule.__set__("Wreck", WreckMock);

        const symbols = await libModule.getSymbolsList("false", "AAPL, MSFT", "false", "0", "1");
        expect(symbols).to.equal(requiredSymbols);
        revert();
      });
    });
    describe(`USE_SYMBOLS_FROM_CONFIG === "true"`, () => {
      it("request to data source API fail", async () => {
        const WreckMock = {
          get: sinon.stub()
            .withArgs(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_PASS}`)
            .rejects()
        };

        const revert = libModule.__set__("Wreck", WreckMock);

        return libModule.getSymbolsList().
          then(null, (error) => {
            expect(error).error();
            revert();
          });
      });
    });
  });

  it("saveSymbols", async () => {
    const rpushAsyncMock = sinon.spy();

    const revert = libModule.__set__("rpushAsync", rpushAsyncMock);

    await libModule.saveSymbols(redisClientMock, requiredSymbols);
    expect(rpushAsyncMock.withArgs(JSON.stringify(requiredSymbols[0])).calledOnce);
    expect(rpushAsyncMock.withArgs(JSON.stringify(requiredSymbols[1])).calledOnce);
    revert();
  });

  describe("savePreviousPrices", () => {
    it("success", async () => {
      const WreckMockGetStub = sinon.stub();
      const resQuoteSymbol1 = { c: "309.8482", pc: "307.65" };
      const resQuoteSymbol2 = { c: "189.75", pc: "189.75" };
      WreckMockGetStub
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_PASS}`)
        .resolves({ payload: resQuoteSymbol1 })
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=MSFT&token=${process.env.FINNHUB_PASS}`)
        .resolves({ payload: resQuoteSymbol2 });

      const WreckMock = {
        get: WreckMockGetStub
      };

      const revert1 = libModule.__set__("Wreck", WreckMock);

      const hmsetAsyncMock = sinon.spy();
      const revert2 = libModule.__set__("hmsetAsync", hmsetAsyncMock);

      const requiredInputSymbol1 = [
        "p", resQuoteSymbol1.c, "pc", resQuoteSymbol1.pc, "s", requiredSymbols[0].symbol];
      const requiredInputSymbol2 = [
        "p", resQuoteSymbol2.c, "pc", resQuoteSymbol2.pc, "s", requiredSymbols[1].symbol];

      await libModule.savePreviousPrices(redisClientMock, requiredSymbols);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[0].symbol, requiredInputSymbol1).calledOnce);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[1].symbol, requiredInputSymbol2).calledOnce);
      revert1();
      revert2();
    });

    it("previous cost undefined", async () => {
      const WreckMockGetStub = sinon.stub();
      const resQuoteSymbol1 = { c: "309.8482" };
      const resQuoteSymbol2 = { c: "189.75", pc: "189.75" };
      WreckMockGetStub
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_PASS}`)
        .resolves({ payload: resQuoteSymbol1 })
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=MSFT&token=${process.env.FINNHUB_PASS}`)
        .resolves({ payload: resQuoteSymbol2 });

      const WreckMock = {
        get: WreckMockGetStub
      };

      const revert1 = libModule.__set__("Wreck", WreckMock);

      const hmsetAsyncMock = sinon.spy();
      const revert2 = libModule.__set__("hmsetAsync", hmsetAsyncMock);

      const requiredInputSymbol1 = [
        "p", resQuoteSymbol1.c, "s", requiredSymbols[0].symbol];
      const requiredInputSymbol2 = [
        "p", resQuoteSymbol2.c, "pc", resQuoteSymbol2.pc, "s", requiredSymbols[1].symbol];

      await libModule.savePreviousPrices(redisClientMock, requiredSymbols);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[0].symbol, requiredInputSymbol1).calledOnce);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[1].symbol, requiredInputSymbol2).calledOnce);
      revert1();
      revert2();
    });

    it("request to data source API fail", async () => {
      const WreckMock = {
        get: sinon.stub().rejects()
      };

      const revert = libModule.__set__("Wreck", WreckMock);

      await libModule.savePreviousPrices(redisClientMock, requiredSymbols)
        .then(null, (error) => {
          expect(error).error();
          revert();
        });

    });
  });



  describe("subscribeSymbols", () => {
    it("success", async () => {
      const subscribeSymbolMock = sinon.stub().resolves();
      const soketkMock = {
        send: sinon.stub().yields()
      };

      await libModule.subscribeSymbols(soketkMock, requiredSymbols);
      expect(
        soketkMock.send.withArgs(JSON.stringify({ "type": "subscribe", "symbol": requiredSymbols[0].symbol }))
          .calledOnce);
      expect(
        soketkMock.send.withArgs(JSON.stringify({ "type": "subscribe", "symbol": requiredSymbols[1].symbol }))
          .calledOnce);
    });
    it("socket send fail", async () => {
      const subscribeSymbolMock = sinon.stub().resolves();
      const socketkMock = {
        send: sinon.stub().yieldsRight()
      };

      return libModule.subscribeSymbols(socketkMock, requiredSymbols)
        .then(null, (error) => {
          expect(error).error();
        });
    });
  });

  describe("updateSymbol", () => {
    it("trade data", async () => {
      const hmsetAsyncMock = sinon.spy();
      const revert = libModule.__set__("hmsetAsync", hmsetAsyncMock);
      const eventMock = {
        data: `{"data":[{"p":7296.89,"s":"BINANCE:BTCUSDT","t":1575526691134,"v":0.011467}],"type":"trade"}`,
      }
      const parsedData = JSON.parse(eventMock.data)
      const stockData = parsedData.data[0];

        await libModule.updateSymbol(redisClientMock, eventMock, 0);
      expect(
        hmsetAsyncMock.withArgs(redisClientMock, stockData.s, ["p", stockData.p, "s", stockData.s, "t", stockData.t, "v", stockData.v])
          .calledOnce);
          revert();
    });
    it("ping", async () => {
      const hmsetAsyncMock = sinon.spy();
      const revert = libModule.__set__("hmsetAsync", hmsetAsyncMock);
      const eventMock = {
        data: `{"type":"ping"}`,
      }

      await libModule.updateSymbol(redisClientMock, eventMock, 0);
      expect(hmsetAsyncMock.called).to.equal(false);
      revert();
    });
  });
});