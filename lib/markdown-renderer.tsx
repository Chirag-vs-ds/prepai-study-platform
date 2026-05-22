import React from "react";

// Custom parser to handle Markdown formatting, bold/italic, LaTeX formulas, lists and admonitions beautifully without extra heavy packages.
export const formatInlineStyles = (text: string): string => {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-card-foreground">$1</strong>');
  
  // Italic *text*
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Block math $$formula$$
  html = html.replace(/\$\$(.*?)\$\$/g, '<div class="my-3 p-3 bg-secondary/40 border border-border rounded text-center font-serif italic text-primary overflow-x-auto select-all">$1</div>');

  // Inline math $formula$
  html = html.replace(/\$(.*?)\$/g, '<code class="px-1.5 py-0.5 bg-secondary/60 rounded font-serif italic text-primary select-all">$1</code>');

  // Code snippets `code`
  html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-secondary/80 rounded font-mono text-xs text-primary">$1</code>');

  // LaTeX symbol replacements for better local rendering
  html = html
    .replace(/\\Phi_B/g, "Φ<sub>B</sub>")
    .replace(/\\vec\{([a-zA-Z])\}/g, '<span class="overline">$1</span>')
    .replace(/\\cdot/g, " • ")
    .replace(/\\cos/g, "cos")
    .replace(/\\sin/g, "sin")
    .replace(/\\theta/g, "θ")
    .replace(/\\pi/g, "π")
    .replace(/\\approx/g, "≈")
    .replace(/\\frac\{d\\Phi_B\}\{dt\}/g, "dΦ<sub>B</sub>/dt")
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, "($1)/($2)")
    .replace(/\\int/g, "∫")
    .replace(/\\,dx/g, " dx")
    .replace(/\\text\{([a-zA-Z0-9\s]+)\}/g, "$1")
    .replace(/\\quad/g, "  ")
    .replace(/\\to/g, " → ")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\Delta\s/g, "Δ ")
    .replace(/\\beta/g, "β")
    .replace(/\\alpha/g, "α")
    .replace(/\\gamma/g, "γ")
    .replace(/\\degree/g, "°")
    .replace(/\\mu/g, "μ");

  return html;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  textSizeClass?: string; // e.g. "text-xs md:text-sm" or "text-sm"
}

export function MarkdownRenderer({ content, className = "space-y-1", textSizeClass = "text-sm" }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const flushList = (key: number) => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1">
          {currentList.map((item, idx) => (
            <li
              key={idx}
              className={`${textSizeClass} text-muted-foreground`}
              dangerouslySetInnerHTML={{ __html: formatInlineStyles(item) }}
            />
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push(
          <pre key={`code-${i}`} className="my-3 p-3 bg-zinc-950 border border-border rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList(i);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const itemContent = line.trim().replace(/^[\*\-]\s+/, '');
      currentList.push(itemContent);
      continue;
    } else {
      flushList(i);
    }

    if (line.startsWith('### ')) {
      const heading = line.replace('### ', '');
      blocks.push(
        <h3 key={i} className="text-sm md:text-base font-semibold text-primary mt-4 mb-2 flex items-center gap-1.5" dangerouslySetInnerHTML={{ __html: formatInlineStyles(heading) }} />
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      const heading = line.replace('#### ', '');
      blocks.push(
        <h4 key={i} className="text-xs md:text-sm font-semibold text-card-foreground mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formatInlineStyles(heading) }} />
      );
      continue;
    }

    if (line.trim() === '---') {
      blocks.push(<hr key={i} className="my-4 border-border" />);
      continue;
    }

    if (line.startsWith('> [!TIP]')) {
      let alertContent = "";
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('> ')) {
        alertContent += lines[j].replace(/^>\s+/, '') + "\n";
        j++;
      }
      blocks.push(
        <div key={i} className="my-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 flex flex-col gap-1">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1">💡 Tip</span>
          <div className={`${textSizeClass} text-emerald-300/90`} dangerouslySetInnerHTML={{ __html: formatInlineStyles(alertContent.trim()) }} />
        </div>
      );
      i = j - 1;
      continue;
    }

    if (line.startsWith('> [!NOTE]')) {
      let alertContent = "";
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('> ')) {
        alertContent += lines[j].replace(/^>\s+/, '') + "\n";
        j++;
      }
      blocks.push(
        <div key={i} className="my-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 flex flex-col gap-1">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1">📝 Note</span>
          <div className={`${textSizeClass} text-blue-300/90`} dangerouslySetInnerHTML={{ __html: formatInlineStyles(alertContent.trim()) }} />
        </div>
      );
      i = j - 1;
      continue;
    }

    if (line.startsWith('> [!WARNING]')) {
      let alertContent = "";
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('> ')) {
        alertContent += lines[j].replace(/^>\s+/, '') + "\n";
        j++;
      }
      blocks.push(
        <div key={i} className="my-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 flex flex-col gap-1">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1">⚠️ Warning</span>
          <div className={`${textSizeClass} text-amber-300/90`} dangerouslySetInnerHTML={{ __html: formatInlineStyles(alertContent.trim()) }} />
        </div>
      );
      i = j - 1;
      continue;
    }

    if (line.trim() !== '') {
      blocks.push(
        <p key={i} className={`${textSizeClass} text-muted-foreground leading-relaxed my-2`} dangerouslySetInnerHTML={{ __html: formatInlineStyles(line) }} />
      );
    }
  }

  flushList(lines.length);

  return <div className={className}>{blocks}</div>;
}
