#!/usr/bin/env node
// Validates the distributable plugin folder and the bridge call function.
// Runs offline against a fake page; performs no network or financial operations.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_DIR = 'plugins/heytraders';
const SKILL_DIR = `${PLUGIN_DIR}/skills/heytraders-browser`;

// Authoritative allowlist of files distributed with the plugin.
const PLUGIN_FILES = [
  '.claude-plugin/plugin.json',
  'LICENSE',
  'README.md',
  'skills/heytraders-browser/SKILL.md',
  'skills/heytraders-browser/references/bridge-call.md',
  'skills/heytraders-browser/references/runtime-contract.md',
];

const MANIFEST_FIELDS = [
  'name', 'displayName', 'version', 'description', 'author',
  'homepage', 'repository', 'license', 'keywords',
];

const HEYTRADERS_ORIGIN = 'https://hey-traders.com';
const SKILL_DESCRIPTION_LIMIT = 1536;
const README_MINIMUM_WORDS = 40;

const read = (relativePath) => readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
};

const listPluginFiles = () => execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '--', PLUGIN_DIR],
  { cwd: REPO_ROOT, encoding: 'utf8' },
).split('\n').filter(Boolean).map((file) => path.posix.relative(PLUGIN_DIR, file)).sort();

const parseFrontmatter = (markdown) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  assert.ok(match, 'SKILL.md must start with YAML frontmatter');
  const fields = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    assert.ok(separator > 0, `Unsupported frontmatter line: ${line}`);
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
};

const extractBridgeFunction = () => {
  const blocks = [...read(`${SKILL_DIR}/references/bridge-call.md`).matchAll(/```js\n([\s\S]*?)```/g)];
  assert.equal(blocks.length, 1, 'bridge-call.md must contain exactly one js block');
  return blocks[0][1].trim();
};

const REQUEST_LINE = /^  const request = (.*);$/m;

// Returns the documented function's example request and a builder that swaps in another request.
const parseBridgeFunction = (source) => {
  assert.ok(source.startsWith('async () => {'), 'The bridge function must be a zero-argument async arrow function');
  assert.equal(source.match(new RegExp(REQUEST_LINE.source, 'gm'))?.length, 1, 'The request must sit on exactly one line');
  return {
    exampleRequest: JSON.parse(REQUEST_LINE.exec(source)[1]),
    withRequest: (request) => source.replace(REQUEST_LINE, () => `  const request = ${JSON.stringify(request)};`),
  };
};

const { exampleRequest, withRequest } = parseBridgeFunction(extractBridgeFunction());

// Runs the function the way the Browser pane does, `await (<function>)()`, against a fake page.
const runBridgeFunction = async (request, page) => {
  let virtualMs = 0;
  const context = vm.createContext({
    location: { origin: page.origin },
    window: {},
    Number,
    Promise,
    setTimeout: (callback, delayMs) => {
      virtualMs += delayMs;
      page.onTick?.(context.window, virtualMs);
      queueMicrotask(callback);
    },
  });
  if (page.bridge) context.window.__bridge = page.bridge;
  const result = await vm.runInContext(`(async () => (await (${withRequest(request)})()))()`, context);
  return { result: JSON.parse(JSON.stringify(result)), virtualMs };
};

// Expands the documented playwright-cli heredoc in a real shell and returns the argument eval receives.
const HEREDOC_DELIMITER = 'HEYTRADERS_REQUEST';
const expandHeredocArgument = (shell, source) => execFileSync(
  shell,
  ['-c', `printf '%s' "$(cat <<'${HEREDOC_DELIMITER}'\n${source}\n${HEREDOC_DELIMITER}\n)"`],
  { encoding: 'utf8' },
);

const createBridge = (version, response = { ok: true, data: {} }) => {
  const calls = [];
  return {
    calls,
    bridge: {
      version,
      request: async (request) => {
        calls.push(JSON.parse(JSON.stringify(request)));
        return response;
      },
    },
  };
};

await check('plugin folder matches the release allowlist', () => {
  assert.deepEqual(listPluginFiles(), [...PLUGIN_FILES].sort());
});

await check('plugin.json declares the published identity', () => {
  const manifest = JSON.parse(read(`${PLUGIN_DIR}/.claude-plugin/plugin.json`));
  assert.deepEqual(Object.keys(manifest).sort(), [...MANIFEST_FIELDS].sort());
  assert.equal(manifest.name, 'heytraders');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.license, 'Apache-2.0');
  assert.ok(manifest.author?.name, 'author.name is required');
  new URL(manifest.homepage);
  new URL(manifest.repository);
});

await check('SKILL.md frontmatter loads on every Claude surface', () => {
  const fields = parseFrontmatter(read(`${SKILL_DIR}/SKILL.md`));
  assert.deepEqual(Object.keys(fields).sort(), ['description', 'name']);
  assert.equal(fields.name, 'heytraders-browser');
  assert.ok(fields.description.length <= SKILL_DESCRIPTION_LIMIT, 'description exceeds the listing limit');
});

