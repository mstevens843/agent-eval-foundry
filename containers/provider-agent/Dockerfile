FROM node:22-bookworm-slim

ARG CLAUDE_CODE_VERSION=2.1.260
ARG CODEX_VERSION=0.152.1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global \
    "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    "@openai/codex@${CODEX_VERSION}"

COPY codex-with-credential /usr/local/bin/codex-with-credential
RUN chmod 0755 /usr/local/bin/codex-with-credential

# Provider state is scratch. The only durable output is the bind-mounted trial workspace.
ENV HOME=/tmp/provider-home
ENV XDG_CONFIG_HOME=/tmp/provider-home/.config

WORKDIR /work

