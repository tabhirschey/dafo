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

// ========================
// DOM ELEMENTS
// ========================
let selectedShape = "Round";

const roundBtn = document.getElementById("roundBtn");
const rectBtn = document.getElementById("rectBtn");
roundBtn.addEventListener("click", function () {
  selectedShape = "Round";

  roundBtn.classList.add("active");
  rectBtn.classList.remove("active");

  // 👉 ADD THIS (pulse)
  roundBtn.classList.add("pulse");
  setTimeout(() => roundBtn.classList.remove("pulse"), 300);

  roundOptions.style.display = "block";
  rectangularOptions.style.display = "none";
});

rectBtn.addEventListener("click", function () {
  selectedShape = "Rectangular";

  rectBtn.classList.add("active");
  roundBtn.classList.remove("active");

  // 👉 ADD THIS (pulse)
  rectBtn.classList.add("pulse");
  setTimeout(() => rectBtn.classList.remove("pulse"), 300);

  roundOptions.style.display = "none";
  rectangularOptions.style.display = "block";
});

const airTypeEl = document.getElementById("airType");
const cfmEl = document.getElementById("cfm");
const calculateBtn = document.getElementById("calculateBtn");
const resultsDiv = document.getElementById("results");

// Round elements
const roundOptions = document.getElementById("roundOptions");
const maxDiameterChoice = document.getElementById("maxDiameterChoice");
const maxDiameterGroup = document.getElementById("maxDiameterGroup");
const maxDiameterEl = document.getElementById("maxDiameter");

// Rectangular elements
const rectangularOptions = document.getElementById("rectangularOptions");
const maxChoiceEl = document.getElementById("maxChoice");
const smallDimGroup = document.getElementById("smallDimGroup");
const exactSmallDimEl = document.getElementById("exactSmallDim");

// ========================
// SHARED FUNCTION
// ========================
function frictionFactor(reynolds, diameter) {
  if (reynolds < 2300) {
    return 64.0 / reynolds;
  }

  const term = (ROUGHNESS_M / diameter) / 3.7;
  const inv = -1.8 * Math.log10(Math.pow(term, 1.11) + 6.9 / reynolds);
  return 1.0 / (inv * inv);
}

// ========================
// ROUND FUNCTIONS
// ========================
function calculateFriction(cfm, diameterIn) {
  const q_m3s = cfm * CFM_TO_CMS;
  const d_m = diameterIn * IN_TO_M;

  const area = Math.PI * d_m * d_m / 4.0;
  const velocity = q_m3s / area;

  const reynolds = (AIR_DENSITY * velocity * d_m) / AIR_VISCOSITY;
  const f = frictionFactor(reynolds, d_m);

  const dpPerM = f * (AIR_DENSITY * velocity * velocity) / (2.0 * d_m);
  const dp100Ft = dpPerM * (100.0 * FT_TO_M);

  return dp100Ft * PA_TO_INWG;
}

function calculateVelocity(cfm, diameterIn) {
  const areaFt2 = Math.PI * Math.pow(diameterIn / 12.0, 2) / 4.0;
  return cfm / areaFt2;
}

