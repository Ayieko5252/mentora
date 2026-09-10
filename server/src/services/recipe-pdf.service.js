import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { serverPath } from "../lib/paths.js";

// ---------------------------------------------------------------------------
// Recipe booklet PDF — mirrors the supplied Canva template:
//   grid-paper background · rounded chocolate card · serif display titles ·
//   a "by …" pill · an ingredients page · one numbered step page per step ·
//   a food photo on each page.
//
// Streams directly to the Express response (so 100-recipe booklets don't buffer
// in memory). Same generator renders a single recipe or a whole booklet.
// ---------------------------------------------------------------------------

const FOOD_DIR = serverPath("prisma", "data", "food");

// Palette sampled from the template
const BROWN = "#3b2a22";
const CREAM = "#f4ede6";
const CREAM_DIM = "#d8ccc0";
const PILL = "#f4ede6";
const GRID = "#e2e3e6";
const PAGE = { w: 960, h: 540 };

function resolveImage(recipe) {
  if (!recipe.imageUrl) return null;
  // imageUrl is "/media/food/<...>"; keep any subpath (e.g. dishes/ramen.jpg).
  const rel = recipe.imageUrl.replace(/^\/media\/food\//, "");
  const p = path.join(FOOD_DIR, rel);
  return fs.existsSync(p) ? p : null;
}

function drawBackground(doc) {
  doc.rect(0, 0, PAGE.w, PAGE.h).fill("#ffffff");
  doc.save().lineWidth(0.6).strokeColor(GRID).opacity(1);
  for (let x = 30; x < PAGE.w; x += 30) doc.moveTo(x, 0).lineTo(x, PAGE.h).stroke();
  for (let y = 30; y < PAGE.h; y += 30) doc.moveTo(0, y).lineTo(PAGE.w, y).stroke();
  doc.restore();
}

function card(doc, x, y, w, h, r = 26, color = BROWN) {
  doc.save().roundedRect(x, y, w, h, r).fill(color).restore();
}

function photo(doc, imgPath, x, y, w, h, r = 20) {
  if (!imgPath) {
    // Decorative fallback if no image is available.
    doc.save().roundedRect(x, y, w, h, r).fill("#5a4438").restore();
    doc.save().fillColor(CREAM_DIM).font("Times-Italic").fontSize(14)
      .text("food photo", x, y + h / 2 - 8, { width: w, align: "center" }).restore();
    return;
  }
  doc.save();
  doc.roundedRect(x, y, w, h, r).clip();
  doc.image(imgPath, x, y, { cover: [w, h], align: "center", valign: "center" });
  doc.restore();
}

function pill(doc, text, x, y) {
  const padX = 18;
  doc.font("Times-Italic").fontSize(15);
  const tw = doc.widthOfString(text);
  const w = tw + padX * 2;
  const h = 34;
  doc.save().roundedRect(x, y, w, h, h / 2).fill(PILL).restore();
  doc.fillColor(BROWN).text(text, x + padX, y + 9, { lineBreak: false });
}

// ----- Page templates ------------------------------------------------------

function coverPage(doc, recipe, img, kicker = "RECIPE") {
  drawBackground(doc);
  card(doc, 40, 40, 560, 460);
  photo(doc, img, 628, 84, 292, 372, 24);

  doc.fillColor(CREAM).font("Times-Bold");
  doc.fontSize(52).text(recipe.title.toUpperCase(), 84, 150, { width: 470, lineGap: -6 });
  doc.fontSize(20).fillColor(CREAM_DIM).font("Times-Roman")
    .text(kicker, 86, doc.y + 6);
  pill(doc, `by ${recipe.author || "The Mentora Kitchen"}`, 86, doc.y + 20);
}

function ingredientsPage(doc, recipe, img) {
  drawBackground(doc);
  card(doc, 40, 40, 560, 460);
  photo(doc, img, 628, 84, 292, 372, 24);

  doc.fillColor(CREAM).font("Times-Bold").fontSize(30)
    .text("HERE ARE THE INGREDIENTS YOU NEED", 84, 90, { width: 460, lineGap: 2 });

  doc.font("Helvetica").fontSize(13).fillColor(CREAM_DIM)
    .text(`${recipe.servings || "Serves 4"}  ·  ${recipe.totalTime || "~40 min"}`, 84, doc.y + 10);

  const list = recipe.ingredients && recipe.ingredients.length
    ? recipe.ingredients
    : ["Ingredients not specified"];
  let y = doc.y + 14;
  doc.fillColor(CREAM).font("Helvetica").fontSize(13.5);
  for (const it of list) {
    doc.circle(92, y + 7, 2.2).fill(CREAM);
    doc.fillColor(CREAM).text(it, 104, y, { width: 430 });
    y = doc.y + 6;
  }
}

function stepPage(doc, n, total, step, img) {
  drawBackground(doc);
  card(doc, 40, 40, 560, 460);
  photo(doc, img, 628, 110, 292, 320, 24);

  doc.fillColor(CREAM).font("Times-Italic").fontSize(46).text(`${n}.`, 86, 150);
  doc.font("Times-Bold").fontSize(30)
    .text((step.title || `Step ${n}`).toUpperCase(), 150, 150, { width: 400, lineGap: 1 });
  doc.font("Helvetica").fontSize(12.5).fillColor(CREAM_DIM)
    .text(step.description || "", 150, doc.y + 14, { width: 400, lineGap: 3 });

  doc.font("Helvetica").fontSize(10).fillColor(CREAM_DIM)
    .text(`Step ${n} of ${total}`, 86, 470);
}

function closingPage(doc, recipe) {
  drawBackground(doc);
  card(doc, 40, 40, 880, 460);
  doc.fillColor(CREAM).font("Times-Bold").fontSize(40)
    .text(`Enjoy your ${recipe.title}!`, 80, 210, { width: 800, align: "center" });
  doc.font("Times-Italic").fontSize(15).fillColor(CREAM_DIM)
    .text("The Mentora Kitchen", 80, doc.y + 14, { width: 800, align: "center" });
}

// Renders every page for one recipe. `first` uses the doc's existing page.
function renderRecipe(doc, recipe, { first = false } = {}) {
  const img = resolveImage(recipe);
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  if (!first) doc.addPage();
  coverPage(doc, recipe, img);

  doc.addPage();
  ingredientsPage(doc, recipe, img);

  steps.forEach((s, i) => {
    doc.addPage();
    stepPage(doc, i + 1, steps.length, s, img);
  });

  doc.addPage();
  closingPage(doc, recipe);
}

function makeDoc() {
  return new PDFDocument({ size: [PAGE.w, PAGE.h], margin: 0, bufferPages: true });
}

// Single recipe booklet -> streams to res.
export function pipeRecipeBooklet(res, recipe) {
  const doc = makeDoc();
  doc.pipe(res);
  renderRecipe(doc, recipe, { first: true });
  doc.end();
}

// Full booklet: a cover, then every recipe in the same format -> streams to res.
export function pipeBooklet(res, booklet, recipes) {
  const doc = makeDoc();
  doc.pipe(res);

  // Booklet cover
  drawBackground(doc);
  card(doc, 40, 40, 880, 460);
  doc.fillColor(CREAM).font("Times-Bold").fontSize(56)
    .text(booklet.title.toUpperCase(), 80, 150, { width: 800, align: "center", lineGap: -4 });
  doc.font("Times-Roman").fontSize(18).fillColor(CREAM_DIM)
    .text(`${recipes.length} recipes`, 80, doc.y + 10, { width: 800, align: "center" });
  pill(doc, "The Mentora Kitchen", PAGE.w / 2 - 90, doc.y + 24);

  // Contents
  doc.addPage();
  drawBackground(doc);
  card(doc, 40, 40, 880, 460);
  doc.fillColor(CREAM).font("Times-Bold").fontSize(30).text("CONTENTS", 80, 74);
  doc.font("Helvetica").fontSize(11).fillColor(CREAM);
  let cy = 130, col = 0;
  recipes.forEach((r, i) => {
    const x = 80 + col * 430;
    doc.fillColor(CREAM).text(`${i + 1}.  ${r.title}`, x, cy, { width: 400, lineBreak: false });
    cy += 20;
    if (cy > 470) { cy = 130; col += 1; }
  });

  for (const r of recipes) renderRecipe(doc, r, { first: false });
  doc.end();
}
