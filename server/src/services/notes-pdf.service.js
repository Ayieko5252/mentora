import PDFDocument from "pdfkit";

// Renders a course's notes to a styled PDF and resolves with a Buffer.
// A small Markdown subset is interpreted line-by-line (headings, blockquotes,
// lists, fenced code, bold) — enough for the seeded/real note content.
export function buildNotesPdfBuffer(course) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const INK = "#1a1d24";
    const MUTED = "#6b7280";
    const ACCENT = "#3454d1";

    // ---- Cover ----
    doc.fillColor(ACCENT).fontSize(11).font("Helvetica-Bold").text((course.discipline?.name || "MENTORA").toUpperCase());
    doc.moveDown(0.5);
    doc.fillColor(INK).fontSize(28).font("Helvetica-Bold").text(course.title);
    doc.moveDown(0.3);
    doc.fillColor(MUTED).fontSize(13).font("Helvetica").text("Study Notes");
    doc.moveDown(1);
    doc.fillColor(INK).fontSize(11).font("Helvetica");
    if (course.category) doc.text(`Category: ${course.category}`);
    doc.text(`Level: ${course.level}`);
    doc.text(`Modules: ${course.topics.length}`);
    doc.moveDown(1);
    doc.fillColor(MUTED).fontSize(10).font("Helvetica-Oblique").text(course.summary, { width: 440 });
    if (course.isPlaceholder) {
      doc.moveDown(0.8);
      doc.fillColor("#b45309").text("Note: structured placeholder content for demonstration.");
    }

    // ---- Contents ----
    doc.addPage();
    doc.fillColor(INK).fontSize(18).font("Helvetica-Bold").text("Contents");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica").fillColor(INK);
    for (const t of course.topics) {
      doc.text(`${t.order}.  ${t.title}`);
      doc.moveDown(0.2);
    }

    // ---- Body ----
    const renderLine = (raw) => {
      const line = raw.replace(/\r/g, "");
      if (line.trim() === "") {
        doc.moveDown(0.4);
        return;
      }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        const size = [0, 17, 14, 12, 11][h[1].length] || 11;
        doc.moveDown(0.4).fillColor(INK).font("Helvetica-Bold").fontSize(size).text(stripInline(h[2]));
        doc.moveDown(0.1);
        return;
      }
      if (line.startsWith("> ")) {
        doc.fillColor(ACCENT).font("Helvetica-Oblique").fontSize(10).text(stripInline(line.slice(2)), { indent: 12 });
        return;
      }
      const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
      if (li) {
        doc.fillColor(INK).font("Helvetica").fontSize(10.5).text(`•  ${stripInline(li[1])}`, { indent: 12 });
        return;
      }
      doc.fillColor(INK).font("Helvetica").fontSize(10.5).text(stripInline(line));
    };

    for (const t of course.topics) {
      doc.addPage();
      doc.fillColor(ACCENT).fontSize(10).font("Helvetica-Bold").text(`MODULE ${t.order}`);
      doc.fillColor(INK).fontSize(16).font("Helvetica-Bold").text(t.title);
      doc.moveDown(0.5);
      for (const n of t.notes) {
        const body = n.contentMarkdown || "";
        let inCode = false;
        for (const rawLine of body.split("\n")) {
          if (rawLine.trim().startsWith("```")) {
            inCode = !inCode;
            continue;
          }
          if (inCode) {
            doc.fillColor("#374151").font("Courier").fontSize(9).text(rawLine, { indent: 12 });
            continue;
          }
          renderLine(rawLine);
        }
        doc.moveDown(0.5);
      }
    }

    // Page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fillColor(MUTED).fontSize(8).font("Helvetica").text(
        `Mentora · ${course.title} · page ${i + 1} of ${range.count}`,
        56,
        doc.page.height - 40,
        { align: "center", width: doc.page.width - 112 }
      );
    }

    doc.end();
  });
}

// Strip markdown bold/inline-code markers for plain PDF text.
function stripInline(s) {
  return s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/_([^_]+)_/g, "$1");
}
