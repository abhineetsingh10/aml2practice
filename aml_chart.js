function renderChart() {

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart");

  const fullWidth = window.innerWidth * 0.85;
  const fullHeight = window.innerHeight * 0.75;

  svg
    .attr("width", fullWidth)
    .attr("height", fullHeight);

  const margin = {
    top: 80,
    right: 120,
    bottom: 170,
    left: 110
  };

  const width = fullWidth;
  const height = fullHeight;

  const chartGroup = svg.append("g");

  const xScale = d3.scaleTime()
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .range([height - margin.bottom, margin.top]);

  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`);

  const yAxis = svg.append("g")
    .attr("transform", `translate(${margin.left},0)`);

  // ===== AXIS LABELS =====

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 95)
    .attr("text-anchor", "middle")
    .attr("font-size", 18)
    .attr("font-weight", 600)
    .text("Calendar Week (June 2025 – January 2026)");

  // ===== LEGEND (NOW BELOW CALENDAR LABEL) =====
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${height - 55})`);

  legend.append("line")
    .attr("x1", 0)
    .attr("x2", 50)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 4);

  legend.append("text")
    .attr("x", 60)
    .attr("y", 5)
    .attr("font-weight", 600)
    .text("Actual Practice (AML)");

  legend.append("line")
    .attr("x1", 320)
    .attr("x2", 370)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", "seagreen")
    .attr("stroke-width", 4);

  legend.append("text")
    .attr("x", 380)
    .attr("y", 5)
    .attr("font-weight", 600)
    .text("Traditional Class (50 Qs per Week)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("font-size", 18)
    .attr("font-weight", 600)
    .text("Cumulative Questions Solved");

  d3.csv("top35_weekly_aml.csv").then(data => {

    data.forEach(d => {
      d.Week = new Date(d.Week);
      d.Cumulative_Actual = +d.Cumulative_Actual;
      d.Classroom_Benchmark = +d.Classroom_Benchmark;
      d.Weekly_Questions = +d.Weekly_Questions;
    });

    const students = [...new Set(data.map(d => d.User_Name))];
    const select = d3.select("#studentSelect");

    select.selectAll("option")
      .data(students)
      .enter()
      .append("option")
      .text(d => d)
      .attr("value", d => d);

    function update(student) {

      chartGroup.selectAll("*").remove();
      svg.selectAll(".metric-box-svg").remove();

      const studentData = data
        .filter(d => d.User_Name === student)
        .sort((a, b) => d3.ascending(a.Week, b.Week));

      const first = studentData.find(d => d.Weekly_Questions > 0);

      const last = [...studentData]
        .reverse()
        .find(d => d.Weekly_Questions > 0);

      const additional = last.Cumulative_Actual - last.Classroom_Benchmark;
      const percentAdditional = ((additional / last.Classroom_Benchmark) * 100).toFixed(1);

      // ===== METRIC BOX =====
      const metricBox = svg.append("g")
        .attr("class", "metric-box-svg")
        .attr("transform", `translate(${margin.left}, ${margin.top - 50})`);

      metricBox.append("rect")
        .attr("width", 330)
        .attr("height", 60)
        .attr("rx", 12)
        .attr("fill", "#f4f4f4");

      metricBox.append("text")
        .attr("x", 15)
        .attr("y", 25)
        .attr("font-size", 20)
        .attr("font-weight", 700)
        .text(`${percentAdditional}% more questions solved`);

      metricBox.append("text")
        .attr("x", 15)
        .attr("y", 45)
        .attr("font-size", 14)
        .text(`(+${d3.format(",")(additional)} extra vs Traditional)`);

      xScale.domain(d3.extent(studentData, d => d.Week));

      yScale.domain([
        0,
        d3.max(studentData, d =>
          Math.max(d.Cumulative_Actual, d.Classroom_Benchmark)
        )
      ]);

      xAxis.call(
        d3.axisBottom(xScale)
          .ticks(d3.timeWeek.every(2))
          .tickFormat(d3.timeFormat("%b %d"))
      )
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

      yAxis.call(d3.axisLeft(yScale));

      const lineActual = d3.line()
        .x(d => xScale(d.Week))
        .y(d => yScale(d.Cumulative_Actual));

      const lineClassroom = d3.line()
        .x(d => xScale(d.Week))
        .y(d => yScale(d.Classroom_Benchmark));

      const classPath = chartGroup.append("path")
        .datum(studentData)
        .attr("fill", "none")
        .attr("stroke", "seagreen")
        .attr("stroke-width", 4)
        .attr("d", lineClassroom);

      const actualPath = chartGroup.append("path")
        .datum(studentData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 4)
        .attr("d", lineActual);

      // ===== ANIMATION =====
      const classLength = classPath.node().getTotalLength();
      const actualLength = actualPath.node().getTotalLength();

      classPath
        .attr("stroke-dasharray", classLength)
        .attr("stroke-dashoffset", classLength)
        .transition()
        .duration(2500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      actualPath
        .attr("stroke-dasharray", actualLength)
        .attr("stroke-dashoffset", actualLength)
        .transition()
        .duration(2500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {

          const formatNumber = d3.format(",");

          // FIRST SESSION
          chartGroup.append("circle")
            .attr("cx", xScale(first.Week))
            .attr("cy", yScale(first.Cumulative_Actual))
            .attr("r", 8)
            .attr("fill", "steelblue");

          // LAST SESSION (CORRECT)
          chartGroup.append("circle")
            .attr("cx", xScale(last.Week))
            .attr("cy", yScale(last.Cumulative_Actual))
            .attr("r", 9)
            .attr("fill", "steelblue");

          chartGroup.append("circle")
            .attr("cx", xScale(last.Week))
            .attr("cy", yScale(last.Classroom_Benchmark))
            .attr("r", 9)
            .attr("fill", "seagreen");

          chartGroup.append("text")
            .attr("x", xScale(last.Week) + 15)
            .attr("y", yScale(last.Cumulative_Actual) - 10)
            .attr("font-weight", 700)
            .attr("fill", "steelblue")
            .text(`AML: ${formatNumber(last.Cumulative_Actual)}`);

          chartGroup.append("text")
            .attr("x", xScale(last.Week) + 15)
            .attr("y", yScale(last.Classroom_Benchmark) + 18)
            .attr("font-weight", 600)
            .attr("fill", "seagreen")
            .text(`Traditional: ${formatNumber(last.Classroom_Benchmark)}`);
        });

    }

    update(students[0]);

    select.on("change", function () {
      update(this.value);
    });

  });
}

renderChart();
window.addEventListener("resize", renderChart);
