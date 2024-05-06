const container = d3.select("div.container");

container
  .append("h1")
  .attr("id", "title")
  .text("US Educational Attainment");

container
  .append("h3")
  .attr("id", "description")
  .text("Bachelor's degree or higher 2010-2014");


const tooltip = container
  .append("div")
  .attr("id", "tooltip");
  
tooltip
  .append("p")
  .attr("class", "area");

tooltip
  .append("p")
  .attr("class", "education");

const margin = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
}
// define and append an SVG element
const width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

const svgContainer = container
  .append("svg")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

// define the group element nested inside the SVG, in which to actually plot the map
const svgCanvas = svgContainer
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);


const legendValues = {
  percentage: [3, 12, 21, 30, 39, 48, 57, 66],
  color: ["#E5F5E0", "#C7E9C0", "#A1D99B", "#74C476", "#41AB5D", "#238B45", "#006D2C", "#00441B"],
  height: 15,
  width: 30
}

// create and append a legend at the top of the SVG
const legend = svgCanvas
  .append("g")
  .attr("id", "legend")
  .attr("transform", `translate(${width - legendValues.percentage.length * legendValues.width}, 0)`);

legend
  .selectAll("rect")
  .data(legendValues.percentage)
  .enter()
  .append("rect")
  .attr("width", legendValues.width)
  .attr("height", legendValues.height)
  .attr("x", (d, i) => i*legendValues.width)
  .attr("y", 0)
  .attr("fill", (d, i) => legendValues.color[i]);

legend
  .selectAll("text")
  .data(legendValues.percentage)
  .enter()
  .append("text")
  .attr("x", (d,i) => i*legendValues.width)
  // position the labels below the rectangle elements
  .attr("y", legendValues.height*2)
  .style("font-size", "0.6rem")
  .text((d) => `${d}%`);

const colorScale = d3
  .scaleQuantize()
  .range(legendValues.color);


const URL_DATA = "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json";
const URL_SVG = "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json";

// first off, retrieve educational data and pass the json output in a function responsible for the merge
fetch(URL_DATA)
  .then((response) => response.json())
  .then((json) => mergeData(json));

// create a function which takes as input the educational data and merges its values in the SVG values
function mergeData(data) {

  // fetch the SVG values and include the JSON format from the response
  fetch(URL_SVG)
    .then((response) => response.json())
    .then((json) => {
      // loop through the array of educational data 
      for(let i = 0; i < data.length; i++) {
        // for each educational data point, consider the .fips property
        // this provides the link with the SVG values, in the matching property of .id
        let fips = data[i].fips;

        // loop through the array of geometries for the counties (geometries then used when drawing the map)
        let geometries = json.objects.counties.geometries;
        for(let j = 0; j < geometries.length; j++) {
          // consider the id of each array item
          let id = geometries[j].id;
          // if the fips value matches the id counterpart
          if(fips === id) {
            // update the object with the SVG values with the properties of the matching object in the educational array
            geometries[j] = Object.assign({}, geometries[j], data[i]);
            // stop looping as to find the next match
            break;
          }
        }
      }
      // return the entire JSON format, now updated with the matching educational values
      return json;
    })
    // call a function to draw the map, on the basis of the updated JSON format
    .then((json) => drawMap(json));
}

// with the JSON format including SVG values _and_ educational data draw the counties and include matching data
function drawMap(data) {

  colorScale.domain([0, d3.max(data.objects.counties.geometries, (d) => d.bachelorsOrHigher)]);
  
  let feature = topojson.feature(data, data.objects.counties);
  // console.log(feature);

  const path = d3
    .geoPath();  

 svgCanvas
    .selectAll("path")
    .data(feature.features)
    .enter()
    .append("path")
    .on("mouseenter", (d,i) => {
      tooltip
        .style("opacity", 1)
        .attr("data-fips", data.objects.counties.geometries[i].fips)
        .attr("data-education", data.objects.counties.geometries[i].bachelorsOrHigher)
        .style("left", `${d3.event.layerX + 5}px`)
        .style("top", `${d3.event.layerY + 5}px`);
      // include the text in the two paragraph elements
      tooltip
        .select("p.area")
        .text(() => `${data.objects.counties.geometries[i].area_name}, ${data.objects.counties.geometries[i].state}`);
      tooltip
        .select("p.education")
        .text(() => `${data.objects.counties.geometries[i].bachelorsOrHigher}%`);
    })
    // on mouseout, hide the tooltip
    .on("mouseout", () => tooltip.style("opacity", 0))
    .attr("d", path)
    .attr("transform", `scale(0.82, 0.62)`)
    .attr("class", "county")
    // include the attributes prescribed by the user stories
    .attr("data-fips", (d, i) => data.objects.counties.geometries[i].fips)
    .attr("data-state", (d, i) => data.objects.counties.geometries[i].state)
    .attr("data-area", (d, i) => data.objects.counties.geometries[i].area_name)
    .attr("data-education", (d, i) => data.objects.counties.geometries[i].bachelorsOrHigher)
    .attr("fill", (d, i) => colorScale(data.objects.counties.geometries[i].bachelorsOrHigher));
}