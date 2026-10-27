import { Fragment } from 'react';
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        .map((part, i) =>
          part.startsWith('**') ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : part.startsWith('`') ? (
            <code key={i}>{part.slice(1, -1)}</code>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
    </>
  );
}
// Deliberately small Markdown subset. Raw HTML, images, iframes and remote
// links are never executed or fetched from imported content.
export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n'),
    out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i++]
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((s) => s.trim());
        if (!cells.every((s) => /^[-: ]+$/.test(s))) rows.push(cells);
      }
      out.push(
        <div className="table-scroll" key={i}>
          <table>
            <thead>
              <tr>
                {rows[0]?.map((cell, j) => (
                  <th key={j}>
                    <Inline text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k}>
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      out.push(
        <h3 key={i}>
          <Inline text={heading[1]} />
        </h3>,
      );
      i++;
      continue;
    }
    if (/^[-*] |^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] |^\d+\. /.test(lines[i]))
        items.push(lines[i++].replace(/^[-*] |^\d+\. /, ''));
      out.push(
        <ul key={i}>
          {items.map((item, j) => (
            <li key={j}>
              <Inline text={item} />
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(?:\||#{1,4}\s|[-*] |\d+\. )/.test(lines[i]))
      paragraph.push(lines[i++]);
    if (paragraph.length)
      out.push(
        <p key={i}>
          <Inline text={paragraph.join(' ')} />
        </p>,
      );
    else i++;
  }
  return <div className="prose">{out}</div>;
}
