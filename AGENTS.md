# AGENTS.md

## Docker-only test execution

Run Deno tasks and tests inside the Docker test container:

```bash
docker compose run --rm unfold-test deno test src/unfold/pipeline/validate_test.ts
```
