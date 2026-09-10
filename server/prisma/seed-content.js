// ---------------------------------------------------------------------------
// Content generators.
//
// Produces finished, professional-reading study material and recipes for the
// catalog. The prose is generated from templates (not hand-authored per tool),
// but reads as real content and satisfies every structural rule:
//   - each course: 10 topics
//   - each topic: 15 note pages, 3 labs, 1 assessment of 10 questions
//   - each question: 4 choices, exactly one correct, with an explanation
//   - each recipe: title, brief history, ingredients, and step-by-step method
//
// (To author genuinely tool-specific prose at scale, run the Claude pipeline in
// prisma/generate-content.js with an ANTHROPIC_API_KEY.)
// ---------------------------------------------------------------------------

export const NOTES_PER_TOPIC = 15;
export const LABS_PER_TOPIC = 3;
export const TOPICS_PER_COURSE = 10;
export const QUESTIONS_PER_ASSESSMENT = 10;
export const CHOICES_PER_QUESTION = 4;
export const RECIPES_PER_BOOKLET = 100;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// --- Engineering Software course catalog ---------------------------------
// The 200 real engineering software tools that make up the launch catalog,
// grouped by discipline category. Each tool becomes one course.
export const ENGINEERING_TOOL_CATEGORIES = [
  {
    category: "Mechanical / General CAD",
    tools: [
      "AutoCAD", "SolidWorks", "Autodesk Inventor", "PTC Creo", "Siemens NX",
      "CATIA", "Fusion 360", "Onshape", "FreeCAD", "Rhino 3D (Rhinoceros)",
      "SketchUp", "Solid Edge", "DraftSight", "BricsCAD", "IronCAD",
      "KeyCreator", "Alibre Design", "ZW3D", "TurboCAD", "Creo Elements/Direct",
    ],
  },
  {
    category: "CAE / FEA",
    tools: [
      "ANSYS Mechanical", "Abaqus (SIMULIA)", "MSC Nastran", "Altair HyperWorks",
      "Altair OptiStruct", "LS-DYNA", "COMSOL Multiphysics", "Autodesk Nastran",
      "NEi Nastran", "Marc (MSC)", "Femap", "HyperMesh", "Simcenter 3D",
      "RADIOSS", "CalculiX", "Code_Aster", "Adams (MSC — multibody dynamics)",
      "RecurDyn", "PLAXIS (geotechnical FEA)", "midas NFX",
    ],
  },
  {
    category: "CFD",
    tools: [
      "ANSYS Fluent", "ANSYS CFX", "Siemens STAR-CCM+", "OpenFOAM", "Autodesk CFD",
      "SimScale", "COMSOL CFD Module", "FloEFD", "Numeca", "SU2", "FLOW-3D",
      "Converge CFD", "PowerFLOW", "Tecplot (post-processing)",
      "ParaView (visualization)",
    ],
  },
  {
    category: "Electrical / Electronics / PCB (EDA)",
    tools: [
      "Altium Designer", "KiCad", "Cadence Allegro", "Cadence OrCAD",
      "Mentor/Siemens PADS", "Mentor/Siemens Xpedition", "Eagle (Autodesk)",
      "EasyEDA", "Proteus", "DipTrace", "LTspice", "PSpice", "Multisim",
      "NgSpice", "Micro-Cap", "Cadence Virtuoso", "Synopsys Design Compiler",
      "Cadence Genus", "Xilinx Vivado", "Intel Quartus Prime",
    ],
  },
  {
    category: "Simulation & Systems",
    tools: [
      "MATLAB", "Simulink", "Simscape", "GNU Octave", "Scilab", "LabVIEW",
      "Wolfram Mathematica", "Maple", "PLECS", "ETAP (power systems)",
      "DIgSILENT PowerFactory", "PSCAD", "PSS/E", "Ansys Twin Builder",
      "Modelica / OpenModelica", "Dymola", "GT-SUITE", "AMESim (Simcenter)",
      "Aspen HYSYS (process)", "Aspen Plus",
    ],
  },
  {
    category: "Chemical / Process Engineering",
    tools: [
      "Aspen HYSYS", "Aspen Plus (process)", "AVEVA PRO/II", "ChemCAD", "DWSIM",
      "gPROMS", "COCO Simulator", "AVEVA Process Simulation",
      "Aspen EDR (heat exchangers)", "HTRI Xchanger Suite",
      "PIPESIM (flow assurance)", "OLGA (multiphase flow)",
      "Aspen Flare System Analyzer", "Symmetry (Schlumberger)", "UniSim Design",
    ],
  },
  {
    category: "Civil / Structural / Infrastructure",
    tools: [
      "STAAD.Pro", "ETABS", "SAP2000", "SAFE", "RISA-3D", "RAM Structural System",
      "Tekla Structures", "Robot Structural Analysis", "SCIA Engineer",
      "midas Civil", "midas Gen", "LUSAS", "RFEM (Dlubal)", "RSTAB (Dlubal)",
      "CSiBridge", "Autodesk Civil 3D", "Bentley OpenRoads", "Bentley MicroStation",
      "InRoads", "PLAXIS 2D/3D (geotechnical)", "GeoStudio", "Settle3",
      "Rocscience Slide", "HEC-RAS (hydraulics)", "HEC-HMS (hydrology)",
      "EPANET (water distribution)", "SWMM (stormwater)", "WaterGEMS (Bentley)",
      "SewerGEMS (Bentley)", "Primavera P6 (project controls)",
    ],
  },
  {
    category: "BIM / Architecture / MEP",
    tools: [
      "Autodesk Revit", "ArchiCAD", "Navisworks", "Bentley OpenBuildings",
      "Vectorworks", "AutoCAD MEP", "Trimble SketchUp Pro", "Trimble Tekla BIMsight",
      "Solibri Model Checker", "Dynamo (Revit visual programming)",
      "Grasshopper (Rhino parametric)", "IES Virtual Environment (building energy)",
      "DesignBuilder (EnergyPlus)", "EnergyPlus", "TRNSYS", "HAP (Carrier HVAC)",
      "Trane TRACE 700 / 3D Plus", "Ductulator / Elite software (MEP)",
      "AFT Fathom (piping)", "Pipe Flow Expert",
    ],
  },
  {
    category: "Manufacturing / CAM / CNC",
    tools: [
      "Mastercam", "Autodesk PowerMill", "Autodesk FeatureCAM", "Siemens NX CAM",
      "Fusion 360 Manufacturing (CAM)", "GibbsCAM", "Edgecam", "SolidCAM",
      "Esprit CAM", "HSMWorks", "Cimatron", "WorkNC", "Vericut (machining simulation)",
      "Moldflow (Autodesk — injection molding)", "Moldex3D",
    ],
  },
  {
    category: "Aerospace / Automotive / Specialized Simulation",
    tools: [
      "XFOIL (airfoil analysis)", "XFLR5", "OpenVSP (vehicle sketch pad)",
      "ANSYS Fensap-ICE", "CarSim", "IPG CarMaker", "Adams/Car", "dSPACE",
      "Simpack (multibody)", "GT-POWER (engine simulation)",
    ],
  },
  {
    category: "Software / Systems / Data Engineering",
    tools: [
      "Git", "Visual Studio Code", "Visual Studio", "Eclipse", "IntelliJ IDEA",
      "Jupyter Notebook", "Docker", "Kubernetes", "Jenkins",
      "Python (NumPy / SciPy)", "R", "Ansible", "Terraform",
      "Jira (engineering project management)",
      "Enterprise Architect (UML / systems modeling)",
    ],
  },
];

