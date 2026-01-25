import { assertEquals } from "@std/assert";
import { run } from "../cli/main.ts";

const createRecorder = () => {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      validateNotes: () => {
        calls.push("validate");
        return Promise.resolve();
      },
      buildSite: () => {
        calls.push("buildSite");
        return Promise.resolve();
      },
      build: () => {
        calls.push("build");
        return Promise.resolve();
      },
      cache: () => {
        calls.push("cache");
        return Promise.resolve();
      },
      dev: () => {
        calls.push("dev");
        return Promise.resolve();
      },
      docs: () => {
        calls.push("docs");
        return Promise.resolve();
      },
      output: (text: string) => calls.push(`output:${text.split("\n")[0]}`),
      error: (text: string) => calls.push(`error:${text.split("\n")[0]}`),
    },
  };
};

Deno.test("unfold cli build runs in order", async () => {
  const { calls, deps } = createRecorder();
  const code = await run(["build"], deps);
  assertEquals(code, 0);
  assertEquals(calls, ["cache", "build"]);
});

Deno.test("unfold cli validate delegates", async () => {
  const { calls, deps } = createRecorder();
  const code = await run(["validate"], deps);
  assertEquals(code, 0);
  assertEquals(calls, ["validate"]);
});

Deno.test("unfold cli prints help", async () => {
  const { calls, deps } = createRecorder();
  const code = await run(["--help"], deps);
  assertEquals(code, 0);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].startsWith("output:unfold "), true);
});

Deno.test("unfold cli rejects unknown command", async () => {
  const { calls, deps } = createRecorder();
  const code = await run(["unknown"], deps);
  assertEquals(code, 1);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].startsWith("error:Unknown command:"), true);
});
