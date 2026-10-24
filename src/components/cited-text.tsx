/**
 * Renders answer copy carrying literal "[1]" citation markers as the
 * product's citation chips, the same way live answers render them.
 */
export default function CitedText({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (!m) return <span key={i}>{part}</span>;
        return (
          <span key={i} className="ui-cite">
            {m[1]}
          </span>
        );
      })}
    </>
  );
}
