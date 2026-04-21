---
name: monitor-loop
description: Actively monitor a running compound-agent infinity loop, checking progress every N minutes (default 5). Reports epic status, current activity, and flags issues.
---

# Monitor Loop

Actively monitors a running `ca loop` infinity loop session, checking back at regular intervals to report progress and flag issues.

## Usage

```
/monitor-loop          # Monitor every 5 minutes (default)
/monitor-loop 2        # Monitor every 2 minutes
/monitor-loop 10       # Monitor every 10 minutes
```

## How It Works

On each check cycle, run ALL of these commands and synthesize a status report:

### 1. Verify the loop is running

```bash
screen -ls 2>/dev/null | grep beads-loop || echo "NO SCREEN SESSION"
```

If no session found, report **LOOP DOWN** and stop monitoring.

### 2. Check loop output for latest events

```bash
tail -20 .compound-agent/agent_logs/loop-output*.log 2>/dev/null | tail -20
```

Look for: epic completions, review phases, failures, skips, crashes.

### 3. Check current epic progress

```bash
bd list --status=in_progress 2>/dev/null
bd stats 2>/dev/null
```

If `bd` is blocked (Dolt lock), note it and check process list instead.

### 4. Check agent activity

```bash
# Find the current epic's agent log
tail -c 500 .compound-agent/agent_logs/loop_beads-gui-*-$(date +%Y-%m-%d)*.log 2>/dev/null | tail -10
```

### 5. Check for stuck processes

```bash
ps aux | grep 'playwright' | grep -v grep | wc -l
ps aux | grep -E 'vite|dolt sql-server' | grep -v grep | wc -l
```

## Status Report Format

Each check should produce a concise status like:

```
**Status: [Epic Name] -- [phase] ([N/M] done)**
- Screen: running/down
- Current: [what the agent is doing]
- Closed: X / Y total
- Issues: [any problems detected]
```

## When to Flag Issues

- **LOOP DOWN**: Screen session gone -- needs relaunch
- **STUCK**: Agent log hasn't updated in >10 minutes and no processes running
- **DOLT LOCK**: `bd` commands failing -- stale dolt sql-server process
- **TEST FAILURES**: Agent iterating on test fixes for >3 cycles
- **MEMORY**: System memory below 90% free

## Scheduling

After each check, use `ScheduleWakeup` to schedule the next one:

```
ScheduleWakeup({
  delaySeconds: interval * 60,  // Convert minutes to seconds
  reason: "Check loop -- [brief status]",
  prompt: "/monitor-loop N"
})
```

Use `delaySeconds` of 270 for 5-min intervals (stays within prompt cache window).

## Important Notes

- Parse the interval from the user's args (default: 5 minutes)
- Keep reports concise -- the user doesn't need every log line
- If the loop finishes (all epics done), report completion and stop monitoring
- If `bd` is blocked by Dolt lock, check processes instead -- don't keep retrying bd