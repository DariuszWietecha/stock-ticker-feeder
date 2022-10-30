# Stock-ticker-feeder

## Introduction

Node.js microservice to update Redis database used by [stock-ticker API](https://github.com/DariuszWietecha/stock-ticker)(simple REST API provides stock ticker data for required securities).

## Implementation details

API and feeder were implemented as separate services to increase the reliability of the first.

Source of real US stocks trade data is [Finnhub API](https://finnhub.io/). 

### Used dependencies:

- [@hapi/wreck](https://github.com/hapijs/wreck)
- [redis-connection](https://github.com/dwyl/redis-connection)
- [ws](https://github.com/websockets/ws)
- [dotenv](https://github.com/motdotla/dotenv)
- [throat](https://github.com/ForbesLindesay/throat)

During the implementation was used node v12.0.0.

### `.env` attributes meaning:

`REDISCLOUD_URL` - Redis instance url.

`FINNHUB_PASS` - Finnhub.io API password.

`USE_SYMBOLS_FROM_CONFIG` - If set to a `true`, the feeder will update ticker data for symbols listed in `.env/REQUIRED_SYMBOLS`. If set to a `false`, the feeder will update ticker data for all symbols(narrowed or not depending on `NARROW_SYMBOL_LIST` flag) available in Finnhub API for US market.

`REQUIRED_SYMBOLS`- List of symbols, used when `USE_SYMBOLS_FROM_CONFIG` flag is set to `true`

`NARROW_SYMBOL_LIST` - If set to a `true` feeder will update ticker data for all symbols available in Finnhub API for US market narrowed to the range defined by `.env/INDEX_FIRST_SYMBOL` and `.env/INDEX_LAST_SYMBOL`.

`INDEX_FIRST_SYMBOL` - used to define the start of the range of "narrowed symbols"

`INDEX_LAST_SYMBOL` - used to define the end of the range of "narrowed symbols"

`NUMBER_OF_REQUESTS_AT_A_TIME` - Number of requests send to Finnhub API during the update of the stock previous price.


## Running the app

### Running localy

1. Install dependencies using 

`npm install`.

2. Copy `example.env` as `.env` and update it with real passwords, Redis instance host and other values according to the required behaviour of the service. `.env` attributes meaning was described in separated point.

3. Run app using

`npm start`.

4. In command line will be displayed logs inform of finished operations like below:
```
DB flushed
Symbols from config will be used
Symbols retrieved
Symbols saved in DB
Previous day's closing prices for requiredSymbols saved in DB
Subscribed for events related to requiredSymbols
Trades for requiredSymbols updating DB data
```

### Running in the docker container

1.  Copy `example.env` as `.env` and update it with real passwords, redis instance host and other values according to required behavior of the service. `.env` attributes meaning was described in separated point.
2. Install Docker.
3. Build the image: 

`docker build -t stock-ticker-feeder .`

4. Run image:

`docker run --env-file .env stock-ticker-feeder` (windows)

`docker run --env-file ./env stock-ticker-feeder` (linux)

5. In command line will be displayed logs inform of finished operations like below:

```
DB flushed
Symbols from config will be used
Symbols retrieved
Symbols saved in DB
Previous day's closing prices for requiredSymbols saved in DB
Subscribed for events related to requiredSymbols
Trades for requiredSymbols updating DB data
```


## Unit tests

[Coverage](https://github.com/DariuszWietecha/stock-ticker-feeder/blob/master/coverage.html): 92.11%

#### Running:

1. Install dependencies and build using `npm install`.
2. Run unit tests by `npm test`.
3. To check test coverage run `npm run test-cov` or `test-cov-html`(It creates a report in [coverage.html](https://github.com/DariuszWietecha/stock-ticker-feeder/blob/master/coverage.html)).


## Notes

* .vscode directory was committed to the repository to let to debug the workflow execution and unit tests execution in VSCode.
