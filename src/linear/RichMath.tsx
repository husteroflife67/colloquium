import { useMemo } from 'react';
import katex from 'katex';
/** Only call with the generated static content shipped in this repository. */
export function RichMath({ html }: { html: string }) {
  const rendered = useMemo(() => html.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (_, display: string | undefined, inline: string | undefined) => katex.renderToString(display ?? inline ?? '', { displayMode: display !== undefined, throwOnError: false, strict: 'ignore' })), [html]);
  return <div className="linear-math" dangerouslySetInnerHTML={{ __html: rendered }} />;
}