function runRoundCalculation(airType, cfm) {
  let targetFriction = airType === "S" ? 0.10 : 0.05;
  let maxVelocity = airType === "S" ? 900 : 700;
  let maxDiameterLimit = MAX_DIAMETER;

  const maxChoice = maxDiameterChoice.value;
  const maxDiameterInput = parseInt(maxDiameterEl.value, 10);

  if (maxChoice === "Y") {
    if (
      isNaN(maxDiameterInput) ||
      maxDiameterInput < MIN_DIAMETER ||
      maxDiameterInput > MAX_DIAMETER ||
      maxDiameterInput % 2 !== 0
    ) {
      resultsDiv.innerHTML = "Invalid diameter.";
      return;
    }

    maxDiameterLimit = maxDiameterInput;
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

  let output = "";

  if (bestDiameter === -1) {
    output += "No usable diameter found.<br>";
    output += "<b>Velocity:</b> N/A FPM<br><br>";
    output += `<b>Max Velocity Cap:</b> ${Math.round(maxVelocity)} FPM`;
  } else {
    const roundedVelocity = Math.round(bestVelocity);

    output += `<b>Smallest Usable Diameter:</b> ${bestDiameter}"<br><br>`;
    output += `<b>Velocity:</b> ${roundedVelocity} FPM`;

    if (bestVelocity > maxVelocity) {
      output += "  --->  ⚠ ⚠ OVER VELOCITY ⚠ ⚠";
    }

    output += "<br><br>";
    output += `<b>Max Velocity Cap:</b> ${Math.round(maxVelocity)} FPM`;
  }

  resultsDiv.innerHTML = output;
}

// ========================
// RECTANGULAR FUNCTIONS
// ========================
function equivalentDiameterIn(aIn, bIn) {
  return 1.30 * Math.pow(aIn * bIn, 0.625) / Math.pow(aIn + bIn, 0.25);
}

function frictionInWgPer100Ft(cfm, deIn) {
  const qM3s = cfm * CFM_TO_CMS;
  const dM = deIn * IN_TO_M;

  const areaM2 = Math.PI * dM * dM / 4.0;
  const velocityMps = qM3s / areaM2;

  const reynolds = (AIR_DENSITY * velocityMps * dM) / AIR_VISCOSITY;
  const f = frictionFactor(reynolds, dM);

  const dpPerMPa = f * (AIR_DENSITY * velocityMps * velocityMps) / (2.0 * dM);
  const dp100FtPa = dpPerMPa * (100.0 * FT_TO_M);

  return dp100FtPa * PA_TO_INWG;
}

function aspectRatioDiff(w, h) {
  return Math.abs((w / h) - 1.0);
}

function passesFrictionLimit(cfm, w, h, targetFriction) {
  const deIn = equivalentDiameterIn(w, h);
  const f = frictionInWgPer100Ft(cfm, deIn);
  const effectiveTarget = targetFriction * SAFETY_FACTOR;

  return {
    passes: f <= effectiveTarget,
    friction: f
  };
}

function runRectangularCalculation(airType, cfm) {
  const maxChoice = maxChoiceEl.value;
  const exactSmallDim = parseInt(exactSmallDimEl.value, 10);

  if (maxChoice !== "Y" && maxChoice !== "N") {
    resultsDiv.innerHTML = "Invalid selection. Enter Y, N, or just press Enter.";
    return;
  }

  let exactDim = 0;

  if (maxChoice === "Y") {
    if (isNaN(exactSmallDim)) {
      resultsDiv.innerHTML = "Invalid measurement input.";
      return;
    }

    if (exactSmallDim < MIN_DIM_IN || exactSmallDim % 2 !== 0) {
      resultsDiv.innerHTML = `The smaller measurement must be an even number of at least ${MIN_DIM_IN}.`;
      return;
    }

    exactDim = exactSmallDim;
  }

  const targetFriction = airType === "S" ? 0.10 : 0.05;
  const options = [];

  for (let w = MIN_DIM_IN; w <= MAX_DIM_IN; w += STEP_IN) {
    for (let h = MIN_DIM_IN; h <= w; h += STEP_IN) {
      const result = passesFrictionLimit(cfm, w, h, targetFriction);

      if (!result.passes) continue;
      if (maxChoice === "Y" && h !== exactDim) continue;

      options.push({
        w: w,
        h: h,
        ratioDiff: aspectRatioDiff(w, h),
        area: w * h,
        friction: result.friction
      });
    }
  }

  if (options.length === 0) {
    resultsDiv.innerHTML =
      `No valid ${airType === "S" ? "supply" : "return"} duct sizes found.<br>` +
      `Try lowering the CFM, increasing available duct size, or reducing conservatism.`;
    return;
  }

  options.sort((a, b) => {
    if (a.w !== b.w) return a.w - b.w;
    if (a.h !== b.h) return a.h - b.h;
    return a.friction - b.friction;
  });

  let output = "";

  if (maxChoice === "Y") {
    output += `<b><u>${airType === "S" ? "Supply" : "Return"}</u></b><br><br>`;
    output += `<b>Best:</b> ${options[0].w}x${options[0].h}`;
  } else {
    const limit = Math.min(options.length, MAX_RESULTS);

    output += `<b><u>${airType === "S" ? "Supply" : "Return"}</u></b><br><br>`;
    output += `<b>Best:</b> ${options[0].w}x${options[0].h}<br><br>`;
    output += `<b>Other options:</b><br>`;

    for (let i = 1; i < limit; i++) {
      output += `${options[i].w}x${options[i].h}`;
      if (i < limit - 1) {
        output += "<br>";
      }
    }
  }

  resultsDiv.innerHTML = output;
}


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
const shape = selectedShape;
  const airType = airTypeEl.value;
  const cfm = parseFloat(cfmEl.value);

  if (isNaN(cfm)) {
    resultsDiv.innerHTML = "Invalid CFM input.";
    return;
  }

  if (cfm === 0) {
    resultsDiv.innerHTML = "Exiting program.";
    return;
  }

  if (cfm < 0) {
    resultsDiv.innerHTML = "CFM must be positive.";
    return;
  }

  if (shape === "Round") {
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

roundOptions.style.display = "block";
rectangularOptions.style.display = "none";

// ========================
// CLICK TEXT BOX TO SELECT ALL
// ========================

const cfmInput = document.getElementById("cfm");

cfmInput.addEventListener("focus", function () {
  this.select();
});

cfmInput.addEventListener("dblclick", function () {
  this.select();
});
