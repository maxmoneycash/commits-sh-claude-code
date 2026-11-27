# commits.sh for Claude Code

Your token tape inside Claude Code: the terminal, the desktop app's Code tab,
VS Code and mobile.

- **The band**, above the prompt: this session's tokens, a tape of the last 16
  turns, estimated dollars, today's total across sessions, a prompt-cache
  countdown (turns amber in the last minute, `COLD` once it lapses), and the
  5-hour limit once it passes 50%.
- **`/commits`**: a pane with today's hourly tape, the session by model and
  cache hit rate, your 5-hour and 7-day limits with resets, and, with a
  connected handle, your all-agent total and live rate from commits.sh.
- **A status line entry**: session tokens and estimated dollars.
- **`/commits theme on`**: the commits.sh look for the desktop app (zinc and
  green, both modes). Off by default.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install commits-sh --marketplace maxmoneycash/commits-sh-claude-code
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session). From a shell:

```
claude plugin install commits-sh --marketplace maxmoneycash/commits-sh-claude-code
```

In the Claude desktop app: click + next to the prompt box, then Plugins, Add marketplace with `maxmoneycash/commits-sh-claude-code`, then Add plugin. A plugin installed from a terminal at the user scope also loads in the desktop app's Code tab.

## Commands

```
/commits                      open the pane
/commits connect <handle>     show your commits.sh profile figures
/commits disconnect
/commits theme on|off
/commits band on|off
```

## Data and privacy

Token counts are the API's own per-request usage, exact. Dollars are Claude
Code's estimate and say `est`. Today counts the sessions this mod ran in,
kept in the mod's own store on this machine. Nothing leaves your machine
unless you connect a handle; then the mod reads your public commits.sh pulse
(`commits.sh/api/usage/pulse`) at most every five minutes, right after a
turn. It never uploads anything.
