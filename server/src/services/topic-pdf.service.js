import PDFDocument from "pdfkit";

// ---------------------------------------------------------------------------
// Per-topic PDF exports:
//   - buildTopicNotesPdf(course, topic)  -> comprehensive notes for one topic
//   - buildTopicLabsPdf(course, topic)   -> the 3 lab instructions for one topic
// Both return a Promise<Buffer> and share a small Markdown renderer.
// ---------------------------------------------------------------------------

const INK = "#1a1d24";
const MUTED = "#6b7280";
const ACCENT = "#3454d1";

// Replace glyphs the standard PDF fonts (WinAnsi) can't render with ASCII-safe
// equivalents, so notes/labs never show garbled characters.
function pdfSafe(s) {
  return (s || "")
    .replace(/[→➔➜⟶]/g, "->")
    .replace(/[←⟵]/g, "<-")
    .replace(/[↔⟷]/g, "<->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...");
}

function stripInline(s) {
  return pdfSafe(s).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/_([^_]+)_/g, "$1");
}

// Removes per-page "chrome" so pages flow as one comprehensive document:
// the "# Module N …" (or "# Opportunities") page heading and the
// "_tool · … · page X of Y_" meta line. Section headings (##) are kept.
function stripPageChrome(md) {
  return (md || "")
    .split("\n")
    .filter((line) => {
      const l = line.trim();
      if (/^#\s/.test(l)) return false; // single-hash page heading
      if (/^_.*page\s+\d+\s+of\s+\d+.*_$/i.test(l)) return false; // meta line
      return true;
    })
    .join("\n")
    .replace(/^\n+/, "");
}

const cleanTitle = (s) => (s || "").replace(/^Module\s+\d+:\s*/i, "");

// Renders a subset of Markdown, handling fenced code blocks as monospace boxes
// (so the ASCII lab drawings keep their alignment).
function renderMarkdown(doc, md) {
  const lines = (md || "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { buf.push(lines[i]); i++; }
      i++;
      // Monospace block (keeps ASCII drawings aligned) — no box, no lines.
      doc.moveDown(0.3);
      doc.font("Courier").fontSize(9).fillColor(INK).text(pdfSafe(buf.join("\n")), { width: 483 });
      doc.moveDown(0.5);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const size = [0, 17, 14, 12, 11][h[1].length] || 11;
      doc.moveDown(0.4).fillColor(INK).font("Helvetica-Bold").fontSize(size).text(stripInline(h[2]));
      doc.moveDown(0.15);
      i++; continue;
    }
    if (line.startsWith("> ")) {
      doc.fillColor(ACCENT).font("Helvetica-Oblique").fontSize(10).text(stripInline(line.slice(2)), { indent: 12 });
      i++; continue;
    }
    const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const bullet = /^\s*\d+\./.test(line) ? line.trim().split(".")[0] + "." : "•";
      doc.fillColor(INK).font("Helvetica").fontSize(10.5).text(`${bullet}  ${stripInline(li[1])}`, { indent: 12 });
      i++; continue;
    }
    if (line.trim() === "") { doc.moveDown(0.4); i++; continue; }
    doc.fillColor(INK).font("Helvetica").fontSize(10.5).text(stripInline(line));
    i++;
  }
}

// Clean header — no rule lines, just the course, title and kind.
function cover(doc, course, topic, kind) {
  doc.fillColor(ACCENT).fontSize(11).font("Helvetica-Bold").text(course.title.toUpperCase());
  doc.moveDown(0.4);
  doc.fillColor(INK).fontSize(22).font("Helvetica-Bold").text(cleanTitle(topic.title));
  doc.moveDown(0.2);
  doc.fillColor(MUTED).fontSize(12).font("Helvetica").text(kind);
  doc.moveDown(0.9);
}

function pageNumbers(doc, label) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.fillColor(MUTED).fontSize(8).font("Helvetica").text(
      `${label} · page ${i + 1} of ${range.count}`,
      56, doc.page.height - 40, { align: "center", width: doc.page.width - 112 }
    );
  }
}

function makeDoc() {
  return new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
}

