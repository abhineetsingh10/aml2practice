// -------------------------------------
// RESPONSIVE DIMENSIONS
// -------------------------------------

function renderChart() {

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart");

  const fullWidth = window.innerWidth * 0.95;
  const fullHeight = window.innerHeight * 0.85;

  svg
    .attr("width", fullWidth)
    .attr("height", fullHeight);

  const margin = {
    top: fullHeight * 0.20,
    right: fullWidth * 0.20,
    bottom: fullHeight * 0.18,
    left: fullWidth * 0.10
  };

  const width = fullWidth;
  const height = fullHeight;

  const chartGroup = svg.append("g");

  // -------------------------------------
  // SCALES
  // -------------------------------------

  const xScale = d3.scaleTime()
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .range([height - margin.bottom, margin.top]);

  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`);

  const yAxis = svg.append("g")
    .attr("transform", `translate(${margin.left},0)`);

  // -------------------------------------
  // AXIS LABELS
  // -------------------------------------

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", height * 0.025)
    .attr("font-weight", 600)
    .text("Calendar Week (June 2025 – January 2026)");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", margin.left * 0.45)
    .attr("text-anchor", "middle")
    .attr("font-size", height * 0.028)
    .attr("font-weight", 600)
    .text("Cumulative Questions Solved");

  // -------------------------------------
  // LEGEND (Responsive)
  // -------------------------------------

  const legendWidth = fullWidth * 0.32;
  const legendHeight = 100;

  const legend = svg.append("g")
    .attr("transform", `translate(${width - legendWidth - 100}, ${margin.top * 0})`);

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "#f4f4f4")
    .attr("rx", 12);

  legend.append("line")
    .attr("x1", 20)
    .attr("x2", 70)
    .attr("y1", 35)
    .attr("y2", 35)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 4);

  legend.append("text")
    .attr("x", 85)
    .attr("y", 40)
    .attr("font-size", 16)
    .attr("font-weight", 600)
    .text("Actual Practice (AXL)");

  legend.append("line")
    .attr("x1", 20)
    .attr("x2", 70)
    .attr("y1", 65)
    .attr("y2", 65)
    .attr("stroke", "seagreen")
    .attr("stroke-width", 4);

  legend.append("text")
    .attr("x", 85)
    .attr("y", 70)
    .attr("font-size", 16)
    .attr("font-weight", 600)
    .text("Traditional Class (50 Qs per Week)");

  // -------------------------------------
  // LOAD DATA
  // -------------------------------------

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

      const studentData = data
        .filter(d => d.User_Name === student)
        .sort((a, b) => d3.ascending(a.Week, b.Week));

      const firstActive = studentData.find(d => d.Weekly_Questions > 0);
      const lastActive = [...studentData].reverse()
        .find(d => d.Weekly_Questions > 0);

      const trimmedData = studentData.filter(d =>
        firstActive &&
        lastActive &&
        d.Week >= firstActive.Week &&
        d.Week <= lastActive.Week
      );

      xScale.domain(d3.extent(studentData, d => d.Week));

      yScale.domain([
        0,
        d3.max(studentData, d =>
          Math.max(d.Cumulative_Actual, d.Classroom_Benchmark)
        )
      ]);

      xAxis.call(
        d3.axisBottom(xScale)
          .ticks(d3.timeWeek.every(1))
          .tickFormat(d3.timeFormat("%b %d"))
      )
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "14px");

      yAxis.call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("font-size", "16px");

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
        .datum(trimmedData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 4)
        .attr("d", lineActual);

      // Animation
      const classLength = classPath.node().getTotalLength();
      const actualLength = actualPath.node().getTotalLength();

      classPath
        .attr("stroke-dasharray", classLength)
        .attr("stroke-dashoffset", classLength)
        .transition()
        .duration(3000)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      actualPath
        .attr("stroke-dasharray", actualLength)
        .attr("stroke-dashoffset", actualLength)
        .transition()
        .duration(2000)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {

          const formatDate = d3.timeFormat("%b %d, %Y");
          const formatNumber = d3.format(",");

          if (firstActive) {
            chartGroup.append("circle")
              .attr("cx", xScale(firstActive.Week))
              .attr("cy", yScale(firstActive.Cumulative_Actual))
              .attr("r", 8)
              .attr("fill", "steelblue");
          }

          if (lastActive) {

            chartGroup.append("circle")
              .attr("cx", xScale(lastActive.Week))
              .attr("cy", yScale(lastActive.Cumulative_Actual))
              .attr("r", 9)
              .attr("fill", "steelblue");

            chartGroup.append("text")
              .attr("x", xScale(lastActive.Week) + 15)
              .attr("y", yScale(lastActive.Cumulative_Actual) - 15)
              .attr("font-size", 16)
              .attr("font-weight", 700)
              .attr("fill", "steelblue")
              .text(`Last: ${formatDate(lastActive.Week)}`);

            chartGroup.append("text")
              .attr("x", xScale(lastActive.Week) + 15)
              .attr("y", yScale(lastActive.Cumulative_Actual) + 5)
              .attr("font-size", 15)
              .attr("fill", "steelblue")
              .text(`Solved: ${formatNumber(lastActive.Cumulative_Actual)}`);

            chartGroup.append("circle")
              .attr("cx", xScale(lastActive.Week))
              .attr("cy", yScale(lastActive.Classroom_Benchmark))
              .attr("r", 9)
              .attr("fill", "seagreen");

            chartGroup.append("text")
              .attr("x", xScale(lastActive.Week) + 15)
              .attr("y", yScale(lastActive.Classroom_Benchmark) + 25)
              .attr("font-size", 15)
              .attr("font-weight", 600)
              .attr("fill", "seagreen")
              .text(`Expected: ${formatNumber(lastActive.Classroom_Benchmark)}`);
          }

        });

    }

    update(students[0]);

    select.on("change", function () {
      update(this.value);
    });

  });

}

// Initial render
renderChart();

// Re-render on window resize
window.addEventListener("resize", renderChart);