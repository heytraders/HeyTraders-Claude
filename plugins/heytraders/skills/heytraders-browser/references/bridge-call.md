# Bridge call function

Every HeyTraders command goes through this one function. Copy it unchanged, and replace only the request object on its second line. The request is a JSON object with a `command` string and an `args` object.

```js
async () => {
  const request = {"command":"help list","args":{}};
  const HEYTRADERS_ORIGIN = 'https://hey-traders.com';
  const MINIMUM_FACADE_VERSION = 7;
  if (location.origin !== HEYTRADERS_ORIGIN) {
    return { ok: false, error: 'heytraders-wrong-origin', origin: location.origin, allowedOrigin: HEYTRADERS_ORIGIN };
  }
  for (let waitedMs = 0; !window.__bridge && waitedMs < 10000; waitedMs += 250) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const bridge = window.__bridge;
  if (!bridge || typeof bridge.request !== 'function') {
    return { ok: false, error: 'heytraders-bridge-unavailable' };
  }
  if (!Number.isSafeInteger(bridge.version) || bridge.version < MINIMUM_FACADE_VERSION) {
    return {
      ok: false,
      error: 'heytraders-bridge-upgrade-required',
      facadeVersion: Number.isFinite(bridge.version) ? bridge.version : null,
      minimumFacadeVersion: MINIMUM_FACADE_VERSION,
    };
  }
  return bridge.request(request);
}
```

## Rules

- Write the request as valid JSON with JSON-escaped strings. Do not interpolate other JavaScript into it.
- Send one request per call. Add no code to the function.
- Run no other JavaScript in the HeyTraders page. Look at the page with screenshots and page snapshots instead.
- The function returns the application's result object unchanged. On success it has `ok`, `protocolVersion`, `domain`, `action`, `data`, and an optional `receipt`. On failure it has `ok`, `error`, `message`, and optional `data`.

## Claude desktop Browser pane

1. Navigate the pane to `https://hey-traders.com/`.
2. Call `javascript_tool` with this text, where `<function>` is the bridge function:

   ```text
   await (<function>)()
   ```

The pane keeps its own browser session. The user signs in to HeyTraders there once.

## playwright-cli

Use one named session, `heytraders`. Store its browser profile in the fixed profile directory that SKILL.md names. HeyTraders sign-in lives in that profile, so the user signs in once. It then survives all of these:

- browser restarts
- new Claude sessions
- plugin updates
- running from a different directory

Do not use `--persistent` instead. Its profile location depends on the working directory and on where `playwright-cli` is installed.

`playwright-cli` writes page snapshots under `.playwright-cli/` in the current directory. Run its commands from a scratch directory outside the user's project, such as `${TMPDIR:-/tmp}/heytraders-playwright`.

1. Run `playwright-cli list`. If the `heytraders` session is not open, open it:

   ```bash
   playwright-cli -s=heytraders open https://hey-traders.com/ --headed --profile="<profile directory>" --browser=chrome
   ```

   - `--profile` keeps the browser profile, and with it the HeyTraders sign-in, in the profile directory.
   - `--headed` shows the window, so the user can sign in and complete any on-screen step.
   - `--browser=chrome` uses the installed Google Chrome. If Chrome is not installed, ask the user to install it. You can also, with their agreement, run `playwright-cli install-browser` and open the session without `--browser`.

2. Pass the bridge function to `eval` through a quoted heredoc. The shell then passes the request unchanged, including `$`, backticks, and quotes:

   ```bash
   playwright-cli -s=heytraders eval "$(cat <<'HEYTRADERS_REQUEST'
   <function>
   HEYTRADERS_REQUEST
   )"
   ```

   The result object follows `### Result` in the output.

3. Use `playwright-cli -s=heytraders goto <url>` for a full page load. Use `playwright-cli -s=heytraders screenshot` to check visible effects.
4. Leave the session open between calls. Close it with `playwright-cli -s=heytraders close` when the user is done.

Use only these `playwright-cli` commands: `list`, `open`, `goto`, `eval` with the bridge function, `snapshot`, `screenshot`, `tab-list`, `tab-select`, and `close`.

Keeping the user signed in takes nothing beyond the profile directory. Never use these commands:

- the cookie, `localStorage`, `sessionStorage`, `state-save`, and `state-load` commands, which would copy session tokens into the conversation or into a plain file
- `route` or `run-code`
- `delete-data`, which signs the user out

## Page loading

The application installs `window.__bridge` shortly after a full page load. The function waits up to 10 seconds for it. In-app navigation through `navigation` commands keeps the bridge available without a reload.

A `heytraders-bridge-unavailable` result after a full page load means the page is not the HeyTraders application. For example, shared backtest pages under `/s/backtests/` do not load it. Navigate to `https://hey-traders.com/` and retry once.
