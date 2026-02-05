type WikiLinkOptions = {
  prefix?: string;
  suffix?: string;
};

type WikiLinkToken = {
  type: string;
  tag: string;
  nesting: number;
  content: string;
  meta?: {
    target: string;
  };
};

type MarkdownIt = {
  inline: {
    ruler: {
      before: (
        ruleName: string,
        name: string,
        fn: (state: any, silent: boolean) => boolean,
      ) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: WikiLinkToken[], idx: number) => string>;
  };
  utils: {
    escapeHtml: (value: string) => string;
  };
};

export default function wikiLinks(options: WikiLinkOptions = {}) {
  const prefix = options.prefix ?? "/notes/";
  const suffix = options.suffix ?? "/";

  return (md: MarkdownIt) => {
    md.inline.ruler.before("emphasis", "wikilink", (state, silent) => {
      const start = state.pos;
      const src = state.src;

      if (src.charCodeAt(start) !== 0x5b /* [ */) return false;
      if (src.charCodeAt(start + 1) !== 0x5b /* [ */) return false;

      const end = src.indexOf("]]", start + 2);
      if (end === -1) return false;

      if (!silent) {
        const raw = src.slice(start + 2, end).trim();
        if (!raw) return false;

        const [targetRaw, labelRaw] = raw.split("|");
        const target = (targetRaw ?? "").trim();
        const label = (labelRaw ?? target).trim();

        if (!target) return false;

        const token = state.push("wikilink", "", 0) as WikiLinkToken;
        token.content = label;
        token.meta = { target };
      }

      state.pos = end + 2;
      return true;
    });

    md.renderer.rules.wikilink = (tokens, idx) => {
      const token = tokens[idx];
      const target = token.meta?.target ?? token.content;
      const label = token.content;
      const href = `${prefix}${encodeURIComponent(target)}${suffix}`;
      const safeHref = md.utils.escapeHtml(href);
      const safeLabel = md.utils.escapeHtml(label);

      return `<a href="${safeHref}">${safeLabel}</a>`;
    };
  };
}
