import type { Config } from "../config.js";
import { cliError } from "../errors.js";

export interface BdResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Runs a bd CLI command with array-form arguments.
 * SECURITY: Only array-form args — never string interpolation.
 */
export async function runBd(
  config: Config,
  args: string[]
): Promise<BdResult> {
  const { execa } = await import("execa");

  const result = await execa(config.bdPath, [...args, "--json"], {
    cwd: config.doltDbPath,
    reject: false,
    timeout: 30000,
  });

  if (result.exitCode !== 0) {
    const detail = result.stderr || result.stdout || "";
    // Log full detail for debugging, but don't expose paths/stack traces to clients
    if (detail) {
      console.error(`[bd-runner] CLI error (exit ${result.exitCode}):`, detail);
    }
    throw cliError(`bd command failed (exit code ${result.exitCode})`);
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

/**
 * Run bd and parse JSON output.
 * bd --json outputs structured data we can return to the client.
 */
export async function runBdJson<T = unknown>(
  config: Config,
  args: string[]
): Promise<T> {
  const result = await runBd(config, args);
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    // Some bd commands output non-JSON even with --json flag.
    // Return the raw stdout wrapped.
    return { raw: result.stdout } as T;
  }
}
