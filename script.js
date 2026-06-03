// ========================
// VERSION
// ========================
const APP_VERSION = "v1.0.8";

// ========================
// SHARED CONSTANTS
// ========================
const AIR_DENSITY = 1.204;
const AIR_VISCOSITY = 1.81e-5;
const ROUGHNESS_M = 0.00009;

const IN_TO_M = 0.0254;
const FT_TO_M = 0.3048;
const CFM_TO_CMS = 0.00047194745;
const PA_TO_INWG = 0.00401865;

const SAFETY_FACTOR = 0.90;

// ROUND CONSTANTS
const MIN_DIAMETER = 6;
const MAX_DIAMETER = 60;
const STEP = 2;

// RECTANGULAR CONSTANTS
const MIN_DIM_IN = 10;
const STEP_IN = 2;
const MAX_DIM_IN = 120;
const MAX_RESULTS = 10;

// Rectangular ranking weights.
// Friction is primary, but squareness and compactness still matter.
const FRICTION_WEIGHT = 0.80;
const SQUARENESS_WEIGHT = 0.15;
const AREA_WEIGHT = 0.05;

// Allows close ductulator-style options slightly above target friction.
const RECT_FRICTION_ALLOWANCE = 1.10;

// ========================
// DOM ELEMENTS
// ========================
let selectedShape = "Rectangular";

const roundBtn = document.getElementById("roundBtn");
const rectBtn = document.getElementById("rectBtn");

const airTypeEl = document.getElementById("airType");
const cfmEl = document.getElementById("cfm");
const calculateBtn = document.getElementById("calculateBtn");
const resultsDiv = document.getElementById("results");

const roundOptions = document.getElementById("roundOptions");
const maxDiameterChoice = document.getElementById("maxDiameterChoice");
const maxDiameterGroup = document.getElementById("maxDiameterGroup");
const maxDiameterEl = document.getElementById("maxDiameter");

const rectangularOptions = document.getElementById("rectangularOptions");
const maxChoiceEl = document.getElementById("maxChoice");
const smallDimGroup = document.getElementById("smallDimGroup");
const exactSmallDimEl = document.getElementById("exactSmallDim");

const versionEl = document.getElementById("version");
if (versionEl) {
  versionEl.textContent = `Website version: ${APP_VERSION}`;
}

// ========================
// SHARED FUNCTIONS
// ========================
function frictionFactor(reynolds, diameter) {
  if (reynolds < 2300) return 64.0 / reynolds;

  const term = (ROUGHNESS_M / diameter) / 3.7;
  const inv = -1.8 * Math.log10(Math.pow(term, 1.11) + 6.9 / reynolds);
  return 1.0 / (inv * inv);
}

function displayAirType(airType) {
  return airType === "S" ? "Supply" : "Return";
}

// ========================
// ROUND FUNCTIONS
// ========================
function calculateFriction(cfm, diameterIn) {
  const qM3s = cfm * CFM_TO_CMS;
  const dM = diameterIn * IN_TO_M;

  const area = Math.PI * dM * dM / 4.0;
  const velocity = qM3s / area;

  const reynolds = (AIR_DENSITY * velocity * dM) / AIR_VISCOSITY;
  const f = frictionFactor(reynolds, dM);

  const dpPerM = f * (AIR_DENSITY * velocity * velocity) / (2.0 * dM);
  const dp100Ft = dpPerM * (100.0 * FT_TO_M);

  return dp100Ft * PA_TO_INWG;
}

function calculateVelocity(cfm, diameterIn) {
  const areaFt2 = Math.PI * Math.pow(diameterIn / 12.0, 2) / 4.0;
  return cfm / areaFt2;
}

