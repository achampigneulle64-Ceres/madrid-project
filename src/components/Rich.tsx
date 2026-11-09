import type { ReactNode } from 'react';

/**
 * Texte enrichi des explications :
 * **mot** surligné · *mot* italique · [mot] gras · {m:mot} masculin · {f:mot} féminin
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\{[mf]:[^}]+\}|\[[^\]]+\])/;

export function Rich({ text }: { text: string }): ReactNode {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <b key={i} className="hl"><Rich text={p.slice(2, -2)} /></b>;
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <i key={i}><Rich text={p.slice(1, -1)} /></i>;
        if (p.startsWith('{m:')) return <b key={i} className="masc">{p.slice(3, -1)}</b>;
        if (p.startsWith('{f:')) return <b key={i} className="fem">{p.slice(3, -1)}</b>;
        if (p.startsWith('[') && p.endsWith(']')) return <b key={i}>{p.slice(1, -1)}</b>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
