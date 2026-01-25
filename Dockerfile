FROM denoland/deno:latest

WORKDIR /workspaces/schema-nodes

COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock --lock-write src/unfold/server.ts src/unfold/cli/main.ts

COPY . .

EXPOSE 3000

CMD ["deno", "task", "dev"]
