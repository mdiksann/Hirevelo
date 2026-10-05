export function JobDescription({ description }: { description: string }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-body">
      {description.split(/\n\s*\n/).map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 20)}`}
          className="whitespace-pre-wrap break-words"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
