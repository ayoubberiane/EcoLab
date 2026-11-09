
const $ = id => document.getElementById(id);

const format = (value, decimals = 2) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        maximumFractionDigits: decimals
      })
    : "—";

// ==========================================
// 1. SUPPLY AND DEMAND SIMULATOR
// ==========================================

const canvas = $("marketChart");
const ctx = canvas.getContext("2d");

function marketModel() {
  const demand = Number($("demand").value);
  const supply = Number($("supply").value);
  const tax = Number($("tax").value);

  $("demandValue").textContent = demand;
  $("supplyValue").textContent = supply;
  $("taxValue").textContent = tax;

  // Inverse demand: P = D - 0.5Q
  // Inverse supply: P = 0.5Q - S/2
  // A per-unit tax creates a wedge between buyer and seller prices.

  const quantity = Math.max(
    0,
    (demand + supply / 2 - tax) / 1
  );

  const equilibriumQuantity = Math.min(100, quantity);

  const buyerPrice = Math.max(
    0,
    demand - 0.5 * equilibriumQuantity
  );

  const sellerPrice = Math.max(
    0,
    0.5 * equilibriumQuantity - supply / 2
  );

  const wedge = buyerPrice - sellerPrice;

  $("eqPrice").textContent = format(buyerPrice);
  $("eqQty").textContent = format(equilibriumQuantity, 1);
  $("taxWedge").textContent = format(wedge);

  if (tax > 0) {
    $("marketInsight").textContent =
      "The tax creates a difference between the price paid by buyers and the price received by sellers. The tax burden is shared according to the model's supply and demand conditions.";
  } else if (demand > 85) {
    $("marketInsight").textContent =
      "Higher demand shifts the demand curve outward. This increases the equilibrium price and quantity in this simplified model.";
  } else if (supply > 60) {
    $("marketInsight").textContent =
      "An increase in supply shifts the supply curve outward. This puts downward pressure on price and increases market quantity.";
  } else {
    $("marketInsight").textContent =
      "The intersection of supply and demand represents market equilibrium, where the quantity supplied equals the quantity demanded.";
  }

  drawMarket(demand, supply, equilibriumQuantity, buyerPrice);
}

function drawMarket(demand, supply, quantity, price) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = rect.width;
  const height = rect.height;

  const left = 43;
  const right = 18;
  const top = 20;
  const bottom = 35;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  ctx.clearRect(0, 0, width, height);

  const X = q => left + q / 100 * chartWidth;
  const Y = p => top + chartHeight - p / 100 * chartHeight;

  // Grid
  ctx.strokeStyle = "#405147";
  ctx.lineWidth = 1;
  ctx.font = '9px "DM Mono"';
  ctx.fillStyle = "#a1b0a4";

  for (let i = 0; i <= 4; i++) {
    const y = top + chartHeight * i / 4;

    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();

    ctx.fillText(String(100 - i * 25), 8, y + 3);
  }

  for (let i = 0; i <= 4; i++) {
    const x = left + chartWidth * i / 4;
    ctx.fillText(String(i * 25), x - 5, height - 10);
  }

  ctx.fillText("PRICE", left, 11);
  ctx.fillText("QUANTITY", width - 85, height - 10);

  // Demand curve
  ctx.beginPath();
  ctx.strokeStyle = "#b9f36b";
  ctx.lineWidth = 2.5;
  ctx.moveTo(X(0), Y(Math.min(100, demand)));
  ctx.lineTo(X(100), Y(Math.max(0, demand - 50)));
  ctx.stroke();

  // Supply curve
  ctx.beginPath();
  ctx.strokeStyle = "#7bc6c1";
  ctx.lineWidth = 2.5;
  ctx.moveTo(X(0), Y(Math.max(0, supply / 2)));
  ctx.lineTo(X(100), Y(Math.min(100, 50 + supply / 2)));
  ctx.stroke();

  // Equilibrium marker
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#d9e5da";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(X(quantity), Y(price));
  ctx.lineTo(X(quantity), Y(0));
  ctx.moveTo(X(quantity), Y(price));
  ctx.lineTo(X(0), Y(price));
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(X(quantity), Y(price), 5, 0, Math.PI * 2);
  ctx.fillStyle = "#b9f36b";
  ctx.fill();

  ctx.font = '10px "DM Mono"';
  ctx.fillStyle = "#b9f36b";
  ctx.fillText("DEMAND", X(72), Y(Math.max(0, demand - 36)) - 9);

  ctx.fillStyle = "#7bc6c1";
  ctx.fillText("SUPPLY", X(72), Y(Math.min(100, 36 + supply / 2)) - 9);
}

["demand", "supply", "tax"].forEach(id => {
  $(id).addEventListener("input", marketModel);
});

$("resetMarket").addEventListener("click", () => {
  $("demand").value = 70;
  $("supply").value = 30;
  $("tax").value = 0;
  marketModel();
});

