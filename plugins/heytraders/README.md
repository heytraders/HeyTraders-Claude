# Hey-Traders! Quant Trading

Use [HeyTraders](https://hey-traders.com/) from Claude. Ask in plain language, and Claude works in your HeyTraders workspace for you. It can:

- analyze charts
- research markets and prediction markets
- write trading strategies
- backtest them
- run them in simulated paper mode

## What you can do

- **Charts:**
  - Switch symbols, timeframes, and layouts
  - Add or remove indicators and drawings
  - Read candles and indicator values, and get a summary of the chart
- **Market research:**
  - Prices, candles, and order books
  - Cross-venue comparisons, sentiment and positioning, and screeners
  - Polymarket prediction markets
- **Strategies and backtests:**
  - Turn an idea into a strategy
  - Backtest it
  - Read results and trades
  - Share a result link when you ask for one
- **Paper trading:**
  - Run a strategy with simulated funds
  - Check its status, signals, and activity
  - Pause, resume, or stop it
- **Your account:**
  - Read-only overview of accounts, holdings, fills, and portfolio analytics
  - Your plan allowances
  - HeyTraders documentation

## Example requests

- "Open my HeyTraders chart, add EMA 20 and MACD, and tell me what the chart shows."
- "Find the most active Polymarket markets on the Fed decision."
- "Write an RSI mean-reversion strategy for ETH and backtest it on 4h over the last year."
- "Run that strategy in paper mode and give me a status update."

## What it does not do

Placing real orders, running strategies with real funds, and connecting exchanges or wallets stay in your hands in the HeyTraders app. Claude also gives no personalized investment advice.

## Requirements

- **Claude Code**, with one of the following:
  - the Claude desktop app, which has a built-in browser
  - Node.js and Google Chrome, so Claude can use [`playwright-cli`](https://www.npmjs.com/package/@playwright/cli). Claude offers to install `playwright-cli` if it is missing.
- **A HeyTraders account.** You sign in yourself, once, in the browser Claude opens.

## How it works and your privacy

1. Claude opens `https://hey-traders.com/` in the Claude desktop app's built-in browser. If that isn't available, it opens a Google Chrome window through `playwright-cli`.
2. In that window, your HeyTraders sign-in is kept in a browser profile inside this plugin's data folder. Uninstalling the plugin removes that profile.
3. Claude sends each request to HeyTraders' own command interface in that page, using one small built-in script.

Claude signs in only through you and never reads your passwords, cookies, or browser storage. The plugin bundles no programs or servers, and sends nothing to any service other than HeyTraders.

See the [privacy policy](https://hey-traders.com/privacy) and [terms of service](https://hey-traders.com/terms).

Licensed under Apache-2.0.
