/*function plotLineChart is based on the following graph galleries:
- https://www.d3-graph-gallery.com/graph/line_brushZoom.html : used to brush selections of the graph
-https://www.d3-graph-gallery.com/graph/line_select.html : used to select a group and plot the line chart of this group
-https://bl.ocks.org/d3noob/a22c42db65eb00d4e369 : tool-tips
*/
// set the dimensions and margins of the line chart
var margin = {top: 20, right: 40, bottom: 50, left: 100},
    width = 1050 - margin.left - margin.right,
    height = 650 - margin.top - margin.bottom;

//variable to define the domain of the x-axis
var xdomain
//variable to store the opacity level of the vertical lines that indicate the game/patch releases
var opacityVertLine = 0
var selectedRegion = "EU" //set the first selected region to "EU"

let xScale, yScale

//function to plot the line chart and the vertical lines that indicate the game/patch releases
function plotLineChart() {

    // append an svg object to the body of the page
    var svg = d3.select("#line_chart")
        .append("svg") //refers to the whole svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("id", "mysvg")
        .append("g") //refers to the coordinate system
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")")
        .attr("id", "myCoordianteSystem");

    // add a clipPath: everything outside of the clipPath will not be drawn.
    // the clipPath represents the "inside" part of the coordinate system and will include the lineChart that we
    // will update
    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0)

    // Create a line variable of the lineChart (based on the initially selected region (EU))
    var line = svg.append('g')
        .attr("clip-path", "url(#clip)") //associate the line to the above-defined clipPath
        .attr("class", "clipPath")
        .attr("id", "clipPath")


    // Create a vertLine variable to save the vertical lines that indicate the game and patch releases
    var vertLine = svg.append('g')
        .attr("clip-path", "url(#clip)") //associate the line to the above-defined clipPath
        .attr("class", "clipLine")
        .attr("id", "clipLine")

    //Read the gold - token prices
    d3.csv("/static/data/dataAggregatedPivot.csv",
        // first function applied on csv- data: read in "date" column in date format
        // pipe the result to the second function below
        function (d) {
            return {
                date: d3.timeParse("%Y-%m-%d")(d.date),
                EU: d.EU,
                China: d.China,
                Korea: d.Korea,
                Taiwan: d.Taiwan,
                Americas: d.Americas
            }
        },
        // second function applied on result of first function: plot the line chart
        function (data) {
            //save all regions in one list variable
            var allRegions = ["EU", "China", "Korea", "Taiwan", "Americas"]

            // add the regions to the select button
            d3.select("#selectButton")
                .selectAll('myOptions')
                .data(allRegions)
                .enter()
                .append('option')
                .text(function (d) {
                    return d;
                }) // text shown in the menu
                .attr("value", function (d) {
                    return d;
                }) // corresponding value returned by the button


            //restrict the data to the selected region
            var dataRegion = data.map(function (d) {
                return {date: d.date, value: d[selectedRegion]}
            })

            // add x axis to the coordinate system
            xdomain = d3.extent(dataRegion, function (d) {
                return d.date;
            }) //save the domain to xdomain to use it for drawing the vertical lines later

            xScale = d3.scaleTime()//use d3.scaleTime to map [min,max] of the date attribute (via d3.extent) to the available width of the coordinate system
                .domain(xdomain)
                .range([0, width]);
            xAxis = svg.append("g")
                .attr("transform", "translate(0," + height + ")") //move axis below plot space
                .attr("class", "axis") //separate axis-style in css
                .call(d3.axisBottom(xScale));

            // label the x axis with "Date"
            svg.append("text")
                .attr("class", "axisLabel")
                .attr("transform",
                    "translate(" + (width / 2) + " ," +
                    (height + margin.top + 25) + ")")
                .style("text-anchor", "middle")
                .text("Date");

            // add y axis to the coordinate system
            yScale = d3.scaleLinear()//use d3.scaleLinear to map [0,max] of the values to the available height of the coordinate system (the maximum value is given in the data of China)
                .domain([0, d3.max(data, function (d) {
                    return +d.China;
                })])
                .range([height, 0]);
            yAxis = svg.append("g")
                .attr("class", "axis") //separate axis-style in css
                .call(d3.axisLeft(yScale));
            // label the y axis
            svg.append("text")
                .attr("transform", "rotate(-90)") //turn 90 degrees
                .attr("class", "axisLabel")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("gold price per token");
            // define separate colours for each region
            var color = d3.scaleOrdinal()
                .domain(allRegions) //use ordinal scaling
                .range(["#e41a1c", //color of EU
                    "#377eb8", //color of China
                    "#4daf4a", //color of Korea
                    "#984ea3", //color of Taiwan
                    "#ff7f00"]) // color of Americas

            // Draw the initial lineChart (based on the initially selected region defined in dataRegion (EU))
            line.append("path")
                .datum(dataRegion) //initially selected region=EU
                .attr("class", "path")  // put class "path" to be able to modify this line later
                .attr("fill", "none")
                .attr("stroke-width", 2.0)
                .attr("d", d3.line()
                    .x(function (d) {
                        return xScale(d.date)
                    }) //use the above-defined scaling of time (x)
                    .y(function (d) {
                        return yScale(d.value)
                    }) //use the above-defined scaling of gold (y)
                )
                .attr("stroke", color(selectedRegion)) //color the path according to the selected region


            // Add brushing
            var brush = d3.brushX()                   // add the brush feature using the d3.brush function (only vary the x-length)
                .extent([[0, 0], [width, height]])  // initialise the brush area: start at 0,0 and finishes at width,height (i.e. select the whole graph area)
                .on("end", brushChart)               // each time the brush selection changes, trigger the 'brushChart' function

            // Add the brush to the lineChart
            line
                .append("g")
                .attr("class", "brush") //assign class brush to call it later
                .call(brush) //var brush defined above to set the brush feature
                .on('mouseover', mouseover)
                .on('mousemove', mousemove)
                .on('mouseout', mouseout);

            var bisect = d3.bisector(function (d) {
                return d.date;
            }).left;

            var focus = svg
                .append('g')
                .append('circle')
                .style("fill", "none")
                .attr("stroke", "black")
                .attr('r', 8.5)
                .style("opacity", 0)

            // Create the text that travels along the curve of chart
            var focusText = svg
                .append('g')
                .append('text')
                .style("opacity", 0)
                .attr("text-anchor", "left")
                .attr("alignment-baseline", "middle")


            // What happens when the mouse move -> show the annotations at the right positions.
            function mouseover() {
                focus.style("opacity", 1)
                focusText.style("opacity", 1)
            }

            function mousemove() {
                // recover coordinate we need
                var x0 = xScale.invert(d3.mouse(this)[0]);
                var i = bisect(dataRegion, x0, 1);
                selectedData = dataRegion[i]
                focus
                    .attr("cx", xScale(selectedData.date))
                    .attr("cy", yScale(selectedData.value))
                focusText
                    .html("Gold: " + Math.round(selectedData.value))
                    .attr("x", xScale(selectedData.date) + 20)
                    .attr("y", yScale(selectedData.value))
            }

            function mouseout() {
                focus.style("opacity", 0)
                focusText.style("opacity", 0)
            }


            // A function that updates the LineChart based on the given boundaries of the brush
            function brushChart() {
                extent = d3.event.selection // stores the selected boundaries
                // There are two possibilities when this function is called:
                // 1) the brush indeed selected a new region
                // 2) the brush was updated within this very function to remove the grey brush area after selection (see below)
                //
                // in 1), extent will not be null but will include the new selection parameters.
                // in 2), extent will be null.
                // If extent is not null, we will update the X axis domain for the lineChart and the vertical lines chart
                if (extent) {
                    xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])])
                    line.select(".brush").call(brush.move, null) // This removes the grey brush area as soon as the selection has been done
                    // Update axis and position
                    xAxis.transition().duration(1000).call(d3.axisBottom(xScale))
                    //update the lineChart
                    line
                        .select('.path')
                        .transition()
                        .duration(1500)
                        .attr("d", d3.line()
                            .x(function (d) {
                                return xScale(d.date)
                            }) //scale the x values with the new domain scaling
                            .y(function (d) {
                                return yScale(d.value)
                            })
                        )
                    //update the verticalLines
                    vertLine
                        .selectAll('.vertLine')
                        .transition()
                        .duration(1500)
                        .attr("x1", function (d) {
                            return xScale(d.date)
                        }) //scale the x values with the new domain scaling
                        .attr("y1", 0)
                        .attr("x2", function (d) {
                            return xScale(d.date)
                        })
                }
            }

            // if the user double click, we reinitialise the chart
            svg.on("dblclick", function () {
                xScale.domain(d3.extent(data, function (d) {
                    return d.date;
                }))//redefine the x-axis scaling based on the whole data
                xAxis.transition().call(d3.axisBottom(xScale))
                //update the lineChart
                line
                    .select('.path')
                    .transition()
                    .attr("d", d3.line()
                        .x(function (d) {
                            return xScale(d.date)
                        })
                        .y(function (d) {
                            return yScale(d.value)
                        })
                    )
                //update the vertical lines
                vertLine
                    .selectAll('.vertLine')
                    .transition()
                    .attr("x1", function (d) {
                        return xScale(d.date)
                    })
                    .attr("y1", 0)
                    .attr("x2", function (d) {
                        return xScale(d.date)
                    })
            });


            // In the selectButton, we can select different regions
            // whenever we select a new region (change of the selectButton),
            // we plot the lineChart based on the updateRegion function
            d3.select("#selectButton").on("change", function (d) {
                // get the selected region
                selectedRegion = d3.select(this).property("value")
                // run the updateRegion function with the selected region
                updateRegion(selectedRegion)
            })

            // update the lineChart based on the selected region
            function updateRegion(selectedRegion) {
                // restrict the full dataset data to the restricted region
                dataRegion = data.map(function (d) {
                    return {date: d.date, value: d[selectedRegion]}
                })

                // assign the restricted data to the lineChart and update the x and y values accordingly
                line.select(".path")
                    .datum(dataRegion)
                    .transition()
                    .duration(1500)
                    .attr("class", "path")  //put class "path" to be able to modify this line later
                    .attr("fill", "none")
                    .attr("stroke-width", 2)
                    .attr("d", d3.line()
                        .x(function (d) {
                            return xScale(+d.date)
                        })
                        .y(function (d) {
                            return yScale(+d.value)
                        })
                    )
                    .attr("stroke", color(selectedRegion))
            }
        });

    //read the blizzard release data to draw the vertical lines that correspond to the release dates (games & patches)
    d3.csv("/static/data/blizzard.csv",
        // the first function will correctly interpret the attribute date as a date variable
        function (d) {
            return {
                date: d3.timeParse("%Y-%m-%d")(d.release),
                title: d.title,
                company: d.company,
                type: d.type,
                trailer: d.trailer
            }
        },
        // second function applied on result of first function: plot the release data as vertical lines
        function (data) {
            //scale the x-values according to the full xdomain (defined when drawing the lineChart)
            var x = d3.scaleTime()//use d3.scaleTime to map [min,max] of the date attribute (via d3.extent) to the available width of the coordinate system
                .domain(xdomain)
                .range([0, width]);

            // plot the tooltips (first transparent: will be made visible on mouseover):
            // taken from https://bl.ocks.org/d3noob/a22c42db65eb00d4e369
            var ttFeature = d3.select("body").append("div")
                .attr("class", "tooltipFeature")
                .style("opacity", 0);

            // define different colours for the release-types "game" and "patch"
            var color = d3.scaleOrdinal()
                .domain(["content-patch", "minor-patch", "raid-patch", "game"]) //use ordinal scaling
                .range(["#00ab00", "#000000", "#0000ab", //color of patch
                    "#d94701"]) //color of game

            //draw a legend at the bottom of the chart
            var legend = d3.select("#legend")
                .append("svg") //refers to the whole svg
                .attr("width", 500)
                .attr("height", 100)
                .attr("id", "mylegend")
                .append("g")
            //draw rectangles for "game" and "patch" according to the colours defined above
            legend.selectAll('rect')
                .data(color.range())
                .enter()
                .append('rect')
                .attr("class", "legendRect")
                .attr("fill-opacity", opacityVertLine) //opacityVertLine is a global variable to set the visibility of the verical lines and the legend
                .attr('width', 120)
                .attr('x', function (d, i) {
                    return i * 120;
                })
                .attr('y', 40)
                .attr('height', 20)
                .style('fill', function (d) {
                    return d;
                });
            //label the rectangles with "game" and "patch"
            legend.selectAll('text')
                .data(color.domain())
                .enter()
                .append('text')
                .attr("class", "legendText")
                .style("opacity", opacityVertLine) //opacityVertLine is a global variable to set the visibility of the verical lines and the legend
                .attr('x', function (d, i) {
                    return (i) * 120 + 1;
                })
                .attr('y', 70)
                .text(function (d, i) {
                    return (d)
                })
                .style('fill', 'black')
                .style('stroke', 'none');

            //draw verical lines for the release data
            vertLine.append("g")
                .selectAll("line")
                .data(data)
                .enter()
                .append("line")
                .attr("class", "vertLine")
                .attr("x1", d => x(d.date))
                .attr("y1", 0)
                .attr("x2", d => x(d.date))
                .attr("y2", height)
                .style("opacity", opacityVertLine) //opacityVertLine is a global variable to set the visibility of the verical lines and the legend
                .attr("stroke", d => color(d.type))
                .on("click", (d, i) => {
                    document.querySelector("#four").click()
                    document.querySelector("#trailer-name").textContent = d.title
                    document.querySelector("#embed-me").innerHTML = '<iframe width="1200" height="600" src="' + d.trailer + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
                })
                .on("mouseover", function (d, i) {
                    //plot tooltip with selected release
                    ttFeature.transition()
                        .duration(200)
                        .style("opacity", Math.min(.9, opacityVertLine)); //opacityVertLine is a global variable to set the visibility of the verical lines and the legend
                    var format = d3.timeFormat("%Y-%m-%d");
                    tooltipMessage = d.title + "<br/>" + d.type + "<br/>" + d.company + "<br/>" + format(d.date);
                    ttFeature.html(tooltipMessage)
                        .style("left", (d3.event.pageX + 20) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")
                        .style("background", color(d.type));
                })
                .on("mouseout", function () {
                    //make tooltip invisible again
                    ttFeature.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

        });
    // Above the chart, there is a button that toggles the visibility of the vertical lines
    // when it is clicked, change the global variable opacityVertLine and make the vertical lines visible and legend (or invisible)
    d3.select("#button").on("click", function () {
        opacityVertLine = (opacityVertLine + 1) % 2
        // recover the option that has been chosen

        d3.selectAll(".vertLine")
            .transition()
            .style("opacity", opacityVertLine);
        d3.selectAll(".legendText")
            .transition()
            .style("opacity", opacityVertLine);
        d3.selectAll(".legendRect")
            .transition()
            .attr("fill-opacity", opacityVertLine);
    })

}

