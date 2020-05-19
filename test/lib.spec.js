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
  const requiredSymbols = [
    { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
    { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
  ];

  describe("getSymbolsList", () => {
    describe(`USE_SYMBOLS_FROM_CONFIG === "true"`, () => {
      it("success", async () => {
        process.env.USE_SYMBOLS_FROM_CONFIG = "true";
        const WreckMock = {
          get: sinon.stub().resolves({
            payload: [
              { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
              { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
            ]
          })
        };

        libModule.__set__("Wreck", WreckMock);

        const symbols = await libModule.getSymbolsList();
        expect(symbols).to.equal(requiredSymbols);
      });

      it("request to data source API fail", async () => {
        process.env.USE_SYMBOLS_FROM_CONFIG = "true";
        const WreckMock = {
          get: sinon.stub().rejects()
        };

        libModule.__set__("Wreck", WreckMock);

        return libModule.getSymbolsList().
          then(null, (error) => {
            expect(error).error();
          });

      });
    });
    describe(`USE_SYMBOLS_FROM_CONFIG === "false" process.env.NARROW_SYMBOL_LIST === "true"`, () => {
      it("success", async () => {
        process.env.USE_SYMBOLS_FROM_CONFIG = "false";
        process.env.NARROW_SYMBOL_LIST = "true";
        process.env.INDEX_FIRST_SYMBOL = "0";
        process.env.INDEX_LAST_SYMBOL = "1";

        const WreckMock = {
          get: sinon.stub().resolves({
            payload: [
              { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
              { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
            ]
          })
        };

        libModule.__set__("Wreck", WreckMock);

        const symbols = await libModule.getSymbolsList();
        expect(symbols).to.equal([requiredSymbols[0]]);
      });
    });
    describe(`USE_SYMBOLS_FROM_CONFIG === "false" process.env.NARROW_SYMBOL_LIST === "false"`, () => {
      it("success", async () => {
        process.env.USE_SYMBOLS_FROM_CONFIG = "false";
        process.env.NARROW_SYMBOL_LIST = "false";

        const WreckMock = {
          get: sinon.stub().resolves({
            payload: [
              { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL" },
              { description: "MICROSOFT CORP", displaySymbol: "MSFT", symbol: "MSFT" }
            ]
          })
        };

        libModule.__set__("Wreck", WreckMock);

        const symbols = await libModule.getSymbolsList();
        expect(symbols).to.equal(requiredSymbols);
      });
    });
  });

  it("saveSymbols", async () => {
    process.env.USE_SYMBOLS_FROM_CONFIG = "true";
    const rpushAsyncMock = sinon.spy();

    libModule.__set__("rpushAsync", rpushAsyncMock);

    await libModule.saveSymbols(requiredSymbols);
    expect(rpushAsyncMock.withArgs(JSON.stringify(requiredSymbols[0])).calledOnce);
    expect(rpushAsyncMock.withArgs(JSON.stringify(requiredSymbols[1])).calledOnce);
  });

  describe("savePreviousPrices", () => {
    it("success", async () => {
      process.env.USE_SYMBOLS_FROM_CONFIG = "true";
      const WreckMockGetStub = sinon.stub();
      const resQuoteSymbol1 = { c: "309.8482", pc: "307.65" };
      const resQuoteSymbol2 = { c: "189.75", pc: "189.75" };
      WreckMockGetStub
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_PASS}`)
        .resolves(resQuoteSymbol1)
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=MSFT&token=${process.env.FINNHUB_PASS}`)
        .resolves(resQuoteSymbol2);

      const WreckMock = {
        get: WreckMockGetStub
      };

      libModule.__set__("Wreck", WreckMock);

      const hmsetAsyncMock = sinon.spy();

      const requiredInputSymbol1 = [
        "p", resQuoteSymbol1.c, "pc", resQuoteSymbol1.pc, "s", requiredSymbols[0].symbol];
      const requiredInputSymbol2 = [
        "p", resQuoteSymbol2.c, "pc", resQuoteSymbol2.pc, "s", requiredSymbols[1].symbol];

      await libModule.saveSymbols(requiredSymbols);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[0].symbol, requiredInputSymbol1).calledOnce);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[1].symbol, requiredInputSymbol2).calledOnce);
    });

    it.only("previous cost undefined", async () => {
      const WreckMockGetStub = sinon.stub();
      const resQuoteSymbol1 = { c: "309.8482" };
      const resQuoteSymbol2 = { c: "189.75", pc: "189.75" };
      WreckMockGetStub
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_PASS}`)
        .resolves(resQuoteSymbol1)
        .withArgs(`https://finnhub.io/api/v1/quote?symbol=MSFT&token=${process.env.FINNHUB_PASS}`)
        .resolves(resQuoteSymbol2);

      const WreckMock = {
        get: WreckMockGetStub
      };

      libModule.__set__("Wreck", WreckMock);

      const hmsetAsyncMock = sinon.spy();

      const requiredInputSymbol1 = [
        "p", resQuoteSymbol1.c, "s", requiredSymbols[0].symbol];
      const requiredInputSymbol2 = [
        "p", resQuoteSymbol2.c, "pc", resQuoteSymbol2.pc, "s", requiredSymbols[1].symbol];

      await libModule.saveSymbols(requiredSymbols);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[0].symbol, requiredInputSymbol1).calledOnce);
      expect(hmsetAsyncMock.withArgs(requiredSymbols[1].symbol, requiredInputSymbol2).calledOnce);
    });

    it("request to data source API fail", async () => {      
      const WreckMock = {
        get: sinon.stub().rejects()
      };

      libModule.__set__("Wreck", WreckMock);

      return libModule.savePreviousPrices(requiredSymbols).
        then(null, (error) => {
          expect(error).error();
        });

    });
  });

  it("subscribeSymbols", async () => {
    process.env.USE_SYMBOLS_FROM_CONFIG = "true";
    // const soketkMock = sinon.spy();
    const subscribeSymbolMock = sinon.stub().resolves();

    // libModule.__set__("subscribeSymbol", subscribeSymbolMock);
    const soketkMock = {
      send: sinon.stub().yields()
    };

    await libModule.subscribeSymbols(soketkMock, requiredSymbols);
    // expect(subscribeSymbolMock.withArgs(soketkMock, requiredSymbols[0].symbol).calledOnce);
    // expect(subscribeSymbolMock.withArgs(soketkMock, requiredSymbols[1].symbol).calledOnce);
    expect(
      soketkMock.send.withArgs(JSON.stringify({ "type": "subscribe", "symbol": requiredSymbols[0].symbol }))
        .calledOnce);
    expect(
      soketkMock.send.withArgs(JSON.stringify({ "type": "subscribe", "symbol": requiredSymbols[1].symbol }))
        .calledOnce);
  });

  // it("subscribeSymbol", async () => {
  //   process.env.USE_SYMBOLS_FROM_CONFIG = "true";
  //   const soketkMock = {
  //     send: sinon.stub().yields()
  //   };

  //   await libModule.subscribeSymbol(soketkMock, requiredSymbols[0].symbol);
  //   expect(
  //     soketkMock.send.withArgs(JSON.stringify({ "type": "subscribe", "symbol": requiredSymbols[0].symbol }))
  //       .calledOnce);
  // });
});