await check('SKILL.md links only existing references and holds no bridge code', () => {
  const skill = read(`${SKILL_DIR}/SKILL.md`);
  const links = [...skill.matchAll(/\]\((references\/[^)]+)\)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(links)].sort(), ['references/bridge-call.md', 'references/runtime-contract.md']);
  for (const link of links) read(`${SKILL_DIR}/${link}`);
  assert.ok(!/```js/.test(skill), 'The bridge expression must live only in bridge-call.md');
});

await check('README meets the directory minimum', () => {
  const prose = read(`${PLUGIN_DIR}/README.md`).replace(/```[\s\S]*?```/g, '');
  const words = prose.split(/\s+/).filter(Boolean);
  assert.ok(words.length >= README_MINIMUM_WORDS, `README has ${words.length} words`);
});

await check('bridge example request is a command envelope', () => {
  assert.deepEqual(Object.keys(exampleRequest).sort(), ['args', 'command']);
  assert.equal(typeof exampleRequest.command, 'string');
  assert.equal(typeof exampleRequest.args, 'object');
});

await check('bridge-call.md passes the function to playwright-cli through a quoted heredoc', () => {
  const doc = read(`${SKILL_DIR}/references/bridge-call.md`);
  assert.ok(doc.includes(`eval "$(cat <<'${HEREDOC_DELIMITER}'`), 'eval must read a quoted heredoc');
  assert.ok(doc.includes(`\n   ${HEREDOC_DELIMITER}\n   )"`), 'the heredoc must close with its delimiter');
});

await check('playwright-cli keeps sign-in in the plugin data profile', () => {
  const skill = read(`${SKILL_DIR}/SKILL.md`);
  const doc = read(`${SKILL_DIR}/references/bridge-call.md`);
  assert.ok(skill.includes('`${CLAUDE_PLUGIN_DATA}/chrome-profile`'), 'SKILL.md must name the plugin data profile directory');
  assert.ok(doc.includes('open https://hey-traders.com/ --headed --profile="<profile directory>" --browser=chrome'), 'the session must open with --profile');
  assert.ok(!/open [^\n]*--persistent/.test(doc), '--persistent ties the profile to the working directory');
});

await check('heredoc hands shell-sensitive requests to eval unchanged', () => {
  const request = {
    command: 'execution run-backtest',
    args: { script: `if close > $PRICE and \`x\` == "y" and 'z' \\ $(id)\n${HEREDOC_DELIMITER}\n한국어` },
  };
  const source = withRequest(request);
  for (const shell of ['/bin/bash', '/bin/zsh', '/bin/sh']) {
    try {
      execFileSync(shell, ['-c', 'true']);
    } catch {
      continue;
    }
    assert.equal(expandHeredocArgument(shell, source), source, shell);
  }
});

await check('bridge forwards the request unchanged on the canonical origin', async () => {
  const request = { command: 'chart read-state', args: { note: '한국어 ✓', nested: { list: [1, 'two'] } } };
  const response = { ok: true, protocolVersion: 3, domain: 'chart', action: 'chart read-state', data: { a: 1 } };
  const { bridge, calls } = createBridge(7, response);
  const { result } = await runBridgeFunction(request, { origin: HEYTRADERS_ORIGIN, bridge });
  assert.deepEqual(calls, [request]);
  assert.deepEqual(result, response);
});

await check('bridge rejects every other origin without calling the page', async () => {
  for (const origin of ['https://evil.example', 'http://hey-traders.com', 'https://www.hey-traders.com', 'http://localhost:3000']) {
    const { bridge, calls } = createBridge(7);
    const { result } = await runBridgeFunction(exampleRequest, { origin, bridge });
    assert.equal(result.error, 'heytraders-wrong-origin');
    assert.equal(calls.length, 0);
  }
});

await check('bridge waits for a late facade after page load', async () => {
  const { bridge, calls } = createBridge(7);
  const { result, virtualMs } = await runBridgeFunction(exampleRequest, {
    origin: HEYTRADERS_ORIGIN,
    onTick: (window, elapsedMs) => {
      if (elapsedMs >= 1500) window.__bridge = bridge;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(virtualMs, 1500);
});

await check('bridge gives up after ten seconds without a facade', async () => {
  const { result, virtualMs } = await runBridgeFunction(exampleRequest, { origin: HEYTRADERS_ORIGIN });
  assert.equal(result.error, 'heytraders-bridge-unavailable');
  assert.equal(virtualMs, 10000);
});

await check('bridge fails closed below facade version 7', async () => {
  const cases = [[6, 6], ['7', null], [7.5, 7.5], [Infinity, null], [Number.NaN, null], [undefined, null]];
  for (const [version, reported] of cases) {
    const { bridge, calls } = createBridge(version);
    const { result } = await runBridgeFunction(exampleRequest, { origin: HEYTRADERS_ORIGIN, bridge });
    assert.equal(result.error, 'heytraders-bridge-upgrade-required', `version ${String(version)}`);
    assert.equal(result.facadeVersion, reported, `version ${String(version)}`);
    assert.equal(calls.length, 0);
  }
});

await check('bridge requires a request function', async () => {
  const { result } = await runBridgeFunction(exampleRequest, {
    origin: HEYTRADERS_ORIGIN,
    bridge: { version: 7 },
  });
  assert.equal(result.error, 'heytraders-bridge-unavailable');
});

await check('bridge surfaces a page exception instead of retrying', async () => {
  let attempts = 0;
  const bridge = {
    version: 8,
    request: async () => {
      attempts += 1;
      throw new Error('page failure');
    },
  };
  await assert.rejects(
    runBridgeFunction(exampleRequest, { origin: HEYTRADERS_ORIGIN, bridge }),
    /page failure/,
  );
  assert.equal(attempts, 1);
});

for (const result of results) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${result.name}`);
  if (!result.ok) console.log(`     ${result.error?.message ?? result.error}`);
}
const failures = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exitCode = failures ? 1 : 0;
