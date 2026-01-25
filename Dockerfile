FROM denoland/deno:latest

WORKDIR /workspaces/schema-nodes

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

COPY deno.json deno.lock ./
COPY src ./src
RUN deno cache --lock=deno.lock \
    src/unfold/server.ts \
    src/unfold/cli/main.ts \
    src/unfold/vault_api/server.ts

EXPOSE 3000

CMD ["deno", "task", "dev"]
