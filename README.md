# Hey-Traders! Quant Trading for Claude

Use [HeyTraders](https://hey-traders.com/) from Claude. Ask in plain language, and Claude works in your HeyTraders workspace for you. It can:

- analyze charts
- research markets and prediction markets
- write trading strategies
- backtest them
- run them in simulated paper mode

## What you can do

### Charts
- Open your chart workspace and switch symbols, timeframes, and layouts
- Add, adjust, or remove technical indicators
- Place and edit drawings on the chart
- Read the candles and indicator values on screen, and get a written summary of the chart

### Market research
- Check prices, historical candles, and order books across supported venues
- Compare markets across assets and venues, including sentiment, positioning, and research signals
- Screen markets with structured filters
- Search Polymarket prediction markets and follow their prices and outcomes

### Strategies and backtests
- Turn a trading idea into a HeyTraders strategy
- Backtest it on the markets, dates, and timeframe you choose
- Read results, metrics, and individual trades
- Compare versions and iterate
- Share a read-only link to a result when you ask for one

### Paper trading
- Run a strategy with simulated funds
- Check its status, signals, and activity
- Pause, resume, or stop it

### Your account
- Review connected accounts, holdings, fills, and portfolio analytics (read-only)
- Check your plan's strategy and backtest allowances
- Look up HeyTraders documentation and guides

## Example requests

- "Open my HeyTraders chart, add EMA 20 and MACD, and tell me what the chart shows."
- "Compare BTC across venues and summarize current sentiment and positioning."
- "Find the most active Polymarket markets on the Fed decision."
- "Write an RSI mean-reversion strategy for ETH and backtest it on 4h over the last year."
- "Run that strategy in paper mode and give me a status update."

## What it does not do

Placing real orders, running strategies with real funds, and connecting exchanges or wallets stay in your hands in the HeyTraders app. Claude also gives no personalized investment advice.

## Requirements

- **Claude Code**, with one of the following:
  - the Claude desktop app, which has a built-in browser
  - Node.js and Google Chrome, so Claude can use [`playwright-cli`](https://www.npmjs.com/package/@playwright/cli). If `playwright-cli` is missing, Claude offers to install it for you.
- **A HeyTraders account.** You sign in yourself in the browser Claude opens, once. You stay signed in after that.

## Install

```bash
claude plugin marketplace add heytraders/heytraders-marketplace
```

```bash
claude plugin install heytraders@heytraders-marketplace
```

Start a new Claude Code session after installing, then ask Claude to do something in HeyTraders.

## Privacy

Claude works only in the HeyTraders page in its own browser, and signs in only through you. It never reads your passwords, cookies, or browser storage. The plugin sends nothing to any other service. See the [privacy policy](https://hey-traders.com/privacy) and [terms of service](https://hey-traders.com/terms).

New product or sign-in pages open at `https://hey-traders.com/?ht_client=claude` so HeyTraders can recognize the plugin entry according to your analytics consent. An existing HeyTraders page keeps its workspace and URL. This client-declared marker does not grant consent or authenticate you.

## Support

- [Getting started with HeyTraders](https://hey-traders.com/docs/getting-started)
- [Report an issue](https://github.com/heytraders/HeyTraders-Claude/issues)

## License

Apache-2.0