const SW_LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];

// Deterministic pseudo-random from a string seed (no external deps).
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

// Returns exactly 200 course descriptors, one per real engineering tool.
// Levels are cycled deterministically so the catalog's level filter stays
// useful; unique slugs are guaranteed even when a tool name repeats.
export function generateCourseDescriptors() {
  const out = [];
  const seenSlugs = new Set();
  let index = 0;

  for (const group of ENGINEERING_TOOL_CATEGORIES) {
    for (const tool of group.tools) {
      const level = SW_LEVELS[index % SW_LEVELS.length];

      // Ensure a unique slug even for duplicate tool names across categories.
      let base = slugify(tool);
      let slug = base;
      let n = 2;
      while (seenSlugs.has(slug)) {
        slug = `${base}-${n++}`;
      }
      seenSlugs.add(slug);

      out.push({
        title: tool,
        slug,
        level,
        category: group.category,
        subject: tool,
        summary: `Master ${tool}, a ${group.category} tool, from the ground up. This ${level.toLowerCase()} course covers it through structured notes, 30 hands-on labs, and a self-assessment for every topic.`,
      });
      index += 1;
    }
  }
  return out; // 200 tools total
}

// --- Engineering Tools, expansion set (200 more tools, 9 categories) --------
export const ENGINEERING_TOOL_CATEGORIES_2 = [
  {
    category: "Mechanical / CAD & Modeling",
    tools: [
      "VariCAD", "SpaceClaim", "Creo Direct", "NX Layout", "Cobalt (Ashlar-Vellum)",
      "Graphite (Ashlar-Vellum)", "progeCAD", "nanoCAD", "Medusa4", "CADdy++",
      "punch! ViaCAD", "Shark FX", "SelfCAD", "Tinkercad", "OpenSCAD",
      "Blender (mechanical/product)", "Moment of Inspiration (MoI)", "Plasticity",
      "Solid Edge 2D Drafting", "GstarCAD",
    ],
  },
  {
    category: "FEA / Structural Simulation",
    tools: [
      "Nastran In-CAD", "Simcenter Femap", "Ansys LS-DYNA", "Ansys Sherlock",
      "Ansys Motion", "Simulia Tosca", "Simulia fe-safe", "Simulia Isight",
      "Pam-Crash (ESI)", "Virtual Performance Solution (ESI)", "Permas", "Z88 Aurora",
      "Elmer FEM", "FEATool Multiphysics", "Agros2D", "Kratos Multiphysics",
      "FEBio", "Impact FEM", "Mystran", "Frame3DD",
    ],
  },
  {
    category: "CFD / Thermal / Multiphysics",
    tools: [
      "Ansys Icepak", "6SigmaET", "FloTHERM (Siemens)", "FloTHERM XT",
      "Cradle CFD (scFLOW)", "Cradle scSTREAM", "CFD-ACE+", "Fidelity Fine/Turbo",
      "TCFD (OpenFOAM-based)", "Caedium", "Helyx (ENGYS)", "Nektar++", "Basilisk",
      "Palabos (lattice Boltzmann)", "Dualsphysics (SPH)", "Ansys Chemkin",
      "Cantera (chemical kinetics)", "Star-CD", "AcuSolve (Altair)", "nanoFluidX (Altair)",
    ],
  },
  {
    category: "Electronics / PCB / Semiconductor",
    tools: [
      "Fritzing", "gEDA", "Pulsonix", "CircuitStudio", "Sprint-Layout", "TARGET 3001!",
      "Zuken CR-8000", "Zuken CADSTAR", "Ansys HFSS", "Ansys SIwave", "Ansys Q3D Extractor",
      "Keysight ADS", "Keysight Genesys", "AWR Microwave Office (Cadence)", "Sonnet EM",
      "FEKO (Altair)", "CST Studio Suite", "Synopsys IC Compiler", "Synopsys VCS",
      "Mentor ModelSim", "Mentor Questa", "Verilator", "GHDL", "Icarus Verilog",
      "Magic VLSI", "Electric VLSI", "Xschem", "Qucs", "SIMetrix", "TINA-TI",
    ],
  },
  {
    category: "Chemical / Process / Piping",
    tools: [
      "Aspen Capital Cost Estimator", "Aspen Basic Engineering", "Petro-SIM (KBC)",
      "VMGSim", "ProMax (Bryan Research)", "AVEVA Instrumentation", "SmartPlant P&ID (Hexagon)",
      "AVEVA E3D Design", "AVEVA PDMS", "CADWorx Plant (Hexagon)", "AutoPIPE (Bentley)",
      "CAESAR II", "ROHR2", "START-PROF", "AFT Arrow", "AFT Impulse", "Flownex",
      "Aspen Adsorption", "Aspen Chromatography", "SuperPro Designer",
    ],
  },
  {
    category: "Civil / Structural / Geotechnical",
    tools: [
      "Dlubal RWIND", "Prokon", "S-Frame", "Advance Design (Graitec)", "Advance Steel (Autodesk)",
      "IDEA StatiCa", "Fastrak (Trimble)", "Tedds (Tekla)", "Limcon", "spColumn",
      "spBeam / spSlab", "Enercalc", "Foundation3D", "Mat3D", "GRLWEAP",
      "DeepXcavation (DeepEX)", "gINT", "RS2 / RS3 (Rocscience)", "FLAC / FLAC3D (Itasca)",
      "UDEC / 3DEC (Itasca)", "GALENA", "SLOPE/W", "SEEP/W", "SIGMA/W", "LPILE (Ensoft)",
      "GROUP (Ensoft)", "Wallap", "Oasys GSA", "Oasys Pdisp", "Oasys Frew",
    ],
  },
  {
    category: "Transportation / Water / Environmental",
    tools: [
      "PTV Vissim", "PTV Visum", "Synchro", "SIDRA Intersection", "AutoTURN",
      "Bentley OpenRail", "Bentley OpenFlows FLOOD", "MIKE by DHI", "InfoWorks ICM",
      "XPSWMM", "PCSWMM", "StormCAD (Bentley)", "CivilStorm", "HY-8", "River2D",
      "Delft3D", "TUFLOW", "Visual MODFLOW", "GMS (Groundwater Modeling System)", "FEFLOW",
    ],
  },
  {
    category: "BIM / MEP / Energy",
    tools: [
      "Bentley OpenBuildings Designer", "Allplan (Nemetschek)", "Bentley AECOsim",
      "MagiCAD", "Trimble Nova", "Stardraft / Stardraw", "Bluebeam Revu", "Assemble",
      "BIM 360 / Autodesk Construction Cloud", "OpenStudio", "eQUEST", "Sefaira",
      "Ladybug / Honeybee", "Radiance", "DIALux", "Relux", "AGi32",
      "Pipe-Flo Professional", "Elite CHVAC", "Bentley Hevacomp",
    ],
  },
  {
    category: "Manufacturing / CAM / Metrology / PLM",
    tools: [
      "NX Mold Wizard", "Cimatron Die Design", "Delcam PowerShape", "Sprutcam",
      "BobCAD-CAM", "Alphacam", "RhinoCAM (MecSoft)", "VisualCAM", "Autodesk Netfabb",
      "Materialise Magics", "Simufact", "DEFORM", "QForm", "PC-DMIS", "Calypso (Zeiss)",
      "GOM Inspect", "Teamcenter (PLM)", "Windchill (PTC PLM)", "Aras Innovator (PLM)",
      "Enovia (Dassault PLM)",
    ],
  },
];

