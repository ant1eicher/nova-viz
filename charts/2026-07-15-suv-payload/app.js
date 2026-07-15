// SUV Payload Dashboard - deterministic D3 rendering. Data from data.json.
const ORIGIN_COLORS = { China: "#ff6b81", Europe: "#4ecdc4", Korea: "#845ec2", Japan: "#f9a03f", USA: "#6c9bd1" };
const MINE = "Jaecoo J7 SHS";
const activeOrigins = new Set(Object.keys(ORIGIN_COLORS));
let DATA = [];

const tip = () => d3.select("#tooltip");
function showTip(event, d) {
  tip().classed("visible", true)
    .html(`<strong>${d.name}${d.name === MINE ? " ★ (Anton's)" : ""}</strong><br/>
      ${d.variant} · ${d.powertrain}<br/>
      Kerb: ${d.kerb_kg} kg · GVM: ${d.gvm_kg} kg<br/>
      <strong>Payload: ${d.payload_kg} kg</strong><br/>
      ${d.note ? d.note + "<br/>" : ""}<em>${d.source}</em>${d.confidence !== "high" ? "<br/>⚠ confidence: " + d.confidence : ""}`)
    .style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 10) + "px");
}
function hideTip() { tip().classed("visible", false); }

function threshold() {
  return (+document.getElementById("adults").value) * (+document.getElementById("perAdult").value)
       + (+document.getElementById("baggage").value);
}

function visibleData() {
  return DATA.filter(d => activeOrigins.has(d.origin))
    .slice().sort((a, b) => b.payload_kg - a.payload_kg || a.name.localeCompare(b.name));
}

function renderLegend() {
  const items = d3.select("#legend").selectAll(".item")
    .data(Object.keys(ORIGIN_COLORS).sort(), d => d)
    .join("div").attr("class", "item")
    .classed("off", d => !activeOrigins.has(d))
    .on("click", (event, d) => {
      activeOrigins.has(d) ? activeOrigins.delete(d) : activeOrigins.add(d);
      renderAll();
    });
  items.selectAll("*").remove();
  items.append("span").attr("class", "swatch").style("background", d => ORIGIN_COLORS[d]);
  items.append("span").text(d => d);
}

function renderBars() {
  const data = visibleData(), t = threshold();
  const width = 900, rowH = 30, margin = { top: 8, right: 90, bottom: 34, left: 190 };
  const height = margin.top + margin.bottom + data.length * rowH;
  d3.select("#bars").selectAll("*").remove();
  const svg = d3.select("#bars").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
  const x = d3.scaleLinear().domain([0, Math.max(800, d3.max(data, d => d.payload_kg) || 800, t + 50)])
    .range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(data.map(d => d.name)).range([margin.top, height - margin.bottom]).padding(0.22);

  svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(-(height - margin.top - margin.bottom)).tickFormat(""));
  svg.selectAll(".bar").data(data, d => d.name).join("rect").attr("class", "bar")
    .attr("x", x(0)).attr("y", d => y(d.name))
    .attr("width", d => x(d.payload_kg) - x(0)).attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", d => d.payload_kg < t ? "#5a2731" : ORIGIN_COLORS[d.origin])
    .attr("stroke", d => d.name === MINE ? "#ffd166" : (d.payload_kg < t ? ORIGIN_COLORS[d.origin] : "none"))
    .attr("stroke-width", d => d.name === MINE ? 2.5 : 1)
    .on("mouseover", showTip).on("mouseout", hideTip);
  svg.selectAll(".carname").data(data, d => d.name).join("text")
    .attr("class", d => "carname" + (d.name === MINE ? " mine" : ""))
    .attr("x", margin.left - 8).attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .text(d => (d.name === MINE ? "★ " : "") + d.name);
  svg.selectAll(".barlabel").data(data, d => d.name).join("text").attr("class", "barlabel")
    .attr("x", d => x(d.payload_kg) + 6).attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
    .text(d => `${d.payload_kg} kg${d.payload_kg < t ? " ✗" : ""}`);
  svg.append("line").attr("class", "threshold-line")
    .attr("x1", x(t)).attr("x2", x(t)).attr("y1", margin.top).attr("y2", height - margin.bottom);
  svg.append("text").attr("class", "threshold-text")
    .attr("x", x(t) + 5).attr("y", margin.top + 12).text(`need ${t} kg`);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append("text").attr("x", (margin.left + width - margin.right) / 2).attr("y", height - 4)
    .attr("text-anchor", "middle").attr("fill", "#9aa0a6").attr("font-size", 12).text("Effective payload (kg)");
}

