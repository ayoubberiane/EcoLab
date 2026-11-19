
/* =====================================================
   ÉCOLAB — COMPLETE JAVASCRIPT
   Navigation · Market simulator · Calculators · ÉcoBot
===================================================== */

"use strict";

/* =====================================================
   1. GENERAL UTILITIES
===================================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  });
}

function readNumber(id) {
  const element = document.getElementById(id);
  if (!element) return NaN;

  const value = element.value.trim();
  if (value === "") return NaN;

  return Number(value);
}

function showResult(id, content, isError = false) {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent = content;
  element.classList.toggle("error", isError);
}

function escapeText(value) {
  return String(value);
}

/* =====================================================
   2. NAVIGATION
===================================================== */

const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  $$("#mainNav a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const yearElement = $("#currentYear");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

/* =====================================================
   3. MARKET EQUILIBRIUM SIMULATOR
===================================================== */

/*
  Linear market model:

  Demand:
  Qd = A - Pb

  Supply:
  Qs = Ps - C

  Tax wedge:
  Pb = Ps + T

  At equilibrium:
  Qd = Qs = Q

  Therefore:
  Q* = (A - C - T) / 2

  Pb = A - Q*
  Ps = Pb - T

  The model assumes:
  - Linear demand and supply.
  - A specific per-unit tax.
  - No externalities or other market distortions.
*/

const demandSlider = $("#demandSlider");
const supplySlider = $("#supplySlider");
const taxSlider = $("#taxSlider");

const demandValue = $("#demandValue");
const supplyValue = $("#supplyValue");
const taxValue = $("#taxValue");

const buyerPriceOutput = $("#buyerPrice");
const sellerPriceOutput = $("#sellerPrice");
const quantityOutput = $("#equilibriumQuantity");

const marketExplanation = $("#marketExplanation");
const marketCanvas = $("#marketChart");

let marketState = null;

const MARKET_COLORS = {
  demand: "#b9f36b",
  supply: "#91abc8",
  tax: "#e7b77b",
  consumer: "rgba(185, 243, 107, 0.16)",
  producer: "rgba(145, 171, 200, 0.2)",
  revenue: "rgba(231, 183, 123, 0.22)",
  deadweight: "rgba(240, 120, 100, 0.38)"
};

function getMarketParameters() {
  const demandIntensity = Number(demandSlider?.value ?? 50);
  const supplyIntensity = Number(supplySlider?.value ?? 50);
  const tax = Number(taxSlider?.value ?? 0);

  /*
    Higher demand intensity shifts the demand intercept upward.
    Higher supply intensity shifts the supply curve downward.
  */

  const demandIntercept = 70 + (demandIntensity - 50) * 0.6;
  const supplyIntercept = 30 + (50 - supplyIntensity) * 0.6;

  const quantity = Math.max(
    0,
    (demandIntercept - supplyIntercept - tax) / 2
  );

  const buyerPrice = demandIntercept - quantity;
  const sellerPrice = buyerPrice - tax;

  // No-tax benchmark, used for incidence and deadweight loss.
  const baseQuantity = Math.max(0, (demandIntercept - supplyIntercept) / 2);
  const basePrice = demandIntercept - baseQuantity;

  // With slopes of -1 and +1, all surplus areas are simple triangles/rectangles.
  const consumerSurplus = 0.5 * quantity * (demandIntercept - buyerPrice);
  const producerSurplus = 0.5 * quantity * Math.max(0, sellerPrice - supplyIntercept);
  const taxRevenue = tax * quantity;
  const deadweightLoss = Math.max(0, 0.5 * (baseQuantity - quantity) * Math.min(tax, demandIntercept - supplyIntercept));
  const noTrade = quantity <= 0;

  return {
    demandIntensity,
    supplyIntensity,
    tax,
    demandIntercept,
    supplyIntercept,
    quantity,
    buyerPrice,
    sellerPrice,
    baseQuantity,
    basePrice,
    consumerSurplus,
    producerSurplus,
    taxRevenue,
    deadweightLoss,
    noTrade
  };
}

function updateMarket() {
  if (!demandSlider || !supplySlider || !taxSlider) return;

  marketState = getMarketParameters();

  const state = marketState;

  if (demandValue) demandValue.textContent = state.demandIntensity;
  if (supplyValue) supplyValue.textContent = state.supplyIntensity;
  if (taxValue) taxValue.textContent = state.tax;

  if (buyerPriceOutput) {
    buyerPriceOutput.textContent = state.noTrade ? "—" : formatNumber(state.buyerPrice);
  }

  if (sellerPriceOutput) {
    sellerPriceOutput.textContent = state.noTrade ? "—" : formatNumber(state.sellerPrice);
  }

  if (quantityOutput) {
    quantityOutput.textContent = formatNumber(state.quantity);
  }

  const welfareOutputs = {
    consumerSurplus: "#consumerSurplus",
    producerSurplus: "#producerSurplus",
    taxRevenue: "#taxRevenue",
    deadweightLoss: "#deadweightLoss"
  };

  Object.entries(welfareOutputs).forEach(([key, selector]) => {
    const element = $(selector);
    if (element) element.textContent = formatNumber(state[key], 1);
  });

  updateMarketExplanation(state);
  drawMarketChart(state);
}

function updateMarketExplanation(state) {
  if (!marketExplanation) return;

  let message = "";

  if (state.noTrade) {
    message = state.tax > 0 && state.baseQuantity > 0
      ? `At a tax of ${state.tax}, the highest price any buyer will pay is below the lowest price any seller will accept plus the tax. The market shuts down entirely: all potential gains from trade (${formatNumber(state.deadweightLoss, 1)}) are lost as deadweight loss.`
      : "Even the most eager buyer values the good less than the lowest-cost seller can produce it, so no trade takes place.";
  } else if (state.tax > 0) {
    const buyerShare = state.buyerPrice - state.basePrice;
    const sellerShare = state.basePrice - state.sellerPrice;

    message =
      `A per-unit tax of ${state.tax} drives a wedge between the price buyers pay (${formatNumber(state.buyerPrice)}) and the price sellers keep (${formatNumber(state.sellerPrice)}). ` +
      `Buyers bear ${formatNumber(buyerShare)} and sellers ${formatNumber(sellerShare)} of it. ` +
      `Quantity falls from ${formatNumber(state.baseQuantity)} to ${formatNumber(state.quantity)}; the government collects ${formatNumber(state.taxRevenue, 1)}, but ${formatNumber(state.deadweightLoss, 1)} of surplus simply disappears — the deadweight loss.`;
  } else if (state.demandIntensity > 55) {
    message =
      "Demand is relatively strong. In this model, the equilibrium price and quantity rise as demand increases, holding supply conditions constant.";
  } else if (state.demandIntensity < 45) {
    message =
      "Demand is relatively weak. The market adjusts toward a lower equilibrium price and quantity, holding supply conditions constant.";
  } else if (state.supplyIntensity > 55) {
    message =
      "Supply is relatively strong. More goods are available at each price, putting downward pressure on equilibrium price and increasing equilibrium quantity.";
  } else if (state.supplyIntensity < 45) {
    message =
      "Supply is relatively constrained. Equilibrium price tends to rise while equilibrium quantity falls.";
  } else {
    message =
      "The market is close to its baseline conditions. Change demand, supply or tax to see how equilibrium responds.";
  }

  marketExplanation.textContent = message;
}

/* Canvas graph */

function drawMarketChart(state) {
  if (!marketCanvas) return;

  const rect = marketCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const ctx = marketCanvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  marketCanvas.width = Math.round(rect.width * dpr);
  marketCanvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;

  const margin = {
    left: 42,
    right: 17,
    top: 18,
    bottom: 37
  };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const x = quantity => margin.left + (quantity / 100) * plotWidth;
  const y = price => margin.top + (1 - price / 100) * plotHeight;

  ctx.clearRect(0, 0, width, height);

  // Background grid
  ctx.strokeStyle = "#3a4c40";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const gx = margin.left + (plotWidth / 5) * i;
    const gy = margin.top + (plotHeight / 5) * i;

    ctx.beginPath();
    ctx.moveTo(gx, margin.top);
    ctx.lineTo(gx, height - margin.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin.left, gy);
    ctx.lineTo(width - margin.right, gy);
    ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = "#a1b2a4";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {
    const value = i * 20;

    ctx.fillText(
      String(value),
      x(value),
      height - 16
    );

    ctx.textAlign = "right";

    ctx.fillText(
      String(100 - value),
      margin.left - 8,
      y(100 - value) + 3
    );

    ctx.textAlign = "center";
  }

  // Axes
  ctx.strokeStyle = "#8b9c8d";
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  // Welfare areas (drawn first so curves sit on top)
  const fillPolygon = (points, color) => {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(x(points[0][0]), y(points[0][1]));
    points.slice(1).forEach(([qv, pv]) => ctx.lineTo(x(qv), y(pv)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  if (!state.noTrade) {
    const Q = state.quantity;

    // Consumer surplus: below demand, above buyer price
    fillPolygon([[0, state.demandIntercept], [0, state.buyerPrice], [Q, state.buyerPrice]], MARKET_COLORS.consumer);

    // Producer surplus: above supply, below seller price
    fillPolygon([[0, Math.max(0, state.supplyIntercept)], [0, state.sellerPrice], [Q, state.sellerPrice]], MARKET_COLORS.producer);

    // Tax revenue: rectangle between the two prices
    if (state.tax > 0) {
      fillPolygon([[0, state.buyerPrice], [Q, state.buyerPrice], [Q, state.sellerPrice], [0, state.sellerPrice]], MARKET_COLORS.revenue);
    }
  }

  // Deadweight loss: triangle between the taxed and untaxed equilibria
  if (state.deadweightLoss > 0) {
    const Q = state.quantity;
    fillPolygon([
      [Q, state.demandIntercept - Q],
      [Q, state.supplyIntercept + Q],
      [state.baseQuantity, state.basePrice]
    ], MARKET_COLORS.deadweight);
  }

  // Curves: return the last visible point so labels sit at the end of each line
  const drawCurve = (priceAt, color, width, dash = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();

    let last = null;

    for (let q = 0; q <= 100; q += 0.5) {
      const p = priceAt(q);
      if (p < 0 || p > 100) continue;

      if (!last) ctx.moveTo(x(q), y(p));
      else ctx.lineTo(x(q), y(p));

      last = [q, p];
    }

    ctx.stroke();
    ctx.setLineDash([]);
    return last;
  };

  const demandEnd = drawCurve(q => state.demandIntercept - q, MARKET_COLORS.demand, 2.7);
  const supplyEnd = drawCurve(q => state.supplyIntercept + q, MARKET_COLORS.supply, 2.7);
  const taxEnd = state.tax > 0
    ? drawCurve(q => state.supplyIntercept + q + state.tax, MARKET_COLORS.tax, 1.7, [5, 4])
    : null;

  if (!state.noTrade) {
    // Equilibrium guide lines
    const eqX = x(state.quantity);
    const buyerY = y(state.buyerPrice);
    const sellerY = y(state.sellerPrice);

    ctx.strokeStyle = "#d4e4cb";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(eqX, buyerY);
    ctx.lineTo(eqX, height - margin.bottom);
    ctx.stroke();

    if (state.tax > 0) {
      ctx.beginPath();
      ctx.moveTo(margin.left, buyerY);
      ctx.lineTo(eqX, buyerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(margin.left, sellerY);
      ctx.lineTo(eqX, sellerY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(margin.left, buyerY);
      ctx.lineTo(eqX, buyerY);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Buyer equilibrium point
    ctx.beginPath();
    ctx.arc(eqX, buyerY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#b9f36b";
    ctx.fill();

    ctx.strokeStyle = "#17251e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Seller equilibrium point when tax is present
    if (state.tax > 0) {
      ctx.beginPath();
      ctx.arc(eqX, sellerY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#e7b77b";
      ctx.fill();
    }
  }

  // Axis titles
  ctx.fillStyle = "#a1b2a4";
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillText("PRICE", margin.left, 10);

  ctx.textAlign = "right";
  ctx.fillText("QUANTITY", width - margin.right, height - 3);

  // Curve labels at the end of each line
  ctx.font = "10px monospace";
  ctx.textAlign = "left";

  const labelAt = (end, text, color, dy) => {
    if (!end) return;
    ctx.fillStyle = color;
    const lx = Math.min(x(end[0]) + 6, width - margin.right - ctx.measureText(text).width);
    ctx.fillText(text, lx, y(end[1]) + dy);
  };

  labelAt(demandEnd, "D", MARKET_COLORS.demand, -4);
  labelAt(supplyEnd, "S", MARKET_COLORS.supply, 12);
  // The taxed supply label sits just left of its line end so it never collides with "S".
  if (taxEnd) {
    ctx.fillStyle = MARKET_COLORS.tax;
    ctx.textAlign = "right";
    ctx.fillText("S + TAX", x(taxEnd[0]) - 6, y(taxEnd[1]) + 10);
  }
}

[demandSlider, supplySlider, taxSlider].forEach(slider => {
  if (slider) slider.addEventListener("input", updateMarket);
});

const resetMarket = $("#resetMarket");

if (resetMarket) {
  resetMarket.addEventListener("click", () => {
    demandSlider.value = 50;
    supplySlider.value = 50;
    taxSlider.value = 0;
    updateMarket();
  });
}

window.addEventListener("resize", () => {
  if (marketState) drawMarketChart(marketState);
});

updateMarket();

/* =====================================================
   4. PRICE ELASTICITY CALCULATOR
===================================================== */

const elasticityButton = $("#calculateElasticity");

if (elasticityButton) {
  elasticityButton.addEventListener("click", () => {
    const p1 = readNumber("p1");
    const p2 = readNumber("p2");
    const q1 = readNumber("q1");
    const q2 = readNumber("q2");

    if (![p1, p2, q1, q2].every(Number.isFinite)) {
      showResult("elasticityResult", "Please enter valid numbers in all fields.", true);
      return;
    }

    if (p1 <= 0 || p2 <= 0 || q1 <= 0 || q2 <= 0) {
      showResult("elasticityResult", "Prices and quantities must be greater than zero.", true);
      return;
    }

    const averageQuantity = (q1 + q2) / 2;
    const averagePrice = (p1 + p2) / 2;

    const percentageQuantity = (q2 - q1) / averageQuantity;
    const percentagePrice = (p2 - p1) / averagePrice;

    if (percentagePrice === 0) {
      showResult("elasticityResult", "Price did not change. Elasticity cannot be calculated with this input.", true);
      return;
    }

    const ped = percentageQuantity / percentagePrice;
    const absolutePED = Math.abs(ped);

    let interpretation;

    if (Math.abs(absolutePED - 1) < 0.000001) {
      interpretation = "Unit elastic demand";
    } else if (absolutePED > 1) {
      interpretation = "Elastic demand";
    } else {
      interpretation = "Inelastic demand";
    }

    const result =
      `PRICE ELASTICITY OF DEMAND\n\n` +
      `Percentage change in quantity: ${formatNumber(percentageQuantity * 100)}%\n` +
      `Percentage change in price: ${formatNumber(percentagePrice * 100)}%\n\n` +
      `PED = ${formatNumber(ped, 4)}\n` +
      `Absolute PED = ${formatNumber(absolutePED, 4)}\n\n` +
      `Interpretation: ${interpretation}.\n\n` +
      `The absolute value tells us how responsive quantity demanded is to a price change.`;

    showResult("elasticityResult", result);
  });
}

/* =====================================================
   5. GDP CALCULATOR
===================================================== */

const gdpButton = $("#calculateGDP");

if (gdpButton) {
  gdpButton.addEventListener("click", () => {
    const C = readNumber("gdpC");
    const I = readNumber("gdpI");
    const G = readNumber("gdpG");
    const X = readNumber("gdpX");
    const M = readNumber("gdpM");

    if (![C, I, G, X, M].every(Number.isFinite)) {
      showResult("gdpResult", "Please complete all five fields with valid numbers.", true);
      return;
    }

    const netExports = X - M;
    const gdp = C + I + G + netExports;

    const result =
      `GDP EXPENDITURE APPROACH\n\n` +
      `Consumption: ${formatNumber(C)}\n` +
      `Investment: ${formatNumber(I)}\n` +
      `Government purchases: ${formatNumber(G)}\n` +
      `Exports: ${formatNumber(X)}\n` +
      `Imports: ${formatNumber(M)}\n\n` +
      `Net exports = X − M = ${formatNumber(netExports)}\n\n` +
      `GDP = C + I + G + (X − M)\n` +
      `GDP = ${formatNumber(gdp)} monetary units.`;

    showResult("gdpResult", result);
  });
}

/* =====================================================
   6. HERFINDAHL-HIRSCHMAN INDEX CALCULATOR
===================================================== */

const hhiButton = $("#calculateHHI");

if (hhiButton) {
  hhiButton.addEventListener("click", () => {
    const raw = $("#hhiShares")?.value ?? "";

    const shares = raw
      .split(/[\s,;]+/)
      .filter(value => value.length > 0)
      .map(Number);

    if (
      shares.length < 2 ||
      shares.some(value => !Number.isFinite(value) || value < 0 || value > 100)
    ) {
      showResult("hhiResult", "Enter at least two valid market shares between 0 and 100.", true);
      return;
    }

    const totalShare = shares.reduce((sum, value) => sum + value, 0);

    if (Math.abs(totalShare - 100) > 0.01) {
      showResult(
        "hhiResult",
        `Your market shares total ${formatNumber(totalShare)}%, not 100%. Please correct the entries.`,
        true
      );
      return;
    }

    const hhi = shares.reduce((sum, value) => sum + value ** 2, 0);

    let interpretation;

    if (hhi < 1500) {
      interpretation = "Relatively low concentration under one commonly used US screening framework.";
    } else if (hhi < 2500) {
      interpretation = "Moderate concentration under one commonly used US screening framework.";
    } else {
      interpretation = "High concentration under one commonly used US screening framework.";
    }

    const result =
      `MARKET CONCENTRATION\n\n` +
      `Market shares: ${shares.join("%, ")}%\n\n` +
      `HHI = ${shares.map(value => `${value}²`).join(" + ")}\n` +
      `HHI = ${formatNumber(hhi, 0)}\n\n` +
      `${interpretation}\n\n` +
      `Note: Regulatory thresholds vary by jurisdiction and framework.`;

    showResult("hhiResult", result);
  });
}

/* =====================================================
   7. DESCRIPTIVE STATISTICS
===================================================== */

function medianOf(sortedValues) {
  const n = sortedValues.length;
  const middle = Math.floor(n / 2);

  if (n % 2 === 1) {
    return sortedValues[middle];
  }

  return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function modesOf(values) {
  const frequency = new Map();

  values.forEach(value => {
    frequency.set(value, (frequency.get(value) || 0) + 1);
  });

  const maxFrequency = Math.max(...frequency.values());

  if (maxFrequency === 1) return [];

  return [...frequency.entries()]
    .filter(([, count]) => count === maxFrequency)
    .map(([value]) => value)
    .sort((a, b) => a - b);
}

function quartilesOf(sortedValues) {
  const n = sortedValues.length;

  if (n === 1) {
    return {
      q1: sortedValues[0],
      q3: sortedValues[0]
    };
  }

  const middle = Math.floor(n / 2);

  const lowerHalf = sortedValues.slice(0, middle);
  const upperHalf = sortedValues.slice(Math.ceil(n / 2));

  return {
    q1: medianOf(lowerHalf),
    q3: medianOf(upperHalf)
  };
}

const statsButton = $("#calculateStats");

if (statsButton) {
  statsButton.addEventListener("click", () => {
    const raw = $("#statsData")?.value ?? "";

    const values = raw
      .split(/[\s,;]+/)
      .filter(value => value.length > 0)
      .map(Number);

    if (
      values.length === 0 ||
      values.some(value => !Number.isFinite(value))
    ) {
      showResult("statsResult", "Please enter a valid numerical dataset.", true);
      return;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const sum = values.reduce((total, value) => total + value, 0);
    const mean = sum / n;
    const median = medianOf(sorted);
    const modes = modesOf(values);

    const minimum = sorted[0];
    const maximum = sorted[n - 1];
    const range = maximum - minimum;

    const { q1, q3 } = quartilesOf(sorted);
    const iqr = q3 - q1;

    const squaredDeviations = values.reduce((total, value) => total + (value - mean) ** 2, 0);
    const populationVariance = squaredDeviations / n;
    const sampleVariance = n > 1 ? squaredDeviations / (n - 1) : NaN;
    const sampleSD = Math.sqrt(sampleVariance);
    const cv = mean !== 0 ? (sampleSD / Math.abs(mean)) * 100 : NaN;
    const show = value => Number.isFinite(value) ? formatNumber(value) : "n/a (needs 2+ values)";

    const result =
      `DESCRIPTIVE STATISTICS\n\n` +
      `Observations: ${n}\n` +
      `Sum: ${formatNumber(sum)}\n` +
      `Mean: ${formatNumber(mean)}\n` +
      `Median: ${formatNumber(median)}\n` +
      `Mode: ${modes.length ? modes.map(formatNumber).join(", ") : "No mode"}\n\n` +
      `Minimum: ${formatNumber(minimum)}\n` +
      `Maximum: ${formatNumber(maximum)}\n` +
      `Range: ${formatNumber(range)}\n\n` +
      `First quartile (Q1): ${formatNumber(q1)}\n` +
      `Third quartile (Q3): ${formatNumber(q3)}\n` +
      `Interquartile range: ${formatNumber(iqr)}\n\n` +
      `Population variance (σ²): ${formatNumber(populationVariance)}\n` +
      `Population std. deviation (σ): ${formatNumber(Math.sqrt(populationVariance))}\n` +
      `Sample variance (s²): ${show(sampleVariance)}\n` +
      `Sample std. deviation (s): ${show(sampleSD)}\n` +
      `Coefficient of variation: ${Number.isFinite(cv) ? formatNumber(cv) + "%" : "n/a"}\n\n` +
      `Quartile method: median of the lower and upper halves.`;

    showResult("statsResult", result);
  });
}

/* =====================================================
   7b. INFLATION AND UNEMPLOYMENT CALCULATORS
===================================================== */

const inflationButton = $("#calculateInflation");

if (inflationButton) {
  inflationButton.addEventListener("click", () => {
    const oldCPI = readNumber("cpiOld");
    const newCPI = readNumber("cpiNew");
    const nominal = readNumber("nominalValue");

    if (![oldCPI, newCPI].every(Number.isFinite) || oldCPI <= 0 || newCPI <= 0) {
      showResult("inflationResult", "Enter two positive price index values.", true);
      return;
    }

    const rate = ((newCPI - oldCPI) / oldCPI) * 100;
    let text =
      `INFLATION RATE\n\n` +
      `Inflation = (${formatNumber(newCPI)} − ${formatNumber(oldCPI)}) / ${formatNumber(oldCPI)} × 100\n` +
      `Inflation = ${formatNumber(rate)}%\n\n`;

    if (rate > 0) text += `Prices rose: the same basket now costs ${formatNumber(rate)}% more.`;
    else if (rate < 0) text += `Prices fell: this is deflation of ${formatNumber(Math.abs(rate))}%.`;
    else text += "The price level is unchanged.";

    if (Number.isFinite(nominal)) {
      const real = nominal * (oldCPI / newCPI);
      text +=
        `\n\nPURCHASING POWER\n` +
        `${formatNumber(nominal)} today buys what ${formatNumber(real)} bought in the base period.\n` +
        `Real value = Nominal × (Old CPI / New CPI)`;
    }

    showResult("inflationResult", text);
  });
}

const unemploymentButton = $("#calculateUnemployment");

if (unemploymentButton) {
  unemploymentButton.addEventListener("click", () => {
    const employed = readNumber("employed");
    const unemployed = readNumber("unemployed");
    const population = readNumber("workingAgePop");

    if (
      ![employed, unemployed].every(Number.isFinite) ||
      employed < 0 || unemployed < 0 || employed + unemployed === 0
    ) {
      showResult("unemploymentResult", "Enter non-negative numbers for employed and unemployed people.", true);
      return;
    }

    const labourForce = employed + unemployed;
    const rate = (unemployed / labourForce) * 100;

    let text =
      `LABOUR MARKET\n\n` +
      `Labour force = ${formatNumber(employed)} + ${formatNumber(unemployed)} = ${formatNumber(labourForce)}\n\n` +
      `Unemployment rate = ${formatNumber(unemployed)} / ${formatNumber(labourForce)} × 100\n` +
      `Unemployment rate = ${formatNumber(rate)}%`;

    if (Number.isFinite(population)) {
      if (population < labourForce) {
        showResult("unemploymentResult", "Working-age population cannot be smaller than the labour force.", true);
        return;
      }

      text +=
        `\n\nParticipation rate = ${formatNumber((labourForce / population) * 100)}%\n` +
        `Employment rate = ${formatNumber((employed / population) * 100)}%\n` +
        `Outside the labour force: ${formatNumber(population - labourForce)}`;
    }

    showResult("unemploymentResult", text);
  });
}

/* -----------------------------------------------------
   Calculator conveniences: press Enter to calculate,
   and show the worked default example on first load.
----------------------------------------------------- */

$$(".calculator-card").forEach(card => {
  const button = card.querySelector(".calc-button");
  if (!button) return;

  card.querySelectorAll("input").forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        button.click();
      }
    });
  });

  button.click();
});

/* =====================================================
   8. ÉCOBOT — ECONOMICS TUTOR
===================================================== */

const launcher = $("#ecobotLauncher");
const chatWindow = $("#ecobotWindow");
const closeChatButton = $("#ecobotClose");
const chatForm = $("#ecobotForm");
const chatInput = $("#ecobotInput");
const chatMessages = $("#ecobotMessages");
const chatDomain = $("#ecobotDomain");

function openEcoBot() {
  if (!chatWindow || !launcher) return;

  chatWindow.hidden = false;
  launcher.setAttribute("aria-expanded", "true");

  if (chatInput) chatInput.focus();
}

function closeEcoBot() {
  if (!chatWindow || !launcher) return;

  chatWindow.hidden = true;
  launcher.setAttribute("aria-expanded", "false");
  launcher.focus();
}

if (launcher) {
  launcher.addEventListener("click", () => {
    if (chatWindow.hidden) {
      openEcoBot();
    } else {
      closeEcoBot();
    }
  });
}

if (closeChatButton) {
  closeChatButton.addEventListener("click", closeEcoBot);
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && chatWindow && !chatWindow.hidden) {
    closeEcoBot();
  }
});

/* -----------------------------------------------------
   ÉcoBot educational knowledge
----------------------------------------------------- */

const ecoKnowledge = {

  scarcity: `SCARCITY AND ECONOMIC CHOICE

Scarcity is the fundamental economic problem: resources
are limited while human wants are numerous.

Because resources are scarce, individuals, businesses
and governments must make choices.

These choices involve trade-offs.

Example:
A government has a limited budget. Spending more on
healthcare may mean allocating less to another priority.

Economics studies how these choices are made.`,

  opportunity: `OPPORTUNITY COST

Opportunity cost is the value of the next-best
alternative sacrificed when making a choice.

Example:
You have 100 MAD and can either buy a book or go
to the cinema.

If you choose the book, the opportunity cost is
the value of the cinema experience you gave up.

Remember: opportunity cost is not necessarily
a monetary cost.`,

  supply: `SUPPLY AND DEMAND

Demand represents the quantity consumers are willing
and able to purchase at different prices.

Supply represents the quantity producers are willing
and able to sell at different prices.

In the standard competitive market model:

• An increase in demand raises equilibrium price
  and quantity, holding supply constant.
• An increase in supply lowers equilibrium price
  and raises equilibrium quantity, holding demand constant.

The intersection of the two curves is market equilibrium.`,

  elasticity: `PRICE ELASTICITY OF DEMAND

Price elasticity measures how responsive quantity
demanded is to a change in price.

PED = % change in quantity demanded
      / % change in price

The midpoint formula is:

PED = [(Q2 − Q1) / ((Q2 + Q1) / 2)]
      / [(P2 − P1) / ((P2 + P1) / 2)]

Interpretation:

• |PED| > 1: Elastic demand
• |PED| < 1: Inelastic demand
• |PED| = 1: Unit elastic demand

Demand usually has a negative price elasticity because
price and quantity demanded generally move in opposite
directions.`,

  gdp: `GROSS DOMESTIC PRODUCT (GDP)

GDP measures the market value of final goods and
services produced within a country's borders during
a given period.

Expenditure approach:

GDP = C + I + G + (X − M)

Where:

C = Household consumption
I = Investment
G = Government purchases
X = Exports
M = Imports

Example:

C = 500
I = 150
G = 200
X = 120
M = 90

GDP = 500 + 150 + 200 + (120 − 90)
GDP = 880 monetary units.

Imports are subtracted because they are included in
some of the other expenditure categories but are not
domestic production.`,

  inflation: `INFLATION

Inflation is a sustained increase in the general price
level of goods and services.

A common measure is the percentage change in the
Consumer Price Index (CPI).

Inflation rate =
[(New CPI − Old CPI) / Old CPI] × 100

Example:

Previous CPI = 100
Current CPI = 105

Inflation = [(105 − 100) / 100] × 100
Inflation = 5%

When prices rise, the purchasing power of money
generally declines.`,

  unemployment: `UNEMPLOYMENT

The unemployment rate measures the percentage of the
labour force that is unemployed and actively seeking work.

Unemployment rate =
(Unemployed people / Labour force) × 100

The labour force includes employed people and
unemployed people who meet the relevant criteria
for active job search and availability.

It does not include every person who is not working.`,

  micro: `MICROECONOMICS

Microeconomics studies individual economic agents
and their interactions.

Main topics include:

• Consumer choice and utility
• Supply and demand
• Price elasticity
• Production theory
• Costs, revenues and profit
• Market structures
• Opportunity cost
• Marginal analysis

Its central question is how individuals and firms
make decisions under resource constraints.`,

  meso: `MESOECONOMICS

Mesoeconomics examines the intermediate level between
individual economic agents and the national economy.

It focuses on sectors, industries, regional systems
and networks of businesses.

Key concepts:

• Industrial clusters
• Value chains
• Sector productivity
• Market concentration
• Regional development
• Supply chains
• Industrial organization

Example:
An increase in automotive production can influence
component suppliers, logistics companies, employment
and investment across an industrial ecosystem.`,

  macro: `MACROECONOMICS

Macroeconomics studies the economy as a whole.

Its main topics include:

• GDP and national income
• Economic growth
• Inflation
• Unemployment
• Fiscal policy
• Monetary policy
• International trade
• Aggregate demand and aggregate supply

It examines national economic indicators and how
economic policies influence them.`,

  mean: `ARITHMETIC MEAN

The arithmetic mean is calculated by dividing the
sum of observations by the number of observations.

Mean = Sum of observations / Number of observations

Example:

Dataset: 10, 20, 30

Mean = (10 + 20 + 30) / 3
Mean = 20

The mean is sensitive to extreme values.`,

  median: `MEDIAN

The median is the central value of an ordered dataset.

If the number of observations is odd, the median is
the middle observation.

If it is even, the median is the average of the
two central observations.

Example:

3, 5, 8, 10, 12

Median = 8

The median is less sensitive to extreme values
than the arithmetic mean.`,

  statistics: `DESCRIPTIVE STATISTICS

Descriptive statistics summarize and describe data.

Measures of central tendency:

• Mean
• Median
• Mode

Measures of position:

• Quartiles
• Quintiles
• Deciles
• Percentiles

Measures of dispersion:

• Range
• Interquartile range
• Variance
• Standard deviation

These tools help us understand the distribution
and characteristics of a dataset.`,

  hhi: `HERFINDAHL-HIRSCHMAN INDEX (HHI)

The HHI measures market concentration.

Formula:

HHI = Sum of squared market shares.

Example:

Market shares: 40%, 30%, 20%, 10%

HHI = 40² + 30² + 20² + 10²
HHI = 1,600 + 900 + 400 + 100
HHI = 3,000

The higher the index, the more concentrated the market.

Regulatory thresholds differ across jurisdictions.`,

  monopoly: `MARKET STRUCTURES

Perfect competition:
Many firms, homogeneous products and relatively
free entry and exit.

Monopoly:
A single firm supplies the market, with significant
barriers to entry.

Oligopoly:
A small number of firms interact strategically.

Monopolistic competition:
Many firms sell differentiated products.

The structure of a market influences pricing,
production and competition.`,

  production: `PRODUCTION AND COSTS

Production transforms inputs into outputs.

Common cost concepts include:

Fixed costs:
Costs that do not vary with output in the short run.

Variable costs:
Costs that change with the level of production.

Total cost:
TC = FC + VC

Average cost:
AC = TC / Q

Marginal cost:
MC = Change in total cost / Change in output

Marginal analysis helps firms decide how much to produce.`,

  valuechain: `VALUE CHAINS

A value chain describes the sequence of activities
through which a product or service gains value.

Example: Automotive industry

1. Raw material extraction
2. Component manufacturing
3. Assembly
4. Distribution
5. Marketing and sales
6. After-sales services

Mesoeconomic analysis examines how firms, sectors
and institutions interact throughout these stages.`,

  clusters: `INDUSTRIAL CLUSTERS

An industrial cluster is a geographic concentration
of interconnected firms, suppliers, service providers
and institutions in a particular field.

Clusters can facilitate:

• Knowledge sharing
• Specialized labour markets
• Supplier networks
• Innovation
• Productivity gains

They are an important topic in regional and
mesoeconomic analysis.`,

  monetary: `MONETARY POLICY

Monetary policy refers to actions taken by a central
bank to influence monetary and financial conditions.

Common instruments include:

• Policy interest rates
• Open market operations
• Reserve requirements, where applicable

A change in interest rates can influence borrowing,
saving, investment, consumption and inflation.

The exact transmission mechanism depends on the
economic and institutional context.`,

  fiscal: `FISCAL POLICY

Fiscal policy concerns government spending,
taxation and borrowing.

Expansionary fiscal policy can involve:

• Increasing government expenditure
• Reducing taxes

Contractionary fiscal policy can involve:

• Reducing government expenditure
• Increasing taxes

Its effects depend on economic conditions,
financing, timing and the structure of the economy.`,

  growth: `ECONOMIC GROWTH

Economic growth refers to an increase in the
production of goods and services over time.

It is often measured by the percentage change
in real GDP.

Real GDP growth =
[(Current real GDP − Previous real GDP)
 / Previous real GDP] × 100

Growth can be influenced by productivity,
capital accumulation, labour, technology
and institutions.`,

  trade: `INTERNATIONAL TRADE

International trade is the exchange of goods
and services across national borders.

Exports are goods and services sold abroad.
Imports are goods and services purchased abroad.

Net exports = Exports − Imports

In the expenditure approach to GDP, net exports
are included as part of aggregate expenditure.

Trade can create gains from specialization,
but its effects are distributed unevenly.`,

  utility: `UTILITY AND CONSUMER CHOICE

Utility represents the satisfaction or benefit
a consumer obtains from consuming goods or services.

Consumer theory studies how people allocate limited
income among different alternatives.

The budget constraint describes the combinations
of goods a consumer can afford.

Consumer choice depends on preferences,
prices and available income.`,

  marginal: `MARGINAL ANALYSIS

Marginal analysis examines the additional benefit
and additional cost of one more unit of an activity.

Marginal benefit (MB):
The additional benefit from one more unit.

Marginal cost (MC):
The additional cost from one more unit.

A common decision rule is to continue an activity
while marginal benefit exceeds marginal cost.

In a simple interior optimum:
MB = MC.`,

  freeRider: `THE FREE-RIDER PROBLEM

A free rider benefits from a good or service without
contributing adequately to its provision.

This problem is especially relevant to public goods,
which are non-excludable and non-rival in consumption.

Example:
People may benefit from street lighting even if
they do not directly pay for it.

The free-rider problem can lead to under-provision
of public goods by private markets.`,

  microVsMacro: `MICROECONOMICS VS MACROECONOMICS

Microeconomics zooms in on individual decision-makers:
households, firms and single markets.
Typical questions: Why did the price of coffee rise?
How many workers should this firm hire?

Macroeconomics zooms out to the whole economy.
Typical questions: Why is inflation 5%? Why did
national output fall during a recession?

Mesoeconomics sits in between: industries, sectors,
value chains and regions.

The levels are connected. Millions of micro decisions
add up to macro outcomes, and macro conditions
(interest rates, inflation) shape micro decisions.`,

  meanVsMedian: `MEAN VS MEDIAN

Mean = sum of values / number of values.
Median = the middle value of the ordered data.

Example (monthly incomes):
3,000 · 3,200 · 3,500 · 3,800 · 40,000

Mean   = 53,500 / 5 = 10,700
Median = 3,500

One very high income pulls the mean far above what
a typical person earns, while the median barely moves.

Rule of thumb: for skewed data such as income or
house prices, the median is usually the better
measure of a "typical" value.`,

  taxIncidence: `TAXES, SURPLUS AND DEADWEIGHT LOSS

Consumer surplus: the difference between what buyers
are willing to pay and what they actually pay.

Producer surplus: the difference between the price
sellers receive and their minimum acceptable price.

A per-unit tax drives a wedge between the price buyers
pay and the price sellers keep. Three things happen:

• Quantity traded falls.
• Part of the old surplus becomes tax revenue.
• Part of it disappears entirely: the deadweight loss.

Who bears the tax (its incidence) does not depend on
who legally pays it. The less elastic side of the
market bears the larger share.

Try it: raise the per-unit tax in the ÉcoLab simulator
and watch the red deadweight-loss triangle grow.`,

  mode: `MODE

The mode is the value that appears most often in a
dataset.

Example: 2, 4, 4, 5, 7, 7, 7, 9
Mode = 7 (it appears three times)

A dataset can have:
• No mode (every value appears once)
• One mode (unimodal)
• Several modes (bimodal, multimodal)

The mode is the only measure of central tendency that
also works for categorical data, such as the most
popular car brand in a survey.`,

  dispersion: `VARIANCE AND STANDARD DEVIATION

These measure how spread out the data are around
the mean.

Population variance:
σ² = Σ (x − mean)² / N

Sample variance:
s² = Σ (x − mean)² / (n − 1)

Standard deviation is the square root of the variance,
so it is expressed in the same units as the data.

Example: 2, 4, 6
Mean = 4
Squared deviations: 4, 0, 4 → sum = 8
Population variance = 8 / 3 ≈ 2.67
Sample variance = 8 / 2 = 4
Sample standard deviation = 2

Use n − 1 when your data are a sample drawn from
a larger population.`,

  supplychain: `SUPPLY CHAINS AND INDUSTRIAL ORGANIZATION

A supply chain is the network of firms that moves a
product from raw materials to the final customer:
suppliers, manufacturers, logistics providers,
wholesalers and retailers.

Industrial organization studies how these industries
are structured: how many firms there are, how they
compete, how vertically integrated they are, and how
market power affects prices and output.

Why it matters:
• A shock in one link (a factory closure, a port
  blockage) can ripple through the whole chain.
• Firms choose between producing in-house (vertical
  integration) and buying from suppliers (outsourcing).
• Concentration at one stage can affect prices at
  every later stage.`,

  productivity: `SECTORAL PRODUCTIVITY

Productivity measures how much output is produced
per unit of input.

Labour productivity =
Output (value added) / Hours worked (or employees)

Example:
A sector produces 2,000,000 of value added
with 400 workers.
Labour productivity = 2,000,000 / 400 = 5,000 per worker.

Productivity differs widely across sectors because of
differences in capital, technology, skills and scale.

Shifting workers from low-productivity sectors to
high-productivity sectors (structural change) is an
important source of economic growth.`,

  regional: `REGIONAL ECONOMIC DEVELOPMENT

Regional development studies why some regions within
a country grow faster than others, and how to reduce
gaps between them.

Key drivers:
• Infrastructure (transport, energy, digital)
• Human capital and education
• Industrial clusters and specialization
• Access to markets and finance
• Quality of local institutions

Common indicators:
• Regional GDP per capita
• Regional unemployment rate
• Sector mix and productivity

Agglomeration effects mean economic activity tends to
concentrate, so regional policy often tries to spread
opportunities more evenly.`
};

/* -----------------------------------------------------
   ÉcoBot question matching
----------------------------------------------------- */

function getSelectedDomain() {
  return chatDomain?.value || "general";
}

function getPageContext() {
  const hash = window.location.hash.toLowerCase();

  if (hash.includes("micro")) return "micro";
  if (hash.includes("meso")) return "meso";
  if (hash.includes("macro")) return "macro";
  if (hash.includes("calculator")) return "statistics";

  return "general";
}

const TOPIC_PATTERNS = [
  { key: "microVsMacro", keys: ["micro vs macro", "microeconomics and macroeconomics", "macroeconomics and microeconomics", "micro and macro"] },
  { key: "meanVsMedian", keys: ["mean and median", "median and mean", "mean vs median", "mean or median"] },
  { key: "opportunity", keys: ["opportunity cost", "trade-off", "trade off"] },
  { key: "scarcity", keys: ["scarcity", "scarce", "economic choice"] },
  { key: "elasticity", keys: ["elasticity", "elastic", "inelastic", "ped", "price responsive"] },
  { key: "supply", keys: ["supply and demand", "demand and supply", "supply", "demand", "equilibrium", "market price"] },
  { key: "taxIncidence", keys: ["deadweight loss", "deadweight", "tax incidence", "tax wedge", "per-unit tax", "consumer surplus", "producer surplus", "surplus"] },
  { key: "gdp", keys: ["gross domestic product", "gdp", "national income"] },
  { key: "inflation", keys: ["inflation", "consumer price index", "cpi", "price level", "deflation"] },
  { key: "unemployment", keys: ["unemployment", "unemployed", "labour force", "labor force", "jobless"] },
  { key: "micro", keys: ["microeconomics", "micro economics", "micro"], overview: true },
  { key: "meso", keys: ["mesoeconomics", "meso economics", "meso"], overview: true },
  { key: "macro", keys: ["macroeconomics", "macro economics", "macro"], overview: true },
  { key: "mean", keys: ["arithmetic mean", "average", "mean"] },
  { key: "median", keys: ["median"] },
  { key: "mode", keys: ["mode", "most frequent"] },
  { key: "dispersion", keys: ["standard deviation", "variance", "dispersion", "spread"] },
  { key: "statistics", keys: ["quartile", "percentile", "decile", "quintile", "descriptive statistics", "statistics"] },
  { key: "hhi", keys: ["herfindahl", "hhi", "market concentration", "concentration"] },
  { key: "monopoly", keys: ["monopoly", "oligopoly", "perfect competition", "monopolistic competition", "market structure", "market structures"] },
  { key: "production", keys: ["production cost", "production costs", "marginal cost", "fixed cost", "variable cost", "average cost", "total cost"] },
  { key: "clusters", keys: ["industrial cluster", "cluster"] },
  { key: "valuechain", keys: ["value chain", "value added"] },
  { key: "supplychain", keys: ["supply chain", "industrial organization", "industrial organisation", "logistics"] },
  { key: "productivity", keys: ["productivity", "sectoral productivity", "sector productivity", "labour productivity", "labor productivity", "output per worker"] },
  { key: "regional", keys: ["regional development", "regional economic development", "regional economy", "regional", "territorial"] },
  { key: "monetary", keys: ["monetary policy", "central bank", "interest rate", "money supply"] },
  { key: "fiscal", keys: ["fiscal policy", "government spending", "taxation", "budget deficit", "public debt"] },
  { key: "growth", keys: ["economic growth", "real gdp growth", "growth rate", "growth"] },
  { key: "trade", keys: ["international trade", "exports", "imports", "net exports", "trade balance", "comparative advantage"] },
  { key: "utility", keys: ["utility", "consumer preferences", "preferences", "consumer choice", "budget constraint"] },
  { key: "marginal", keys: ["marginal analysis", "marginal benefit", "marginal"] },
  { key: "freeRider", keys: ["free rider", "free-rider", "public good", "public goods"] }
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-compile word-boundary regexes (allowing simple plurals) so that,
// for example, "ped" does not match "speed" and "mean" does not match "meaning".
const TOPIC_MATCHERS = TOPIC_PATTERNS.map(pattern => ({
  ...pattern,
  regexes: pattern.keys.map(keyword => ({
    keyword,
    regex: new RegExp(`\\b${escapeRegExp(keyword)}(?:s|es)?\\b`, "i")
  }))
}));

const DOMAIN_TOPICS = {
  micro: ["opportunity", "scarcity", "elasticity", "supply", "taxIncidence", "utility", "production", "monopoly", "marginal", "micro"],
  meso: ["clusters", "valuechain", "supplychain", "productivity", "regional", "hhi", "meso"],
  macro: ["gdp", "inflation", "unemployment", "growth", "monetary", "fiscal", "trade", "macro"],
  statistics: ["mean", "median", "mode", "dispersion", "statistics", "meanVsMedian"]
};

function matchTopic(question, domain = "general") {
  let best = null;
  let bestScore = 0;

  TOPIC_MATCHERS.forEach(pattern => {
    // Score by the longest matching keyword: longer phrases are more specific.
    let score = 0;
    pattern.regexes.forEach(({ keyword, regex }) => {
      if (regex.test(question)) score = Math.max(score, keyword.length);
    });

    if (score === 0) return;

    // Broad overviews lose to any specific concept mentioned alongside them.
    if (pattern.overview) score *= 0.4;

    // Small nudge towards the learning domain the user selected.
    if (DOMAIN_TOPICS[domain]?.includes(pattern.key)) score += 1.5;

    if (score > bestScore) {
      bestScore = score;
      best = pattern.key;
    }
  });

  return best;
}

function answerEcoBot(question) {
  const q = question.toLowerCase();
  const domain = getSelectedDomain();

  // Basic numerical GDP question:
  // Example: Calculate GDP C=500 I=150 G=200 X=120 M=90

  const gdpMatch = q.match(
    /(?:calculate|compute|find)\s+gdp[\s\S]*?c\s*=?\s*(-?\d+(?:\.\d+)?)[\s\S]*?i\s*=?\s*(-?\d+(?:\.\d+)?)[\s\S]*?g\s*=?\s*(-?\d+(?:\.\d+)?)[\s\S]*?x\s*=?\s*(-?\d+(?:\.\d+)?)[\s\S]*?m\s*=?\s*(-?\d+(?:\.\d+)?)/
  );

  if (gdpMatch) {
    const [, C, I, G, X, M] = gdpMatch.map(Number);
    const result = C + I + G + X - M;

    return (
      `LET'S SOLVE THIS STEP BY STEP\n\n` +
      `1. GDP = C + I + G + (X − M)\n\n` +
      `2. Substitute the values:\n` +
      `GDP = ${C} + ${I} + ${G} + (${X} − ${M})\n\n` +
      `3. Calculate net exports:\n` +
      `X − M = ${X - M}\n\n` +
      `4. Final result:\n` +
      `GDP = ${formatNumber(result)} monetary units.\n\n` +
      `That's your answer!`
    );
  }

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon)\b/.test(q)) {
    return "Hello! Welcome to ÉcoLab. What would you like to explore today? We can work on microeconomics, mesoeconomics, macroeconomics or statistics.";
  }

  // Identity
  if (q.includes("who are you") || q.includes("what can you do")) {
    return "I'm ÉcoBot, the economics learning assistant of ÉcoLab. I can introduce foundational concepts, explain formulas, walk through selected calculations and help you connect economic ideas to real-world situations. Choose a learning domain above to focus our conversation.";
  }

  // Concept matching: score each topic by how specifically it matches,
  // so "value chains in mesoeconomics" picks value chains, not the overview.
  const topic = matchTopic(q, domain);
  if (topic) return ecoKnowledge[topic];

  // Domain-specific fallback
  if (domain === "micro") {
    return (
      "You're exploring MICROECONOMICS.\n\n" +
      "I can currently help explain:\n" +
      "• Scarcity and opportunity cost\n" +
      "• Supply and demand\n" +
      "• Elasticity\n" +
      "• Utility and consumer choice\n" +
      "• Production and costs\n" +
      "• Market structures\n" +
      "• Marginal analysis\n\n" +
      "Try asking about one of these concepts."
    );
  }

  if (domain === "meso") {
    return (
      "You're exploring MESOECONOMICS.\n\n" +
      "I can currently help explain:\n" +
      "• Industrial clusters\n" +
      "• Value chains\n" +
      "• Sector productivity\n" +
      "• Market concentration\n" +
      "• Regional development\n" +
      "• Supply chains\n\n" +
      "Try asking about one of these concepts."
    );
  }

  if (domain === "macro") {
    return (
      "You're exploring MACROECONOMICS.\n\n" +
      "I can currently help explain:\n" +
      "• GDP and national income\n" +
      "• Inflation\n" +
      "• Unemployment\n" +
      "• Economic growth\n" +
      "• Monetary policy\n" +
      "• Fiscal policy\n" +
      "• International trade\n\n" +
      "Try asking about one of these concepts."
    );
  }

  if (domain === "statistics") {
    return (
      "You're exploring STATISTICS.\n\n" +
      "I can currently help explain:\n" +
      "• Mean, median and mode\n" +
      "• Quartiles and percentiles\n" +
      "• Range and interquartile range\n" +
      "• Descriptive statistics\n\n" +
      "You can also use the statistics calculator on ÉcoLab."
    );
  }

  return (
    "That's an interesting question!\n\n" +
    "I currently work with a predefined educational knowledge base, " +
    "so I may not recognize every question yet.\n\n" +
    "Try asking me about opportunity cost, supply and demand, " +
    "elasticity, GDP, inflation, unemployment, industrial clusters, " +
    "market concentration or descriptive statistics.\n\n" +
    "You can also select a learning domain above to explore its topics."
  );
}

/* -----------------------------------------------------
   ÉcoBot message rendering
----------------------------------------------------- */

function addChatMessage(content, sender) {
  if (!chatMessages) return null;

  const bubble = document.createElement("div");

  bubble.className = sender === "user"
    ? "user-message"
    : "bot-message";

  if (sender === "bot") {
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "ÉCOBOT · TUTOR";
    bubble.appendChild(label);
  }

  const paragraph = document.createElement("p");

  // textContent prevents user messages from being treated as HTML.
  paragraph.textContent = escapeText(content);

  bubble.appendChild(paragraph);
  chatMessages.appendChild(bubble);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  return bubble;
}

function sendEcoBotMessage(question) {
  const cleanQuestion = question.trim();

  if (!cleanQuestion || !chatMessages) return;

  addChatMessage(cleanQuestion, "user");

  const typing = document.createElement("div");
  typing.className = "ecobot-typing";
  typing.textContent = "ÉcoBot is thinking...";

  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  window.setTimeout(() => {
    const response = answerEcoBot(cleanQuestion);

    typing.remove();
    addChatMessage(response, "bot");
  }, 350);
}

/* -----------------------------------------------------
   ÉcoBot form
----------------------------------------------------- */

if (chatForm && chatInput) {
  chatForm.addEventListener("submit", event => {
    event.preventDefault();

    const question = chatInput.value.trim();

    if (!question) return;

    sendEcoBotMessage(question);
    chatInput.value = "";
    chatInput.focus();
  });
}

/* -----------------------------------------------------
   Suggested questions and topic buttons
----------------------------------------------------- */

function connectQuestionButtons() {
  const questionButtons = [
    ...$$(".suggestion-chip"),
    ...$$(".topic-item")
  ];

  questionButtons.forEach(button => {
    button.addEventListener("click", () => {
      const question = button.dataset.question;

      if (!question) return;

      openEcoBot();
      sendEcoBotMessage(question);
    });
  });
}

connectQuestionButtons();

/* =====================================================
   9. INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  updateMarket();
});

console.log("ÉcoLab initialized successfully.");
console.log("ÉcoBot educational tutor is ready.");