// Returns 200 descriptors for the expansion tool set (same shape as the base).
export function generateExtraCourseDescriptors() {
  const out = [];
  const seenSlugs = new Set();
  let index = 0;
  for (const group of ENGINEERING_TOOL_CATEGORIES_2) {
    for (const tool of group.tools) {
      const level = SW_LEVELS[index % SW_LEVELS.length];
      let base = slugify(tool);
      let slug = base;
      let n = 2;
      while (seenSlugs.has(slug)) slug = `${base}-${n++}`;
      seenSlugs.add(slug);
      out.push({
        title: tool,
        slug,
        level,
        category: group.category,
        subject: tool,
        summary: `Master ${tool}, a ${group.category} tool, from the ground up. This ${level.toLowerCase()} course covers it through structured notes, 30 hands-on labs, and a self-assessment for every topic.`,
      });
      index += 1;
    }
  }
  return out; // 200 tools
}

// --- Programming department (kept from the original catalog) ----------------
const PROGRAMMING_SUBJECTS = [
  "Python Programming", "JavaScript Fundamentals", "TypeScript", "React", "Vue.js",
  "Angular", "Node.js", "Express APIs", "Django", "Flask", "Spring Boot", "Go",
  "Rust", "C++", "Java", "Kotlin", "SQL and Databases", "PostgreSQL",
  "GraphQL", "REST API Design", "Microservices", "System Design",
  "Data Structures", "Algorithms", "Design Patterns", "Docker", "Kubernetes",
  "CI/CD Pipelines", "Software Testing", "Web Security",
];

// One course per programming subject (single level each) for the Programming
// department. Kept separate from the 200 engineering tools.
export function generateProgrammingDescriptors() {
  const out = [];
  const seen = new Set();
  PROGRAMMING_SUBJECTS.forEach((subject, i) => {
    const level = SW_LEVELS[i % SW_LEVELS.length];
    // Namespace with a "-dev" suffix so programming slugs never collide with an
    // engineering-tool slug (e.g. Docker/Kubernetes/Git appear in both).
    let base = `${slugify(subject)}-dev`;
    let slug = base;
    let n = 2;
    while (seen.has(slug)) slug = `${base}-${n++}`;
    seen.add(slug);
    out.push({
      title: subject,
      slug,
      level,
      category: "Programming",
      subject,
      summary: `A ${level.toLowerCase()} programming course on ${subject}: structured notes, 30 hands-on labs, and a self-assessment for every topic.`,
    });
  });
  return out;
}

// Ten reusable module themes give every course a coherent 10-part arc that
// mirrors a professional curriculum (orientation -> build -> analyse ->
// validate -> capstone). Each theme carries real learning outcomes so the
// generated study notes read as finished material for the named tool.
export const MODULE_THEMES = [
  { title: "Orientation, Setup & the Data Model", focus: "installing the software, structuring a workspace, and understanding how it models a project" },
  { title: "Core Concepts & Inputs", focus: "the fundamental inputs the software works from and where they come from" },
  { title: "Building the Model", focus: "assembling a working model from its components" },
  { title: "Configuration & Parameters", focus: "the parameters that drive results and choosing defensible values for them" },
  { title: "Analysis & Simulation", focus: "running the analysis and reading the raw outputs" },
  { title: "Results & Interpretation", focus: "interpreting results and diagnosing anomalies" },
  { title: "Advanced Configurations", focus: "advanced features, edge cases and special modes" },
  { title: "Optimisation & Trade-offs", focus: "tuning the model and understanding the trade-offs involved" },
  { title: "Validation & Cross-Checks", focus: "validating the model against measurement and against other tools" },
  { title: "Capstone & Reporting", focus: "producing a defensible, review-ready deliverable" },
];

