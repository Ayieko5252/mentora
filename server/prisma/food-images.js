// Maps a recipe (dish + cuisine) to a real food photo from the local pool
// (server/prisma/data/food, downloaded from TheMealDB). Deterministic per slug.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FOOD_DIR = path.join(__dirname, "data", "food");

let MANIFEST = {};
try {
  MANIFEST = JSON.parse(fs.readFileSync(path.join(FOOD_DIR, "manifest.json"), "utf-8"));
} catch {
  MANIFEST = {};
}
const ALL = Object.values(MANIFEST).flat();

// Dish-matched photos (one per distinct dish), keyed by dish slug.
let DISH_MAP = {};
try {
  DISH_MAP = JSON.parse(fs.readFileSync(path.join(FOOD_DIR, "dishes", "dish-manifest.json"), "utf-8"));
} catch {
  DISH_MAP = {};
}

const slugify = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Ordered keyword → category rules (first match wins).
const RULES = [
  [/salmon|shrimp|fish|ceviche|prawn|seafood/, "Seafood"],
  [/chicken|katsu|teriyaki/, "Chicken"],
  [/ribs|pork|feijoada/, "Pork"],
  [/lamb|skewer|moussaka|tagine/, "Lamb"],
  [/beef|stir-fry|goulash/, "Beef"],
  [/pasta|gnocchi|ramen|pho|noodle|pesto/, "Pasta"],
  [/dumpling|empanada|shakshuka|fritter|falafel/, "Starter"],
  [/rice|mash|flatbread|jollof|biryani|bibimbap|paella/, "Side"],
  [/omelette|breakfast/, "Breakfast"],
  [/tofu|vegetable|chickpea|cauliflower|eggplant|spinach|zucchini|corn|mushroom|risotto|pepper|cabbage/, "Vegetarian"],
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Returns a served URL for a recipe's food photo. Prefers a dish-matched photo
// (e.g. "ramen" -> a ramen photo); falls back to a category pool, then to any.
export function imageUrlFor(dish, slug) {
  // 1) exact dish match
  const dishSlug = slugify(dish);
  if (DISH_MAP[dishSlug]) return `/media/food/dishes/${DISH_MAP[dishSlug]}`;

  if (ALL.length === 0) return null;
  // 2) category pool by keyword
  const d = (dish || "").toLowerCase();
  let pool = null;
  for (const [re, cat] of RULES) {
    if (re.test(d) && MANIFEST[cat] && MANIFEST[cat].length) {
      pool = MANIFEST[cat];
      break;
    }
  }
  if (!pool) pool = ALL;
  const file = pool[hash(slug) % pool.length];
  return `/media/food/${file}`;
}
