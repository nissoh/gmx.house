
// import * as random from 'd3-random'
// import * as select from 'd3-selection'
// import * as scale from 'd3-scale'
// import * as shape from 'd3-shape'

// const n = 40
// const genRandom = random.randomNormal(0, .2)

// const data = scale.range(n).map(random)
 
// const margin = { top: 20, right: 20, bottom: 20, left: 40 },
//   width = 960 - margin.left - margin.right,
//   height = 500 - margin.top - margin.bottom




// const xBand = scale.scaleLinear()
//   .domain([0, n - 1])
//   .range([0, width])
 
// const yBand = scale.scaleLinear()
//   .domain([-1, 1])
//   .range([height, 0])
 
// const line = shape.line()
//   .x((d, i) => xBand(i))
//   .y(d => yBand(d))
 
// const svg = select.select("body").append("svg")
//   .attr("width", width + margin.left + margin.right)
//   .attr("height", height + margin.top + margin.bottom)
//   .append("g")
//   .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
 
// svg.append("defs").append("clipPath")
//   .attr("id", "clip")
//   .append("rect")
//   .attr("width", width)
//   .attr("height", height)
 
// svg.append("g")
//   .attr("class", "x axis")
//   .attr("transform", "translate(0," + yBand(0) + ")")
//   .call(d3.svg.axis().scale(xBand).orient("bottom"))
 
// svg.append("g")
//   .attr("class", "y axis")
//   .call(d3.svg.axis().scale(yBand).orient("left"))
 
// const path = svg.append("g")
//   .attr("clip-path", "url(#clip)")
//   .append("path")
//   .datum(data)
//   .attr("class", "line")
//   .attr("d", line)
 
// tick()
 
// function tick() {
 
//   // push a new data point onto the back
//   data.push(genRandom())
 
//   // redraw the line, and slide it to the left
//   path
//     .attr("d", line)
//     .attr("transform", null)
//     .transition()
//     .duration(500)
//     .ease("linear")
//     .attr("transform", "translate(" + xBand(-1) + ",0)")
//     .each("end", tick)
 
//   // pop the old data point off the front
//   data.shift()
 
// }