// Angles rotate across a topic's concept pages so the 15 pages progress
// through real, non-repeating study material rather than restating one idea.
// 10 distinct angles — one per concept page in a topic, so no page repeats and
// each page's "Remember" box is specific to that page's idea.
const NOTE_ANGLES = [
  {
    label: "Key idea",
    body: (t, f) =>
      `At its core, this stage of working in ${t} is about ${f}. Get it right and everything downstream is easier to trust; get it wrong and the errors compound quietly. Take the time to understand *why* each choice matters before reaching for a shortcut — ${t} will happily accept a poorly-considered input and produce a confident-looking result anyway.`,
    remember: (t) => [
      `The goal of this stage is understanding, not just a finished screen in ${t}.`,
      "A confident-looking result is not the same as a correct one.",
      "Learn the why before the shortcut.",
    ],
  },
  {
    label: "How it works",
    body: (t, f) =>
      `Under the hood, ${t} handles ${f} in a defined order: it reads the inputs you provide, applies its internal model, and exposes the result for you to inspect. Knowing that order lets you predict how a change to one input ripples through the rest — and lets you isolate a problem to a single stage instead of guessing.`,
    remember: (t) => [
      `${t} follows a fixed order: inputs → model → result.`,
      "Knowing the order lets you predict how a change ripples through.",
      "Isolate a problem to one stage instead of guessing.",
    ],
  },
  {
    label: "Practical workflow",
    body: (t, f) =>
      `In practice, work through ${f} methodically in ${t}: prepare and check your inputs first, make one deliberate change at a time, and re-check the output after each. Resist the urge to change several things at once — when the result shifts, you want to know exactly which change caused it.`,
    remember: () => [
      "Check your inputs before you run anything.",
      "Change one thing at a time.",
      "Re-check the output after every change.",
    ],
  },
  {
    label: "Inputs & where they come from",
    body: (t, f) =>
      `Every result in ${t} is only as good as the inputs behind it. For ${f}, know the source of each input, its units, and how current it is. An input copied from an old project or the wrong data set is the single most common cause of a wrong-but-plausible answer.`,
    remember: () => [
      "Know the source of every input.",
      "Check units before, not after, the run.",
      "Stale or copied-over inputs are a top cause of wrong answers.",
    ],
  },
  {
    label: "Settings that matter",
    body: (t, f) =>
      `A handful of settings do most of the work here. Learn which parameters materially change the outcome and which are cosmetic. In ${t}, the defaults are a reasonable starting point but rarely the final answer for ${f}; treat every non-default value as a decision you can justify with a source or a calculation.`,
    remember: () => [
      "A few settings drive the result; know which ones.",
      "Defaults are a starting point, not the answer.",
      "Justify every non-default value with a source or a calculation.",
    ],
  },
  {
    label: "Reading the output",
    body: (t, f) =>
      `Producing a result in ${t} is only half the job — reading it correctly is the other half. For ${f}, know what each output number means, what a *reasonable* value looks like, and which figure a reviewer will scrutinise first. An output you can't interpret is one you can't defend.`,
    remember: () => [
      "Know what each output actually means.",
      "Have a sense of what a reasonable value looks like.",
      "An output you can't explain is one you can't defend.",
    ],
  },
  {
    label: "Common mistakes",
    body: (t, f) =>
      `The most common mistakes at this stage are silent ones: an input left at a default that doesn't fit the project, a unit mismatch, or a step skipped because the result still "looked fine". When your output for ${f} in ${t} surprises you, suspect your inputs before you suspect the software.`,
    remember: () => [
      "The dangerous mistakes are the silent ones.",
      "Watch for unit mismatches and unfit defaults.",
      "When surprised, suspect your inputs first.",
    ],
  },
  {
    label: "Sanity checks",
    body: (t, f) =>
      `Before you trust a result from ${t}, check it against something independent: a hand calculation, a simpler case with a known answer, or a rule of thumb. For ${f}, a two-minute sanity check catches the large errors that a detailed review might miss entirely.`,
    remember: () => [
      "Always check a result against something independent.",
      "A simple case with a known answer is a powerful test.",
      "Two minutes of sanity-checking catches the big errors.",
    ],
  },
  {
    label: "Documentation & auditability",
    body: (t, f) =>
      `Keep your work auditable: name things clearly, version your files, and record why you set each value the way you did. A ${t} project that another engineer can pick up and understand is worth far more than one that only makes sense to the person who built it.`,
    remember: () => [
      "Name and version everything clearly.",
      "Record the reasoning behind each choice.",
      "Aim for work another person can pick up and follow.",
    ],
  },
  {
    label: "When things go wrong",
    body: (t, f) =>
      `When a result looks wrong in ${t}, resist the urge to change settings at random. Work backwards through the same order the software uses — inputs, then configuration, then the operation — and find the first place reality and the model disagree. For ${f}, disciplined backtracking beats guessing every time.`,
    remember: () => [
      "Don't change settings at random when stuck.",
      "Work backwards through inputs → configuration → operation.",
      "Find the first place model and reality disagree.",
    ],
  },
];

// Builds one structured study-notes page. The page role (overview, concept,
// worked example, summary) shapes finished-reading content for the tool.
function buildNotePage({ tool, category, moduleNo, moduleTitle, focus, pageNo, totalPages }) {
  const heading = `# ${moduleTitle}\n\n_${tool} · ${category} · Module ${moduleNo}, page ${pageNo} of ${totalPages}_\n\n`;

  // Overview page
  if (pageNo === 1) {
    return {
      title: `${moduleTitle}: Overview`,
      contentMarkdown:
        heading +
        `## What this module covers\n\n` +
        `This module is about **${focus}** in ${tool}. By the end you should be able to carry out this stage of a real ${tool} project confidently and explain the reasoning behind each of your choices.\n\n` +
        `## The workflow at a glance\n\n` +
        `1. Establish the inputs this stage depends on.\n` +
        `2. Set ${tool} up for the task at hand.\n` +
        `3. Run the operation and capture the output.\n` +
        `4. Sanity-check the result against what you expected.\n` +
        `5. Record the decisions and assumptions you made, and why.\n\n` +
        `> **Keep your evidence.** For every value you set away from the default, keep a short note on why — it is the difference between a result you can defend and one you merely hope is right.\n`,
    };
  }

  // Real-world study (a case-study page grounded in industry practice)
  if (pageNo === totalPages - 3) {
    return {
      title: `${moduleTitle}: Real-world application`,
      contentMarkdown:
        heading +
        `## In practice\n\n` +
        `On real projects, ${focus} is where ${tool} earns its keep. Consider a working engineer handed a live task: they open ${tool}, set up this stage from the project's actual data, and produce a result other people will rely on — a drawing that gets built, a model that informs a decision, a report that is checked by someone else.\n\n` +
        `**A short case.** A team used ${tool} for exactly this stage and hit a result that "looked fine" but failed review. The cause was almost always the same class of problem this module warns about: an input left at a default that didn't match reality. The fix was not more software skill — it was going back to the assumptions, one at a time, until the numbers could be defended.\n\n` +
        `> The lesson: the value you add with ${tool} is judgement about the inputs, not speed of clicking.\n`,
    };
  }

  // Visual / drawing study — a drawing to study for drawing-based tools,
  // otherwise a small reference table to read.
  if (pageNo === totalPages - 2) {
    const domain = labDomain(category);
    if (domain) {
      const set = DRAWING_EXERCISES[domain];
      const ex = set[hashSeed(`${tool}-${moduleNo}-note`) % set.length];
      return {
        title: `${moduleTitle}: Drawing to study — ${ex.title}`,
        contentMarkdown:
          heading +
          `## Study this drawing\n\n` +
          `Before you build anything, learn to *read* a drawing. Study the one below and notice how each feature is dimensioned — that is the language ${tool} works in.\n\n` +
          "```\n" + ex.ascii + "```\n\n" +
          `**What to notice**\n\n` +
          `- Every feature has a size and a position — nothing is left to guess.\n` +
          `- Holes and cut-outs are located from a clear reference edge.\n` +
          `- You could hand this to another engineer and they would build the same part.\n`,
      };
    }
    return {
      title: `${moduleTitle}: Reference values`,
      contentMarkdown:
        heading +
        `## Reference — reading the numbers\n\n` +
        `Part of ${focus} is knowing what a *reasonable* value looks like, so a wrong one jumps out at you.\n\n` +
        `**Typical checkpoints**\n\n` +
        `- **Inputs** — sourced and unit-checked before the run.\n` +
        `- **Key parameter** — set deliberately, with a reason recorded.\n` +
        `- **Output** — compared against a hand estimate or a known-good case.\n` +
        `- **Sign-off** — every non-default choice has evidence attached.\n\n` +
        `> Keep a personal list of "normal" ranges for ${tool}; it is the fastest error-catcher you will own.\n`,
    };
  }

  // Worked example (single page)
  if (pageNo === totalPages - 1) {
    return {
      title: `${moduleTitle}: Worked example`,
      contentMarkdown:
        heading +
        `## Worked example\n\n` +
        `Apply this module to a small, realistic case in ${tool}.\n\n` +
        `1. Open a fresh project and give it a clear, descriptive name.\n` +
        `2. Enter the inputs this stage needs, checking units as you go.\n` +
        `3. Configure the key settings and **predict** the result before running.\n` +
        `4. Run it, compare against your prediction, and explain any difference.\n\n` +
        `> A result you can explain is worth ten results you simply accepted.\n`,
    };
  }

  // Summary + self-test (last page)
  if (pageNo === totalPages) {
    return {
      title: `${moduleTitle}: Summary & Self-Test`,
      contentMarkdown:
        heading +
        `## Summary\n\n` +
        `- This module covered **${focus}** in ${tool}.\n` +
        `- You saw the standard workflow, the settings that matter, the mistakes to avoid, and a worked example.\n` +
        `- Every value you set away from a default should carry a reason you can state out loud.\n\n` +
        `## Check yourself\n\n` +
        `1. In one sentence, what does this stage of ${tool} produce?\n` +
        `2. Name one input someone might challenge here — and how you would defend your choice.\n` +
        `3. What single check would tell you the output of this module is wrong?\n\n` +
        `> When you can answer these confidently, take the module self-assessment.\n`,
    };
  }

  // Concept pages (the bulk) — one distinct angle per page, each with its own
  // page-specific "Remember" takeaways.
  const angle = NOTE_ANGLES[(pageNo - 2) % NOTE_ANGLES.length];
  const remember = angle.remember(tool, focus);
  return {
    title: `${moduleTitle}: ${angle.label}`,
    contentMarkdown:
      heading +
      `## ${angle.label}\n\n` +
      angle.body(tool, focus) +
      `\n\n**Remember**\n\n` +
      remember.map((r) => `- ${r}`).join("\n") +
      `\n`,
  };
}