function renderScatter() {
  const data = visibleData(), t = threshold();
  const width = 900, height = 460, margin = { top: 16, right: 24, bottom: 46, left: 56 };
  d3.select("#scatter").selectAll("*").remove();
  const svg = d3.select("#scatter").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
  const x = d3.scaleLinear().domain(d3.extent(DATA, d => d.gvm_kg)).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([250, Math.max(800, (d3.max(DATA, d => d.payload_kg) || 800) + 30)]).nice()
    .range([height - margin.bottom, margin.top]);
  svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
  svg.append("line").attr("class", "threshold-line")
    .attr("x1", margin.left).attr("x2", width - margin.right).attr("y1", y(t)).attr("y2", y(t));
  svg.append("text").attr("class", "threshold-text")
    .attr("x", width - margin.right - 4).attr("y", y(t) - 6).attr("text-anchor", "end").text(`need ${t} kg`);
  svg.selectAll(".dot").data(data, d => d.name).join("circle").attr("class", "dot")
    .attr("cx", d => x(d.gvm_kg)).attr("cy", d => y(d.payload_kg))
    .attr("r", d => d.name === MINE ? 9 : 6.5)
    .attr("fill", d => ORIGIN_COLORS[d.origin])
    .attr("stroke", d => d.name === MINE ? "#ffd166" : "#0f1117")
    .attr("stroke-width", d => d.name === MINE ? 3 : 1)
    .attr("opacity", d => d.payload_kg < t ? 0.55 : 0.95)
    .on("mouseover", showTip).on("mouseout", hideTip);
  svg.selectAll(".dotlabel").data(data, d => d.name).join("text").attr("class", "barlabel")
    .attr("x", d => x(d.gvm_kg) + 10).attr("y", d => y(d.payload_kg) + 4)
    .attr("font-size", 10).attr("fill", "#9aa0a6")
    .text(d => d.name === MINE ? "★ J7 SHS" : d.name.split(" ").slice(0, 2).join(" "));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(8));
  svg.append("text").attr("x", width / 2).attr("y", height - 8).attr("text-anchor", "middle")
    .attr("fill", "#9aa0a6").attr("font-size", 12).text("GVM (kg)");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", 16)
    .attr("text-anchor", "middle").attr("fill", "#9aa0a6").attr("font-size", 12).text("Effective payload (kg)");
}

function renderVerdict() {
  const t = threshold(), data = visibleData();
  const fail = data.filter(d => d.payload_kg < t).map(d => `${d.name} (${d.payload_kg} kg)`);
  const mine = DATA.find(d => d.name === MINE);
  const mineTxt = mine ? `Your J7 SHS carries <strong>${mine.payload_kg} kg</strong> — ${mine.payload_kg < t
    ? `<strong>${t - mine.payload_kg} kg short</strong> of this scenario ✗` : `clears this scenario ✓`}. ` : "";
  document.getElementById("verdict").innerHTML =
    `Scenario needs <strong>${t} kg</strong>. ${mineTxt}` +
    (fail.length ? `Below the line: ${fail.join(", ")}.` : "Everything shown clears the bar.");
}

function renderAll() { renderLegend(); renderBars(); renderScatter(); renderVerdict(); }

for (const [id, out] of [["adults", "adultsOut"], ["perAdult", "perAdultOut"], ["baggage", "baggageOut"]]) {
  document.getElementById(id).addEventListener("input", () => {
    document.getElementById(out).textContent = document.getElementById(id).value;
    renderAll();
  });
}

d3.json("data.json").then(rows => {
  DATA = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  renderAll();
});
