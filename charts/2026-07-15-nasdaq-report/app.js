// NASDAQ market report - D3 rendering. Data from data.json (series + research).
const tip = () => d3.select("#tooltip");
const fmt = d3.format(",.0f");
const pct = v => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
const cls = v => v >= 0 ? "up" : "dn";

function statCards(indices) {
  const c = d3.select("#cards");
  indices.forEach(ix => {
    const d = c.append("div").attr("class", "card");
    d.append("div").attr("class", "nm").text(ix.name);
    d.append("div").attr("class", "lv").text(fmt(ix.level));
    const ch = d.append("div").attr("class", "ch");
    ch.append("span").attr("class", cls(ix.day_pct)).text(pct(ix.day_pct) + " today");
    if (ix.ytd_pct != null)
      ch.append("span").style("color", "#5f6672").text("  ·  " + pct(ix.ytd_pct) + " YTD");
  });
}

function lineChart(series, sel, color, label) {
  const data = series.map(p => ({ d: new Date(p.d), c: p.c }));
  const width = 920, height = 340, margin = { top: 12, right: 18, bottom: 30, left: 60 };
  const svg = d3.select(sel).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", height);
  const x = d3.scaleTime().domain(d3.extent(data, d => d.d)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d.c)).nice().range([height - margin.bottom, margin.top]);
  svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
  const area = d3.area().x(d => x(d.d)).y0(y.range()[0]).y1(d => y(d.c));
  const grad = svg.append("defs").append("linearGradient").attr("id", "g-" + label)
    .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
  grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.35);
  grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);
  svg.append("path").datum(data).attr("fill", `url(#g-${label})`).attr("d", area);
  const line = d3.line().x(d => x(d.d)).y(d => y(d.c));
  svg.append("path").datum(data).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(fmt));
  // hover crosshair
  const focus = svg.append("g").style("display", "none");
  focus.append("circle").attr("r", 4).attr("fill", color);
  const bis = d3.bisector(d => d.d).left;
  svg.append("rect").attr("x", margin.left).attr("y", margin.top)
    .attr("width", width - margin.left - margin.right).attr("height", height - margin.top - margin.bottom)
    .attr("fill", "none").attr("pointer-events", "all")
    .on("mousemove", function (event) {
      const mx = x.invert(d3.pointer(event, this)[0]);
      let i = bis(data, mx); if (i >= data.length) i = data.length - 1;
      const p = data[i];
      focus.style("display", null).attr("transform", `translate(${x(p.d)},${y(p.c)})`);
      tip().classed("visible", true)
        .html(`<strong>${label}</strong><br/>${p.d.toISOString().slice(0, 10)}<br/>${fmt(p.c)}`)
        .style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => { focus.style("display", "none"); tip().classed("visible", false); });
}

function relChart(series) {
  const specs = [
    { key: "NASDAQCOM", name: "Nasdaq Comp", color: "#ff6b81" },
    { key: "NASDAQ100", name: "Nasdaq 100", color: "#ffd166" },
    { key: "SP500", name: "S&P 500", color: "#4ecdc4" },
    { key: "DJIA", name: "Dow", color: "#6c9bd1" }
  ];
  const width = 920, height = 340, margin = { top: 12, right: 90, bottom: 30, left: 44 };
  const svg = d3.select("#relchart").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", height);
  const norm = specs.map(s => {
    const raw = series[s.key]; const base = raw[0].c;
    return { ...s, pts: raw.map(p => ({ d: new Date(p.d), v: p.c / base * 100 })) };
  });
  const alld = norm[0].pts.map(p => p.d);
  const x = d3.scaleTime().domain(d3.extent(alld)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([
    d3.min(norm, s => d3.min(s.pts, p => p.v)) - 2,
    d3.max(norm, s => d3.max(s.pts, p => p.v)) + 2
  ]).nice().range([height - margin.bottom, margin.top]);
  svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
  const line = d3.line().x(d => x(d.d)).y(d => y(d.v));
  norm.forEach(s => {
    svg.append("path").datum(s.pts).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2).attr("d", line);
    const last = s.pts[s.pts.length - 1];
    svg.append("text").attr("x", x(last.d) + 6).attr("y", y(last.v) + 4)
      .attr("fill", s.color).attr("font-size", 11).attr("font-weight", 600).text(s.name);
  });
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6));
}

function megacaps(mc) {
  const width = 920, height = 220, margin = { top: 12, right: 20, bottom: 40, left: 44 };
  const svg = d3.select("#megacaps").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", height);
  const data = mc.slice().sort((a, b) => b.pct - a.pct);
  const x = d3.scaleBand().domain(data.map(d => d.ticker)).range([margin.left, width - margin.right]).padding(0.3);
  const mx = d3.max(data, d => Math.abs(d.pct)) * 1.2;
  const y = d3.scaleLinear().domain([-mx, mx]).range([height - margin.bottom, margin.top]);
  svg.append("line").attr("x1", margin.left).attr("x2", width - margin.right).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#3a3f4b");
  svg.selectAll(".b").data(data).join("rect")
    .attr("x", d => x(d.ticker)).attr("width", x.bandwidth())
    .attr("y", d => y(Math.max(0, d.pct))).attr("height", d => Math.abs(y(d.pct) - y(0)))
    .attr("rx", 3).attr("fill", d => d.pct >= 0 ? "#4ade80" : "#ff6b81");
  svg.selectAll(".l").data(data).join("text")
    .attr("x", d => x(d.ticker) + x.bandwidth() / 2).attr("text-anchor", "middle")
    .attr("y", d => d.pct >= 0 ? y(d.pct) - 5 : y(d.pct) + 14)
    .attr("fill", "#e6e6e6").attr("font-size", 11).text(d => pct(d.pct));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
}

function movers(list) {
  const c = d3.select("#movers");
  list.forEach(m => {
    const d = c.append("div").attr("class", "theme");
    const head = d.append("div").attr("class", "t");
    head.append("span").attr("class", cls(m.pct)).text(pct(m.pct) + "  ");
    head.append("span").text(`${m.ticker} — ${m.company}`);
    d.append("div").attr("class", "s").text(m.reason);
  });
  c.attr("class", "themes");
}

function themes(list) {
  const c = d3.select("#themes");
  list.forEach(t => {
    const d = c.append("div").attr("class", "theme");
    d.append("div").attr("class", "t").text(t.title);
    d.append("div").attr("class", "s").text(t.summary);
    d.append("div").attr("class", "src").text("Source: " + t.source);
  });
}

d3.json("data.json").then(({ series, research }) => {
  document.getElementById("headline").textContent = research.headline;
  document.getElementById("asof").textContent = "As of: " + research.as_of;
  statCards(research.indices);
  lineChart(series.NASDAQCOM, "#bigchart", "#ff6b81", "Nasdaq Composite");
  relChart(series);
  megacaps(research.megacaps);
  movers(research.movers);
  themes(research.themes);
  const ul = d3.select("#catalysts");
  research.catalysts.forEach(c => {
    const li = ul.append("li");
    li.append("b").text(c.when);
    li.append("span").text(c.what);
  });
});