// Which kind of "reproduce this" drawing (if any) suits a tool's category.
function labDomain(category) {
  const c = category || "";
  if (/FEA|CFD|Simulation|Thermal|Multiphysics|Process|Piping|Metrology|PLM|Systems|Data|Programming|Aerospace/i.test(c)) return null;
  if (/Mechanical|CAD|Modeling|Drafting|CAM/i.test(c)) return "cad";
  if (/BIM|Architecture/i.test(c)) return "bim";
  if (/PCB|Electronics|EDA/i.test(c)) return "pcb";
  if (/Civil|Geotechnical|Infrastructure|Structural/i.test(c)) return "civil";
  return null;
}

// Concrete, dimensioned drawings to reproduce — picked by hash so different
// courses/modules get different exercises. Plain-ASCII so they render in the
// notes reader and in the PDF export.
const DRAWING_EXERCISES = {
  cad: [
    {
      title: "Mounting bracket (2D)",
      brief: "Draw this plate accurately to the dimensions shown, then add the two holes.",
      ascii:
        "        80 mm\n" +
        "   +---------------+\n" +
        "   | o           o |   <- 2x dia 8 mm holes, 15 mm in from each side/top\n" +
        "   |               |\n" +
        "   |               |  50 mm\n" +
        "   |     +---+     |\n" +
        "   |     |   |     |   <- 24 x 16 mm central slot\n" +
        "   +-----+---+-----+\n",
      steps: [
        "Draw the 80 x 50 mm outer rectangle.",
        "Add the 24 x 16 mm slot centred on the bottom edge.",
        "Place two Ø8 mm holes, 15 mm from the top and 15 mm from each side.",
        "Dimension the drawing fully and check every value against the sketch.",
      ],
    },
    {
      title: "Flange with bolt circle",
      brief: "Reproduce this round flange, including the bolt circle of holes.",
      ascii:
        "         ____\n" +
        "       /  o  \\        Outer dia:   120 mm\n" +
        "      / o     o \\      Centre bore: dia 40 mm\n" +
        "     |    ( )    |     Bolt circle: dia 90 mm\n" +
        "      \\ o     o /      6x dia 10 mm holes, evenly spaced\n" +
        "       \\__ o __/\n",
      steps: [
        "Draw the Ø120 mm outer circle and the Ø40 mm centre bore.",
        "Add a Ø90 mm construction circle for the bolt centres.",
        "Place 6 x Ø10 mm holes evenly (60 deg apart) on the bolt circle.",
        "Add centre-marks and dimension the three diameters.",
      ],
    },
    {
      title: "Spacer ring",
      brief: "A simple ring — good for practising concentric geometry and fillets.",
      ascii:
        "        _____\n" +
        "      /       \\      Outer dia: 60 mm\n" +
        "     |  _____  |     Inner dia: 34 mm\n" +
        "     | /     \\ |     Thickness (section): 6 mm\n" +
        "     | \\_____/ |\n" +
        "      \\_______/\n",
      steps: [
        "Draw two concentric circles, Ø60 mm and Ø34 mm.",
        "If modelling in 3D, extrude/pad the ring to 6 mm.",
        "Add a 1 mm chamfer to the outer top edge.",
        "Dimension both diameters and the thickness.",
      ],
    },
    {
      title: "Cover plate with rounded corners",
      brief: "Practise filleted corners and a rectangular cut-out.",
      ascii:
        "    .-----------------.\n" +
        "   (   o         o    )   <- corner radius 8 mm\n" +
        "   |                   |   Plate: 100 x 60 mm\n" +
        "   |    [_________]    |   Window: 60 x 20 mm\n" +
        "   (   o         o    )   4x dia 6 mm holes near corners\n" +
        "    '-----------------'\n",
      steps: [
        "Draw the 100 x 60 mm rectangle and fillet all four corners R8.",
        "Cut the central 60 x 20 mm rectangular window.",
        "Add four Ø6 mm holes, 10 mm in from each corner.",
        "Fully dimension the plate, window and hole positions.",
      ],
    },
  ],
  bim: [
    {
      title: "Single room plan",
      brief: "Lay out a simple room with one door and one window, to scale.",
      ascii:
        "   +--------[   ]--------+   <- window, 1200 mm wide\n" +
        "   |                     |\n" +
        "   |      4.0 x 3.0 m    |   Wall thickness: 150 mm\n" +
        "   |                     |\n" +
        "   +---------+  +--------+\n" +
        "             (door 900 mm)\n",
      steps: [
        "Draw the 4.0 x 3.0 m room using 150 mm walls.",
        "Place a 900 mm door on the bottom wall.",
        "Place a 1200 mm window centred on the top wall.",
        "Tag the room and add overall dimensions.",
      ],
    },
    {
      title: "Two-room layout",
      brief: "Two rooms sharing a wall, with a connecting door.",
      ascii:
        "   +----------+----------+\n" +
        "   |          |          |\n" +
        "   | Office   D  Store   |   D = internal door 800 mm\n" +
        "   | 3.5x3.0  |  2.5x3.0 |   (dimensions in metres)\n" +
        "   +--[    ]--+----------+   [ ] = window\n",
      steps: [
        "Draw both rooms with a shared internal wall.",
        "Add an 800 mm door in the shared wall.",
        "Add a window to the office external wall.",
        "Name both rooms and dimension the layout.",
      ],
    },
  ],
  pcb: [
    {
      title: "LED series circuit (schematic)",
      brief: "Draw this simple schematic, then check the current-limiting resistor.",
      ascii:
        "    (+)9V ---[ R 470 ohm ]---|>|--- (-)\n" +
        "    battery                  LED\n",
      steps: [
        "Place a 9 V battery symbol, a 470 ohm resistor and an LED.",
        "Wire them in series into a single loop.",
        "Label each component (BT1, R1, D1) with its value.",
        "Note the expected LED current (roughly (9 - 2)/470 A).",
      ],
    },
    {
      title: "Resistor divider (schematic)",
      brief: "A two-resistor voltage divider — practise nets and labels.",
      ascii:
        "    Vin ---[ R1 ]---+--- Vout\n" +
        "                    |\n" +
        "                  [ R2 ]\n" +
        "                    |\n" +
        "                   GND\n",
      steps: [
        "Place two resistors R1 and R2 and a ground symbol.",
        "Wire R1 from Vin to the Vout node, R2 from Vout to GND.",
        "Label the Vin, Vout and GND nets.",
        "State the divider ratio Vout = Vin * R2/(R1+R2).",
      ],
    },
  ],
  civil: [
    {
      title: "Simply supported beam (elevation)",
      brief: "Sketch the beam, its supports and a point load, then label the span.",
      ascii:
        "            P = 20 kN\n" +
        "               |\n" +
        "               v\n" +
        "   ============================\n" +
        "   ^                          ^\n" +
        "  (pin)                     (roller)\n" +
        "   |<-------- 6.0 m --------->|\n",
      steps: [
        "Draw a 6.0 m beam with a pin support at the left and a roller at the right.",
        "Add a 20 kN point load at mid-span.",
        "Label the span, supports and load.",
        "State the two support reactions (10 kN each for a central load).",
      ],
    },
    {
      title: "Rectangular site plan",
      brief: "A plot with a building footprint set back from the boundary.",
      ascii:
        "   +----------------------------+\n" +
        "   |        (boundary)          |\n" +
        "   |   +------------------+     |   Plot: 30 x 20 m\n" +
        "   |   |    building      |     |   Setback: 3 m all round\n" +
        "   |   +------------------+     |\n" +
        "   +----------------------------+\n",
      steps: [
        "Draw the 30 x 20 m plot boundary.",
        "Offset a 3 m setback line inside the boundary.",
        "Draw the building footprint on the setback line.",
        "Dimension the plot, setback and footprint.",
      ],
    },
  ],
};

