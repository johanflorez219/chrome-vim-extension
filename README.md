# chrome-vim-extension

Vim-style keyboard navigation for **Arc** and **Google Chrome**.

Scroll, follow links, switch tabs, and move through history without touching the mouse — using the same muscle memory you already have from Neovim.

> **Status: in development.** Scrolling, tabs, history and link hints work today. Help, the status HUD and find are in progress (milestone M4). The options page, custom keymaps, per-site exclusions and visual mode are planned. See [PLAN.md](PLAN.md) for the roadmap.

---

## Features

- **Modal editing for the browser** — Normal, Insert, Hint, Find and Help modes, just like Vim. Visual mode is planned.
- **Status HUD** — a small badge in the corner shows the current mode and any keys waiting for a second press.
- **Scrolling** — `j`/`k`/`h`/`l`, half-page jumps, `gg`/`G`.
- **Link hints** — press `f` and type the label shown next to any link or button to click it.
- **Find on the page** — `/` to search, `n`/`N` to step through matches, with smart case.
- **Help** — press `?` to see every command and its keys, generated from the same list the extension runs.
- **Tab control** — next/previous, close, restore, duplicate.
- **History** — back and forward with `H`/`L`.
- **Counts** — prefix commands with a number: `5j` scrolls down five steps.
- **Multi-key mappings** — `gg`, `gt`, `yy`, and so on, with a Vim-like timeout.
- **Automatic Insert mode** — typing in a text field never triggers commands.
- **Custom keymaps** (planned) — remap any command from the options page.
- **Per-site exclusions** (planned) — disable the extension on sites with their own keyboard shortcuts (Gmail, Google Docs, Figma…).
- **Arc-friendly defaults** — tab keys follow Arc's vertical sidebar, and no default mapping collides with Arc's own shortcuts.

## Installation

The extension is not published on the Chrome Web Store yet. Install it from source.

### Requirements

- [Node.js](https://nodejs.org) 22 or newer (24 recommended, see `.nvmrc`)
- npm (comes with Node.js)
- Arc or Google Chrome

### Build

```sh
git clone https://github.com/johanflorez219/chrome-vim-extension.git
cd chrome-vim-extension
npm install
npm run build
```

The built extension is written to `.output/chrome-mv3/`.

### Load it in Arc

1. Open `arc://extensions` in a new tab.
2. Turn on **Developer mode** (top-right corner).
3. Click **Load unpacked** and select the `.output/chrome-mv3/` folder.
4. Reload any tabs that were already open.

### Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `.output/chrome-mv3/` folder.

### Updating

Pull the latest changes, run `npm run build` again, and click the reload icon on the extension's card in `arc://extensions` / `chrome://extensions`.

## Usage

The extension starts in **Normal mode** on every page. Keys you press are interpreted as commands until you enter a text field or switch modes.

Press `?` at any time to see every mapping.

The badge in the bottom-right corner shows the current mode (`INSERT`, `HINT`, `FIND`, `HELP`) and any keys you have typed that are still waiting for a second key, such as `5g`. In normal mode with nothing pending, the badge is hidden.

### Modes

| Mode   | How to enter                             | How to leave                            |
| ------ | ---------------------------------------- | --------------------------------------- |
| Normal | Default; `Esc` or `Ctrl-[` from any mode | —                                       |
| Insert | `i`, `gi`, or click/focus a text field   | `Esc` / `Ctrl-[`                        |
| Hint   | `f`, `F`, `yf`                           | Type a label, `Esc`                     |
| Find   | `/`                                      | `Enter` keeps the search, `Esc` cancels |
| Help   | `?`                                      | `?` or `Esc`                            |
| Visual | `v` (planned)                            | `Esc`                                   |

In **Insert mode** every key goes to the page, so you can type normally. Pressing `Esc` blurs the field and returns you to Normal mode.

### Scrolling

| Key       | Action                       |
| --------- | ---------------------------- |
| `j` / `k` | Scroll down / up             |
| `h` / `l` | Scroll left / right          |
| `d` / `u` | Scroll half a page down / up |
| `gg`      | Go to the top of the page    |
| `G`       | Go to the bottom of the page |

### Links and inputs

| Key  | Action                                   |
| ---- | ---------------------------------------- |
| `f`  | Show hints, open link in the current tab |
| `F`  | Show hints, open link in a new tab       |
| `yf` | Show hints, copy the link URL            |
| `gi` | Focus the first text input on the page   |
| `i`  | Enter Insert mode                        |

### Tabs

Arc shows tabs vertically, so `J` (down) moves to the next tab and `K` (up) to the previous one.

| Key         | Action                      |
| ----------- | --------------------------- |
| `J` / `gt`  | Next tab                    |
| `K` / `gT`  | Previous tab                |
| `g0` / `g$` | First / last tab            |
| `x`         | Close the current tab       |
| `X`         | Restore the last closed tab |
| `yt`        | Duplicate the current tab   |

### History and page

| Key  | Action                          |
| ---- | ------------------------------- |
| `H`  | Go back                         |
| `L`  | Go forward                      |
| `r`  | Reload the page                 |
| `yy` | Copy the current URL            |
| `gu` | Go up one level in the URL path |
| `gU` | Go to the site's root           |

### Find

| Key       | Action                                     |
| --------- | ------------------------------------------ |
| `/`       | Open the find bar and search the page      |
| `Enter`   | Keep the search and leave the bar          |
| `Esc`     | Cancel the search and clear the highlights |
| `n` / `N` | Next / previous match (wraps around)       |

A query in all lowercase matches any case. A query with a capital letter matches case exactly (smart case). Find searches all rendered text on the page, including text outside the screen, but not text inside iframes.

### Help

Press `?` to open the list of commands and their keys. Press `?` or `Esc` to close it. While the list is open, keys do not reach the page.

### Counts

Most commands accept a count, the same way Vim does:

```
5j     scroll down 5 times
3J     move 3 tabs forward
2x     close 2 tabs
```

### Customizing (planned)

The options page is part of milestone M5 and is not built yet. It will let you:

- remap keys, e.g. `map <C-d> scrollHalfPageDown`
- unmap keys you do not want
- exclude sites by URL pattern, e.g. `https://mail.google.com/*`
- change the hint characters and scroll step

Settings sync across your browsers through your Google account (`chrome.storage.sync`).

## Limitations

These are browser restrictions that apply to every extension:

- The extension cannot run on internal pages (`arc://…`, `chrome://…`), the Chrome Web Store, or the new-tab page.
- Shortcuts that Arc or Chrome reserve — such as `Cmd-T`, `Cmd-L`, `Cmd-W` — cannot be overridden.
- Pages already open when you install or update the extension must be reloaded before it works on them.
- Link hints and find work only in the top frame of a page. Content inside iframes is not hinted or searched yet.

## Development

```sh
npm run dev            # start Chrome with the extension and hot reload
npm run build          # production build in .output/chrome-mv3/
npm test               # unit tests (Vitest)
npm run test:coverage  # unit tests with coverage (80% minimum)
npm run test:e2e       # end-to-end tests (Playwright)
npm run lint           # ESLint: bugs, complexity, security
npm run format         # format with Prettier
npm run check          # everything CI runs, in one command
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit: it has the commit format, coding rules and tooling. See [PLAN.md](PLAN.md) for the architecture and roadmap.

## Acknowledgements

Inspired by [Vimium](https://github.com/philc/vimium), [Vimium C](https://github.com/gdh1995/vimium-c), and [Surfingkeys](https://github.com/brookhong/Surfingkeys).

## License

To be decided.