// Course outline PDF — the map of all parts, clean header + list, no rules.
export function buildOutlinePdf(course) {
  return new Promise((resolve, reject) => {
    const doc = makeDoc();
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor(ACCENT).fontSize(11).font("Helvetica-Bold").text((course.discipline?.name || "MENTORA").toUpperCase());
    doc.moveDown(0.4);
    doc.fillColor(INK).fontSize(24).font("Helvetica-Bold").text(course.title);
    doc.moveDown(0.2);
    doc.fillColor(MUTED).fontSize(12).font("Helvetica").text("Course outline");
    doc.moveDown(0.4);
    if (course.category) doc.fillColor(MUTED).fontSize(10).text(`${course.category} · ${course.level}`);
    doc.moveDown(0.6);
    doc.fillColor(INK).fontSize(11).font("Helvetica").text(course.summary, { width: 483 });
    doc.moveDown(0.8);

    doc.fillColor(INK).fontSize(14).font("Helvetica-Bold").text("What you will study");
    doc.moveDown(0.3);
    for (const t of course.topics) {
      const assessed = t.assessment ? "assessment" : "not assessed";
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(11).text(`${t.order}.  ${t.title}`);
      doc.fillColor(MUTED).font("Helvetica").fontSize(9.5)
        .text(`${t._count.notes} pages of notes · ${t._count.labs} labs · ${assessed}`, { indent: 14 });
      doc.moveDown(0.25);
    }

    doc.moveDown(0.5);
    doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9.5).text(
      "Pass the course with a 60% overall average and at least 50% on the self-assessments. " +
      "Each part above is downloadable as its own PDF.", { width: 483 }
    );
    doc.end();
  });
}

export function buildTopicNotesPdf(course, topic) {
  return new Promise((resolve, reject) => {
    const doc = makeDoc();
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    cover(doc, course, topic, "Comprehensive study notes");
    for (const n of topic.notes) {
      renderMarkdown(doc, stripPageChrome(n.contentMarkdown));
      doc.moveDown(0.5);
    }
    pageNumbers(doc, `${course.title} — ${cleanTitle(topic.title)}`);
    doc.end();
  });
}

// Whole-course notes as one comprehensive document: cover, contents, then each
// topic as a section (its title once) followed by its notes flowing — no
// "Module N" clutter, no per-page labels.
export function buildCourseNotesPdf(course) {
  return new Promise((resolve, reject) => {
    const doc = makeDoc();
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Cover
    doc.fillColor(ACCENT).fontSize(11).font("Helvetica-Bold").text((course.discipline?.name || "MENTORA").toUpperCase());
    doc.moveDown(0.4);
    doc.fillColor(INK).fontSize(26).font("Helvetica-Bold").text(course.title);
    doc.moveDown(0.2);
    doc.fillColor(MUTED).fontSize(13).font("Helvetica").text("Study notes");
    if (course.category) { doc.moveDown(0.3); doc.fontSize(10).text(`${course.category} · ${course.level}`); }
    if (course.summary) { doc.moveDown(0.6); doc.fillColor(INK).fontSize(11).text(course.summary, { width: 483 }); }

    // Contents
    doc.addPage();
    doc.fillColor(INK).fontSize(16).font("Helvetica-Bold").text("Contents");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(11).fillColor(INK);
    for (const t of course.topics) {
      doc.text(cleanTitle(t.title));
      doc.moveDown(0.2);
    }

    // Body — one section per topic
    for (const t of course.topics) {
      doc.addPage();
      doc.fillColor(INK).fontSize(19).font("Helvetica-Bold").text(cleanTitle(t.title));
      doc.moveDown(0.5);
      for (const n of t.notes) {
        renderMarkdown(doc, stripPageChrome(n.contentMarkdown));
        doc.moveDown(0.5);
      }
    }
    pageNumbers(doc, `${course.title} — study notes`);
    doc.end();
  });
}

export function buildTopicLabsPdf(course, topic) {
  return new Promise((resolve, reject) => {
    const doc = makeDoc();
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    cover(doc, course, topic, "Lab instructions (3 labs)");
    topic.labs.forEach((lab, idx) => {
      if (idx > 0) doc.moveDown(0.6);
      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(13).text(lab.title);
      doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(10)
        .text(`Objective: ${lab.objective}  ·  ~${lab.estimatedMinutes} min`);
      doc.moveDown(0.2);
      renderMarkdown(doc, lab.instructionsMarkdown);
    });
    pageNumbers(doc, `${course.title} — ${topic.title} — labs`);
    doc.end();
  });
}