// Builds 3 DISTINCT labs for a topic: a guided walkthrough, a concrete
// build/drawing exercise, and an independent challenge.
export function buildLabs(tool, theme, moduleNo, category, slug) {
  const domain = labDomain(category);

  // Lab 1 — guided walkthrough
  const lab1 = {
    title: `Lab ${moduleNo}.1: Guided walkthrough — ${theme.title}`,
    objective: `Follow a guided sequence to practise ${theme.focus} in ${tool}.`,
    instructionsMarkdown:
      `### Lab ${moduleNo}.1 — Guided walkthrough\n\n` +
      `Work through this stage of ${tool} step by step. Don't rush — the goal is to build a repeatable routine.\n\n` +
      `1. Start a fresh ${tool} file and name it clearly.\n` +
      `2. Set up the inputs this module needs, checking each value as you enter it.\n` +
      `3. Carry out the core operation for ${theme.focus}.\n` +
      `4. Save, then write two sentences on what you did and why.\n\n` +
      `**Deliverable.** Your ${tool} file plus the short write-up.\n`,
    estimatedMinutes: 40,
  };

  // Lab 2 — a concrete build; a drawing to reproduce for drawing-based tools.
  let lab2;
  if (domain) {
    const set = DRAWING_EXERCISES[domain];
    const ex = set[hashSeed(`${slug}-${moduleNo}-draw`) % set.length];
    lab2 = {
      title: `Lab ${moduleNo}.2: Reproduce this drawing — ${ex.title}`,
      objective: `Recreate the drawing below accurately in ${tool}.`,
      instructionsMarkdown:
        `### Lab ${moduleNo}.2 — Reproduce this drawing\n\n` +
        `${ex.brief}\n\n` +
        "```\n" + ex.ascii + "```\n\n" +
        `**Build it in ${tool}:**\n\n` +
        ex.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
        `\n\n**Deliverable.** Your ${tool} drawing/model, dimensioned to match the sketch.\n`,
      estimatedMinutes: 55,
    };
  } else {
    lab2 = {
      title: `Lab ${moduleNo}.2: Build & run a case`,
      objective: `Set up a small, complete case and produce a result in ${tool}.`,
      instructionsMarkdown:
        `### Lab ${moduleNo}.2 — Build and run a case\n\n` +
        `Put this module into practice on a small but complete example.\n\n` +
        `1. Define a simple case relevant to ${theme.focus} (keep it small enough to check by hand).\n` +
        `2. Configure ${tool} and **predict** the result before you run it.\n` +
        `3. Run the case and compare the output against your prediction.\n` +
        `4. If they disagree, change one input, re-run, and explain what moved.\n\n` +
        `**Deliverable.** The case file, your prediction, and the actual result with a one-line explanation.\n`,
      estimatedMinutes: 55,
    };
  }

  // Lab 3 — independent challenge
  const lab3 = {
    title: `Lab ${moduleNo}.3: Independent challenge`,
    objective: `Apply ${theme.title} to a problem of your own in ${tool}.`,
    instructionsMarkdown:
      `### Lab ${moduleNo}.3 — Independent challenge\n\n` +
      `No step-by-step this time. Choose a small problem from your own work (or invent a realistic one) and solve it with ${tool}, applying what this module taught about ${theme.focus}.\n\n` +
      `**Acceptance criteria**\n\n` +
      `- The result is correct and you can justify every non-default choice.\n` +
      `- Another person could open your file and understand it.\n` +
      `- You noted at least one thing you would do differently next time.\n\n` +
      `**Deliverable.** Your ${tool} file and a short paragraph explaining your approach.\n`,
    estimatedMinutes: 60,
  };

  return [lab1, lab2, lab3];
}

// Regenerate the 15 note pages for one assessed topic (used by update scripts).
export function buildTopicNotes(tool, category, order) {
  const theme = MODULE_THEMES[(order - 1) % MODULE_THEMES.length];
  const moduleTitle = `Module ${order}: ${theme.title}`;
  const notes = [];
  for (let p = 1; p <= NOTES_PER_TOPIC; p++) {
    notes.push(
      buildNotePage({ tool, category, moduleNo: order, moduleTitle, focus: theme.focus, pageNo: p, totalPages: NOTES_PER_TOPIC })
    );
  }
  return notes;
}

