// Minimal, dependency-free Markdown renderer covering the subset used by the
// seeded content: headings, blockquotes, fenced code, ordered/unordered lists,
// bold, inline code, and paragraphs. Text is escaped before inline formatting,
// so no untrusted HTML is injected.
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function toHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  let listType = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (line.trim().startsWith("```")) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing fence
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      i++;
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      i++;
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }

    if (line.trim() === "") {
      closeList();
      i++;
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeList();
  return out.join("\n");
}

export default function Markdown({ children }) {
  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: toHtml(children || "") }} />
  );
}