function runRoundCalculation(airType, cfm) {
  const targetFriction = airType === "S" ? 0.10 : 0.05;
  const maxVelocity = airType === "S" ? 900 : 700;

  let maxDiameterLimit = MAX_DIAMETER;

  if (maxDiameterChoice.value === "Y") {
    const input = parseInt(maxDiameterEl.value, 10);

    if (isNaN(input) || input < MIN_DIAMETER || input > MAX_DIAMETER || input % 2 !== 0) {
      resultsDiv.innerHTML = "Invalid diameter.";
      return;
    }

    maxDiameterLimit = input;
  }

  let bestDiameter = -1;
  let bestVelocity = 0;

  for (let d = MIN_DIAMETER; d <= maxDiameterLimit; d += STEP) {
    const friction = calculateFriction(cfm, d);

    if (friction <= targetFriction * SAFETY_FACTOR) {
      bestDiameter = d;
      bestVelocity = calculateVelocity(cfm, d);
      break;
    }
  }

  if (bestDiameter === -1) {
    resultsDiv.innerHTML = `
      <b><u>${displayAirType(airType)}</u></b><br><br>
      No usable diameter found.<br><br>
      <b>Max Velocity Cap:</b> ${Math.round(maxVelocity)} FPM
    `;
    return;
  }

  resultsDiv.innerHTML = `
    <b><u>${displayAirType(airType)}</u></b><br><br>
    <b>Smallest Usable Diameter:</b> ${bestDiameter}"<br><br>
    <b>Velocity:</b> ${Math.round(bestVelocity)} FPM<br><br>
    <b>Max Velocity Cap:</b> ${Math.round(maxVelocity)} FPM
  `;
}

// ========================
// RECTANGULAR FUNCTIONS
// ========================
function equivalentDiameterIn(w, h) {
  return 1.30 * Math.pow(w * h, 0.625) / Math.pow(w + h, 0.25);
}

function frictionInWgPer100Ft(cfm, deIn) {
  const qM3s = cfm * CFM_TO_CMS;
  const dM = deIn * IN_TO_M;

  const areaM2 = Math.PI * dM * dM / 4.0;
  const velocityMps = qM3s / areaM2;

  const reynolds = (AIR_DENSITY * velocityMps * dM) / AIR_VISCOSITY;
  const f = frictionFactor(reynolds, dM);

  const dpPerM = f * (AIR_DENSITY * velocityMps * velocityMps) / (2.0 * dM);
  const dp100FtPa = dpPerM * (100.0 * FT_TO_M);

  return dp100FtPa * PA_TO_INWG;
}

function aspectRatioDiff(w, h) {
  return Math.abs(w / h - 1.0);
}

function runRectangularCalculation(airType, cfm) {
  const targetFriction = airType === "S" ? 0.10 : 0.05;
  const maxChoice = maxChoiceEl.value;

  let maxAllowedHeight = MAX_DIM_IN;

  if (maxChoice === "Y") {
    const input = parseInt(exactSmallDimEl.value, 10);

    if (isNaN(input)) {
      resultsDiv.innerHTML = "Invalid maximum height.";
      return;
    }

    if (input < MIN_DIM_IN || input % 2 !== 0) {
      resultsDiv.innerHTML = `Maximum height must be an even number of at least ${MIN_DIM_IN}.`;
      return;
    }

    maxAllowedHeight = input;
  }

  const options = [];

  for (let w = MIN_DIM_IN; w <= MAX_DIM_IN; w += STEP_IN) {
    for (let h = MIN_DIM_IN; h <= w; h += STEP_IN) {
      if (h > maxAllowedHeight) continue;

      const deIn = equivalentDiameterIn(w, h);
      const friction = frictionInWgPer100Ft(cfm, deIn);

      if (friction > targetFriction * RECT_FRICTION_ALLOWANCE) continue;

      options.push({
        w,
        h,
        area: w * h,
        ratioDiff: aspectRatioDiff(w, h),
        friction,
        frictionDiff: Math.abs(friction - targetFriction)
      });
    }
  }

  if (options.length === 0) {
    resultsDiv.innerHTML = `
      <b><u>${displayAirType(airType)}</u></b><br><br>
      No valid duct sizes found.<br>
      Try lowering CFM, raising max height, or allowing a larger duct.
    `;
    return;
  }

  const minArea = Math.min(...options.map(o => o.area));

  options.forEach(o => {
    const frictionPenalty = o.frictionDiff / targetFriction;
    const squarePenalty = o.ratioDiff;
    const areaPenalty = (o.area - minArea) / minArea;

    o.score =
      frictionPenalty * FRICTION_WEIGHT +
      squarePenalty * SQUARENESS_WEIGHT +
      areaPenalty * AREA_WEIGHT;
  });

  options.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.frictionDiff !== b.frictionDiff) return a.frictionDiff - b.frictionDiff;
    if (a.ratioDiff !== b.ratioDiff) return a.ratioDiff - b.ratioDiff;
    if (a.area !== b.area) return a.area - b.area;
    if (a.w !== b.w) return a.w - b.w;
    return a.h - b.h;
  });

  const topOptions = options.slice(0, 3);

  let output = `
    <b><u>${displayAirType(airType)}</u></b><br><br>
    <b>Best 3 Options:</b>

    <table class="results-table">
      <thead>
        <tr>
          <th>Size</th>
          <th>Friction</th>
        </tr>
      </thead>
      <tbody>
  `;

  topOptions.forEach(o => {
    output += `
      <tr>
        <td>${o.w}×${o.h}</td>
        <td>${o.friction.toFixed(3)}</td>
      </tr>
    `;
  });

  output += `
      </tbody>
    </table>
  `;

  resultsDiv.innerHTML = output;
}