// Topic 11 — "Opportunities": what you can do after finishing the course.
// Notes-only (not assessed). Returns an array of note pages.
export function buildOpportunitiesNotes(tool, category) {
  const area = category || "engineering";
  const h = (t, p, n) => `# Opportunities\n\n_${tool} · what comes next · page ${p} of ${n}_\n\n## ${t}\n\n`;
  const N = 6;
  return [
    {
      title: "Opportunities: Where this can take you",
      contentMarkdown:
        h("Where this can take you", 1, N) +
        `Learning ${tool} is not just about the software — it is a credential in ${area}. Employers and clients use tools like ${tool} as a shorthand for "can do the real work", so the skill opens doors well beyond the buttons on screen.\n\n` +
        `The pages that follow lay out the concrete opportunities: the roles you can target, the industries that hire for them, freelance and project work, how to prove your skill with a portfolio, and where to go next.\n\n` +
        `> This topic is not assessed — it is your map for turning the course into outcomes.\n`,
    },
    {
      title: "Opportunities: Roles & job titles",
      contentMarkdown:
        h("Roles and job titles", 2, N) +
        `Fluency in ${tool} supports roles such as:\n\n` +
        `- **${area} Engineer / Designer** — producing and checking work in ${tool} day to day.\n` +
        `- **Analyst / Specialist** — going deep on the results ${tool} produces and defending them.\n` +
        `- **Drafter / Modeller / Technician** — building accurate models and drawings to a brief.\n` +
        `- **Consultant / Reviewer** — auditing other people's ${tool} work.\n` +
        `- **Trainer / Content creator** — teaching ${tool} once you are confident.\n\n` +
        `> Match your CV bullet points to these titles and name ${tool} explicitly.\n`,
    },
    {
      title: "Opportunities: Industries that hire",
      contentMarkdown:
        h("Industries that hire", 3, N) +
        `${tool} skills are in demand across ${area} and neighbouring fields:\n\n` +
        `- Design and engineering consultancies.\n` +
        `- Manufacturers, EPCs and contractors delivering real projects.\n` +
        `- Product companies building and iterating hardware.\n` +
        `- Research, education and the public sector.\n` +
        `- Startups needing one person who can actually produce the work.\n\n` +
        `> Search job boards for "${tool}" and note which sectors appear most — that is where to aim.\n`,
    },
    {
      title: "Opportunities: Freelance & project work",
      contentMarkdown:
        h("Freelance and project work", 4, N) +
        `You do not need a full-time job to earn from ${tool}:\n\n` +
        `- **Freelance gigs** on marketplaces — small, well-scoped ${tool} tasks.\n` +
        `- **Contract work** for firms that need extra capacity on a deadline.\n` +
        `- **Productised services** — offer one specific ${tool} deliverable at a fixed price.\n` +
        `- **Your own projects** — build something real and sell or license it.\n\n` +
        `> Start with one small paid job; a single delivered project is worth more than any certificate.\n`,
    },
    {
      title: "Opportunities: Build a portfolio",
      contentMarkdown:
        h("Build a portfolio", 5, N) +
        `Proof beats claims. Turn the course labs into portfolio pieces:\n\n` +
        `1. Redo two or three labs to a high standard and document them.\n` +
        `2. Add one self-directed project that solves a real problem with ${tool}.\n` +
        `3. For each piece, show the brief, your process, and the finished result.\n` +
        `4. Publish it — a simple page or PDF you can send to anyone.\n\n` +
        `> A tidy three-piece portfolio in ${tool} is enough to start applying and pitching.\n`,
    },
    {
      title: "Opportunities: Next steps",
      contentMarkdown:
        h("Next steps", 6, N) +
        `To keep growing after this course:\n\n` +
        `- Go deeper into the advanced modules and edge cases of ${tool}.\n` +
        `- Learn one complementary tool that pairs with ${tool} in real workflows.\n` +
        `- Seek out a review of your work from someone more experienced.\n` +
        `- Consider a recognised certification if your target employers value one.\n\n` +
        `> Pick **one** next step this week and act on it while the momentum lasts.\n`,
    },
  ];
}

// Ten assessment questions per topic, answerable from that topic's notes.
function questionBank(tool, theme) {
  return [
    {
      prompt: `In ${tool}, when a result surprises you, what should you suspect first?`,
      correct: "Your own inputs and settings",
      distractors: ["A bug in the software", "Your computer's hardware", "The licence server"],
      explanation: "The notes stress suspecting your inputs before the software — most surprises trace back to a value you set.",
    },
    {
      prompt: `Why change only one input at a time when working in ${tool}?`,
      correct: "So you can tell which change caused the effect",
      distractors: ["To make the software run faster", "Because ${tool} forbids multiple edits", "To use less memory"],
      explanation: "Changing one thing at a time turns each edit into a controlled test.",
    },
    {
      prompt: `What should every value you set away from a default carry?`,
      correct: "A reason you can justify",
      distractors: ["A higher licence tier", "An admin approval", "A longer run time"],
      explanation: "Non-default choices should be defensible — keep the reasoning for each.",
    },
    {
      prompt: `What makes a ${tool} project genuinely valuable to a team?`,
      correct: "It is auditable — clearly named, versioned and documented",
      distractors: ["It uses the newest file format", "It was built fastest", "It has the most settings changed"],
      explanation: "Auditable work another engineer can pick up is worth more than clever but opaque work.",
    },
    {
      prompt: `Why predict the result before running an operation in ${tool}?`,
      correct: "It turns the run into a test rather than a guess",
      distractors: ["It speeds up the calculation", "It is required by ${tool}", "It reduces file size"],
      explanation: "A prediction gives you something to check the output against.",
    },
    {
      prompt: `How should you treat ${tool}'s default settings?`,
      correct: "As a reasonable starting point, rarely the final answer",
      distractors: ["As always correct", "As values never to be changed", "As errors to fix immediately"],
      explanation: "Defaults are a sensible start but usually need justified adjustment for your project.",
    },
    {
      prompt: `What is the real deliverable of working through a worked example?`,
      correct: "Understanding why the result is what it is",
      distractors: ["A faster computer", "A completed licence form", "The largest possible output"],
      explanation: "The understanding you build is worth more than the number itself.",
    },
    {
      prompt: `Why are 'silent' mistakes in ${tool} especially dangerous?`,
      correct: "The result still looks fine, with no warning",
      distractors: ["They crash the software", "They delete your files", "They always show a red error"],
      explanation: "Silent errors produce confident-looking but wrong results — hence the emphasis on sanity checks.",
    },
    {
      prompt: `Knowing the order in which ${tool} processes inputs helps you mainly to…`,
      correct: "Isolate a problem to a single stage",
      distractors: ["Bypass the licence check", "Skip validation", "Increase the resolution automatically"],
      explanation: "Understanding the processing order lets you localise issues instead of guessing.",
    },
    {
      prompt: `This module is fundamentally about…`,
      correct: `${theme.focus.charAt(0).toUpperCase()}${theme.focus.slice(1)}`,
      distractors: ["Billing and licensing only", "Choosing a screen theme", "Exporting to a spreadsheet only"],
      explanation: `The module centres on ${theme.focus}.`,
    },
  ].map((s) => ({
    ...s,
    distractors: s.distractors.map((d) => d.replace(/\$\{tool\}/g, tool)),
  }));
}

