import { assertEquals } from "@std/assert";
import { buildStatus, type StepResult, truncateTail } from "./watch_status.ts";

Deno.test("truncateTail keeps last lines and chars", () => {
  const text = Array.from({ length: 5 }, (_, i) => `line-${i + 1}`).join("\n");
  const tail = truncateTail(text, 2, 20);
  assertEquals(tail, "line-4\nline-5");
});

Deno.test("buildStatus marks failures with tail output", () => {
  const results: StepResult[] = [
    {
      step: "lint",
      code: 1,
      stdout: "lint stdout",
      stderr: "lint stderr\nmore",
      durationMs: 10,
    },
    {
      step: "test",
      code: 0,
      stdout: "ok",
      stderr: "",
      durationMs: 20,
    },
  ];
  const status = buildStatus(results, {
    now: new Date("2026-01-25T00:00:00.000Z"),
    startedAt: 0,
    endedAt: 25,
  });
  assertEquals(status.ok, false);
  assertEquals(status.ts, "2026-01-25T00:00:00.000Z");
  assertEquals(status.durationMs, 25);
  assertEquals(status.failures, [
    {
      step: "lint",
      code: 1,
      tail: "lint stderr\nmore",
    },
  ]);
});
