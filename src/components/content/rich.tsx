function Inline({ text }: { text: string }) {
  const bits = text.split(/(`[^`]+`)/g);
  return bits.map((bit, index) => {
    if (bit.startsWith("`") && bit.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-accent-soft px-1 py-0.5 text-sm text-ink">
          {bit.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{bit}</span>;
  });
}

export function RichText({ text }: { text: string }) {
  const chunks = text.split("```");
  return (
    <div className="grid gap-4">
      {chunks.map((chunk, index) => {
        if (index % 2 === 1) {
          const breakAt = chunk.indexOf("\n");
          const code = (breakAt === -1 ? chunk : chunk.slice(breakAt + 1)).replace(/\n$/, "");
          return (
            <pre key={index} className="overflow-x-auto rounded-xl bg-ink p-4 text-sm leading-relaxed text-paper">
              <code>{code}</code>
            </pre>
          );
        }
        return chunk
          .split(/\n{2,}/)
          .filter((para) => para.trim())
          .map((para, paraIndex) => (
            <p key={`${index}-${paraIndex}`} className="whitespace-pre-wrap text-ink-soft">
              <Inline text={para.trim()} />
            </p>
          ));
      })}
    </div>
  );
}