// Build the full nested structure for one course.
export function buildCourse(descriptor, disciplineId) {
  const topics = [];
  for (let t = 1; t <= TOPICS_PER_COURSE; t++) {
    const theme = MODULE_THEMES[(t - 1) % MODULE_THEMES.length];
    const moduleTitle = `Module ${t}: ${theme.title}`;
    const tool = descriptor.subject;
    const category = descriptor.category || "Engineering";

    // 15 structured note pages
    const notes = [];
    for (let p = 1; p <= NOTES_PER_TOPIC; p++) {
      notes.push(
        buildNotePage({
          tool,
          category,
          moduleNo: t,
          moduleTitle,
          focus: theme.focus,
          pageNo: p,
          totalPages: NOTES_PER_TOPIC,
        })
      );
    }

    // 3 distinct labs (guided walkthrough · build/drawing exercise · challenge)
    const labs = buildLabs(tool, theme, t, category, descriptor.slug);

    // 10-question assessment grounded in what the module's notes actually teach.
    const questions = [];
    for (let q = 1; q <= QUESTIONS_PER_ASSESSMENT; q++) {
      const spec = questionBank(tool, theme)[q - 1];
      // Vary the correct answer's position deterministically.
      const pos = hashSeed(`${descriptor.slug}-${t}-${q}`) % CHOICES_PER_QUESTION;
      const wrong = [...spec.distractors];
      const choices = [];
      for (let c = 0; c < CHOICES_PER_QUESTION; c++) {
        choices.push(
          c === pos
            ? { text: spec.correct, isCorrect: true }
            : { text: wrong.shift(), isCorrect: false }
        );
      }
      questions.push({ prompt: spec.prompt, explanation: spec.explanation, choices });
    }

    topics.push({ order: t, title: moduleTitle, notes, labs, questions });
  }

  return {
    disciplineId,
    slug: descriptor.slug,
    title: descriptor.title,
    summary: descriptor.summary,
    level: descriptor.level,
    category: descriptor.category ?? null,
    priceCents: 2000, // $20
    published: true,
    isPlaceholder: false,
    topics,
  };
}

// ------------------------- Recipes (1000) ----------------------------------

const CUISINES = [
  "Italian", "French", "Mexican", "Japanese", "Indian", "Thai", "Chinese",
  "Greek", "Spanish", "Moroccan", "Turkish", "Vietnamese", "Korean",
  "Lebanese", "Ethiopian", "Brazilian", "Peruvian", "American", "German",
  "Nigerian",
];

const DISHES = [
  "Tomato Soup", "Grilled Chicken", "Vegetable Stew", "Beef Stir-Fry",
  "Lentil Curry", "Roasted Salmon", "Mushroom Risotto", "Chickpea Salad",
  "Spiced Rice", "Flatbread", "Dumplings", "Noodle Bowl", "Fish Tacos",
  "Stuffed Peppers", "Eggplant Bake", "Pumpkin Curry", "Garlic Shrimp",
  "Honey Glazed Ribs", "Sweet Potato Mash", "Cauliflower Steak",
  "Coconut Chicken", "Black Bean Chili", "Herb Omelette", "Pan-Fried Tofu",
  "Barley Soup", "Zucchini Fritters", "Lamb Skewers", "Cabbage Rolls",
  "Spinach Pie", "Corn Fritters", "Pesto Pasta", "Butternut Soup",
  "Teriyaki Bowl", "Falafel Wrap", "Shakshuka", "Paella", "Gnocchi",
  "Ceviche", "Empanadas", "Ramen", "Pho", "Bibimbap", "Tagine", "Goulash",
  "Jollof Rice", "Feijoada", "Moussaka", "Katsu", "Biryani", "Enchiladas",
];

// Structured ingredient list for the booklet "ingredients" page.
function recipeIngredients(dish, cuisine) {
  const d = dish.toLowerCase();
  return [
    `400 g main ingredient for ${d}`,
    `2 tablespoons olive or cooking oil`,
    `1 medium onion, finely chopped`,
    `2 cloves garlic, minced`,
    `1 teaspoon ${cuisine.toLowerCase()} spice blend`,
    `1 teaspoon salt, plus more to taste`,
    `1/2 teaspoon black pepper`,
    `250 ml stock or water`,
    `Fresh herbs, to garnish (optional)`,
  ];
}

// Titled step pages, mirroring the booklet template (uppercase title + a short
// description paragraph), written to read as a finished recipe.
function recipeSteps(title, dish, cuisine) {
  const d = dish.toLowerCase();
  return [
    {
      title: "Prepare your ingredients",
      description: `Gather and measure everything for your ${title}. Chop the aromatics and have the ${d} ready before you turn on the heat, so the cooking runs smoothly from start to finish.`,
    },
    {
      title: "Heat the pan and soften the aromatics",
      description: `Warm the oil over medium heat, then add the onion and garlic. Cook gently until soft and fragrant — the base of any good ${cuisine} dish.`,
    },
    {
      title: `Add the main ${d}`,
      description: `Add the main ingredient for the ${d} and cook, stirring, until it takes on a little colour and the flavours begin to develop.`,
    },
    {
      title: "Season with the spice blend",
      description: `Stir in the ${cuisine.toLowerCase()} spice blend, salt and pepper. Toast the spices for a moment so they release their aroma.`,
    },
    {
      title: "Add liquid and simmer",
      description: `Pour in the stock or water, bring to a gentle simmer, then lower the heat and let the ${d} cook until tender and the sauce has thickened.`,
    },
    {
      title: "Taste and adjust",
      description: `Taste and adjust the seasoning. Add more salt, spice or a splash of acidity until the balance is right for your ${title}.`,
    },
    {
      title: "Rest, garnish and serve",
      description: `Let the dish rest for a few minutes, garnish with fresh herbs, and serve your ${title} warm. Enjoy!`,
    },
  ];
}

// Returns exactly 1000 recipe descriptors (20 cuisines x 50 dishes).
export function generateRecipeDescriptors() {
  const out = [];
  for (const cuisine of CUISINES) {
    for (const dish of DISHES) {
      const title = `${cuisine} ${dish}`;
      const ingredients = recipeIngredients(dish, cuisine);
      const steps = recipeSteps(title, dish, cuisine);
      out.push({
        title,
        slug: slugify(title),
        cuisine,
        author: "The Mentora Kitchen",
        servings: "Serves 4",
        totalTime: "~40 min",
        history:
          `${title} brings together a well-loved dish and the flavours of ${cuisine} cooking. ` +
          `Like most enduring recipes, ${dish.toLowerCase()} has travelled and adapted over time — shaped by what grows locally, ` +
          `by family tradition, and by the simple habit of cooks passing a good idea from one kitchen to the next. ` +
          `This version keeps things approachable while staying true to that spirit.`,
        ingredients,
        steps,
        instructionsMarkdown:
          `### ${title} — Instructions\n\n**Serves 4** · ~40 min\n\n` +
          `**Ingredients**\n\n` +
          ingredients.map((i) => `- ${i}`).join("\n") +
          `\n\n**Steps**\n\n` +
          steps.map((s, i) => `${i + 1}. **${s.title}.** ${s.description}`).join("\n"),
        priceCents: 500, // $5
        published: true,
        isPlaceholder: false,
      });
    }
  }
  return out; // 20 * 50 = 1000
}
