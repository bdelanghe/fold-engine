FROM denoland/deno:latest

WORKDIR /workspaces/schema-nodes

COPY deno.json deno.lock ./
COPY src ./src
RUN deno cache --lock=deno.lock src/unfold/server.ts src/unfold/cli/main.ts

EXPOSE 3000

CMD ["deno", "task", "dev"]