// ========================
// SHAPE TOGGLES
// ========================
roundBtn.addEventListener("click", function () {
  selectedShape = "Round";

  roundBtn.classList.add("active");
  rectBtn.classList.remove("active");

  roundBtn.classList.add("pulse");
  setTimeout(() => roundBtn.classList.remove("pulse"), 300);

  roundOptions.style.display = "block";
  rectangularOptions.style.display = "none";
  maxDiameterGroup.style.display = maxDiameterChoice.value === "Y" ? "block" : "none";
});

rectBtn.addEventListener("click", function () {
  selectedShape = "Rectangular";

  rectBtn.classList.add("active");
  roundBtn.classList.remove("active");

  rectBtn.classList.add("pulse");
  setTimeout(() => rectBtn.classList.remove("pulse"), 300);

  roundOptions.style.display = "none";
  rectangularOptions.style.display = "block";
  smallDimGroup.style.display = maxChoiceEl.value === "Y" ? "block" : "none";
});

maxDiameterChoice.addEventListener("change", function () {
  maxDiameterGroup.style.display = this.value === "Y" ? "block" : "none";
});

maxChoiceEl.addEventListener("change", function () {
  smallDimGroup.style.display = this.value === "Y" ? "block" : "none";
});

// ========================
// MAIN CALCULATE
// ========================
calculateBtn.addEventListener("click", function () {
  const airType = airTypeEl.value;
  const cfm = parseFloat(cfmEl.value);

  if (isNaN(cfm)) {
    resultsDiv.innerHTML = "Invalid CFM input.";
    return;
  }

  if (cfm <= 0) {
    resultsDiv.innerHTML = "CFM must be positive.";
    return;
  }

  if (selectedShape === "Round") {
    runRoundCalculation(airType, cfm);
  } else {
    runRectangularCalculation(airType, cfm);
  }
});

// ========================
// ENTER = CALCULATE
// ========================
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    calculateBtn.click();
  }
});

// ========================
// INITIAL STATE
// ========================
selectedShape = "Rectangular";

rectBtn.classList.add("active");
roundBtn.classList.remove("active");

roundOptions.style.display = "none";
rectangularOptions.style.display = "block";

maxDiameterGroup.style.display = maxDiameterChoice.value === "Y" ? "block" : "none";
smallDimGroup.style.display = maxChoiceEl.value === "Y" ? "block" : "none";

// ========================
// CLICK TEXT BOX TO SELECT ALL
// ========================
cfmEl.addEventListener("focus", function () {
  this.select();
});

cfmEl.addEventListener("dblclick", function () {
  this.select();
});
