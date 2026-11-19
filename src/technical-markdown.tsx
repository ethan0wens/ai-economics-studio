import { Fragment, type ReactNode } from 'react';
import type { MarkedToken, Token } from 'marked';
import { headingId, technicalLink } from './technical-content';

function inline(tokens: Token[], file: string): ReactNode {
  return (tokens as MarkedToken[]).map((token, index) => {
    switch (token.type) {
      case 'text': return <Fragment key={index}>{token.tokens ? inline(token.tokens, file) : token.text}</Fragment>;
      case 'escape': return token.text;
      case 'codespan': return <code key={index}>{token.text}</code>;
      case 'strong': return <strong key={index}>{inline(token.tokens, file)}</strong>;
      case 'em': return <em key={index}>{inline(token.tokens, file)}</em>;
      case 'del': return <del key={index}>{inline(token.tokens, file)}</del>;
      case 'br': return <br key={index} />;
      case 'link': {
        const href = technicalLink(token.href, file);
        return href ? <a key={index} href={href}>{inline(token.tokens, file)}</a> : token.text;
      }
      default: return null;
    }
  });
}

export function ReadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return <div className="technical-scroll table-wrap" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

export function TechnicalMarkdown({ tokens, file, title }: { tokens: Token[]; file: string; title: string }) {
  let currentHeading = title;
  return (tokens as MarkedToken[]).map((token, index) => {
    switch (token.type) {
      case 'heading': {
        const Element = token.depth === 2 ? 'h2' : 'h3';
        currentHeading = token.text;
        return <Element key={index} id={`doc-${headingId(token.text)}`} tabIndex={-1}>{inline(token.tokens, file)}</Element>;
      }
      case 'paragraph': return <p key={index}>{inline(token.tokens, file)}</p>;
      case 'text': return <p key={index}>{token.tokens ? inline(token.tokens, file) : token.text}</p>;
      case 'list': {
        const List = token.ordered ? 'ol' : 'ul';
        return <List key={index} start={typeof token.start === 'number' ? token.start : undefined}>
          {token.items.map((item, index) => <li key={index}><TechnicalMarkdown tokens={item.tokens} file={file} title={currentHeading} /></li>)}
        </List>;
      }
      case 'table': return <ReadingRegion key={index} label={`${currentHeading} table`}>
        <table><caption className="sr-only">{currentHeading}</caption>
          <thead><tr>{token.header.map((cell, index) => <th key={index} scope="col">{inline(cell.tokens, file)}</th>)}</tr></thead>
          <tbody>{token.rows.map((row, index) => <tr key={index}>{row.map((cell, index) => index === 0 ?
            <th key={index} scope="row">{inline(cell.tokens, file)}</th> : <td key={index}>{inline(cell.tokens, file)}</td>)}</tr>)}</tbody>
        </table>
      </ReadingRegion>;
      case 'code': {
        if (token.lang === 'diagram') {
          const [caption, ...lines] = token.text.split('\n');
          return <figure key={index} className="technical-diagram"><figcaption>{caption}</figcaption>
            <ReadingRegion label={caption}><pre><code>{lines.join('\n').trimEnd().replace(/^\n/, '')}</code></pre></ReadingRegion>
          </figure>;
        }
        return <ReadingRegion key={index} label={`${currentHeading} code example`}><pre><code>{token.text}</code></pre></ReadingRegion>;
      }
      case 'blockquote': return <blockquote key={index}><TechnicalMarkdown tokens={token.tokens} file={file} title={currentHeading} /></blockquote>;
      case 'hr': return <hr key={index} />;
      default: return null;
    }
  });
}