window.addEventListener("resize", marketModel);

// ==========================================
// 2. PRICE ELASTICITY OF DEMAND
// ==========================================

$("elasticityBtn").addEventListener("click", () => {
  const p1 = Number($("p1").value);
  const p2 = Number($("p2").value);
  const q1 = Number($("q1").value);
  const q2 = Number($("q2").value);

  if (
    ![p1, p2, q1, q2].every(Number.isFinite) ||
    p1 <= 0 || p2 <= 0 ||
    q1 < 0 || q2 < 0 ||
    p1 === p2 || q1 + q2 === 0
  ) {
    $("elasticityResult").textContent = "Invalid";
    $("elasticityExplain").textContent =
      "Enter positive prices, non-negative quantities and different prices.";
    return;
  }

  const percentageQuantity =
    (q2 - q1) / ((q2 + q1) / 2);

  const percentagePrice =
    (p2 - p1) / ((p2 + p1) / 2);

  const elasticity =
    percentageQuantity / percentagePrice;

  const absolute = Math.abs(elasticity);

  let interpretation;

  if (absolute > 1) {
    interpretation = "Elastic demand";
  } else if (absolute < 1) {
    interpretation = "Inelastic demand";
  } else {
    interpretation = "Unit elastic demand";
  }

  $("elasticityResult").textContent =
    format(elasticity, 3);

  $("elasticityExplain").textContent =
    `${interpretation}. The absolute elasticity is ${format(absolute, 3)}. This means quantity demanded is ${absolute > 1 ? "relatively responsive" : absolute < 1 ? "relatively less responsive" : "proportionally responsive"} to price changes.`;
});

// ==========================================
// 3. GDP CALCULATOR
// ==========================================

$("gdpBtn").addEventListener("click", () => {
  const C = Number($("gC").value);
  const I = Number($("gI").value);
  const G = Number($("gG").value);
  const X = Number($("gX").value);
  const M = Number($("gM").value);

  if (![C, I, G, X, M].every(Number.isFinite)) {
    $("gdpResult").textContent = "Invalid";
    $("gdpExplain").textContent =
      "Please complete all fields.";
    return;
  }

  const netExports = X - M;
  const GDP = C + I + G + netExports;

  $("gdpResult").textContent = format(GDP);

  $("gdpExplain").textContent =
    `Net exports = ${format(X)} − ${format(M)} = ${format(netExports)}. GDP = ${format(C)} + ${format(I)} + ${format(G)} + ${format(netExports)} = ${format(GDP)}.`;
});

// ==========================================
// 4. HERFINDAHL-HIRSCHMAN INDEX
// ==========================================

$("hhiBtn").addEventListener("click", () => {
  const shares = $("shares").value
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(Number);

  const valid =
    shares.length > 0 &&
    shares.every(v => Number.isFinite(v) && v >= 0 && v <= 100) &&
    Math.abs(shares.reduce((a, b) => a + b, 0) - 100) < 0.01;

  if (!valid) {
    $("hhiResult").textContent = "Invalid";
    $("hhiExplain").textContent =
      "Market shares must be non-negative and add up to 100%.";
    return;
  }

  const HHI = shares.reduce(
    (total, share) => total + share ** 2,
    0
  );

  $("hhiResult").textContent = format(HHI, 0);

  let interpretation;

  if (HHI < 1500) {
    interpretation = "Unconcentrated";
  } else if (HHI < 2500) {
    interpretation = "Moderately concentrated";
  } else {
    interpretation = "Highly concentrated";
  }

  $("hhiExplain").textContent =
    `${interpretation} market under commonly used US screening thresholds. The HHI is ${format(HHI, 0)}. These thresholds are not universal legal standards.`;
});

// ==========================================
// 5. DESCRIPTIVE STATISTICS
// ==========================================

$("statsBtn").addEventListener("click", () => {
  const values = $("dataset").value
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(Number);

  if (
    values.length === 0 ||
    values.some(value => !Number.isFinite(value))
  ) {
    $("statsExplain").textContent =
      "Enter a valid comma-separated numerical dataset.";
    return;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const n = sorted.length;

  const mean =
    sorted.reduce((a, b) => a + b, 0) / n;

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const range =
    sorted[n - 1] - sorted[0];

  $("meanResult").textContent = format(mean);
  $("medianResult").textContent = format(median);
  $("rangeResult").textContent = format(range);

  $("statsExplain").textContent =
    `${n} observations. Minimum: ${format(sorted[0])}. Maximum: ${format(sorted[n - 1])}. The mean is the arithmetic average and the median is the central observation.`;
});

// ==========================================
// 6. INITIALIZE ALL CALCULATORS
// ==========================================

marketModel();

$("elasticityBtn").click();
$("gdpBtn").click();
$("hhiBtn").click();
$("statsBtn").click();
