import { join } from "@std/path";

export type StepResult = {
  step: string;
  code: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type Failure = {
  step: string;
  code: number;
  tail: string;
};

export type Status = {
  ok: boolean;
  ts: string;
  durationMs: number;
  failures: Failure[];
};

const STATUS_DIR = ".unfold";
const STATUS_FILE = "status.json";
const STEPS = ["fmt:check", "lint", "test", "validate"];
const MAX_TAIL_LINES = 20;
const MAX_TAIL_CHARS = 2000;

export const truncateTail = (
  text: string,
  maxLines = MAX_TAIL_LINES,
  maxChars = MAX_TAIL_CHARS,
): string => {
  const lines = text.split("\n");
  const tailLines = lines.slice(-maxLines);
  let tail = tailLines.join("\n");
  if (tail.length > maxChars) {
    tail = tail.slice(-maxChars);
  }
  return tail.trim();
};

export const buildStatus = (
  results: StepResult[],
  options?: { now?: Date; startedAt?: number; endedAt?: number },
): Status => {
  const ok = results.every((result) => result.code === 0);
  const failures = results
    .filter((result) => result.code !== 0)
    .map((result) => {
      const output = result.stderr.trim() ? result.stderr : result.stdout;
      return {
        step: result.step,
        code: result.code,
        tail: truncateTail(output),
      };
    });
  const startedAt = options?.startedAt ?? 0;
  const endedAt = options?.endedAt ?? startedAt;
  return {
    ok,
    ts: (options?.now ?? new Date()).toISOString(),
    durationMs: Math.max(0, endedAt - startedAt),
    failures,
  };
};

const runStep = async (step: string): Promise<StepResult> => {
  const startedAt = performance.now();
  const command = new Deno.Command(Deno.execPath(), {
    args: ["task", step],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  const decoder = new TextDecoder();
  const stdout = decoder.decode(result.stdout);
  const stderr = decoder.decode(result.stderr);
  const durationMs = performance.now() - startedAt;
  return {
    step,
    code: result.code,
    stdout,
    stderr,
    durationMs,
  };
};

const writeStatus = async (status: Status): Promise<void> => {
  await Deno.mkdir(STATUS_DIR, { recursive: true });
  const statusPath = join(STATUS_DIR, STATUS_FILE);
  await Deno.writeTextFile(statusPath, JSON.stringify(status, null, 2));
};

const run = async (): Promise<void> => {
  const startedAt = Date.now();
  const results = await Promise.all(STEPS.map((step) => runStep(step)));
  const endedAt = Date.now();
  const status = buildStatus(results, { startedAt, endedAt });
  await writeStatus(status);
  Deno.exit(status.ok ? 0 : 1);
};

if (import.meta.main) {
  void run();
}
