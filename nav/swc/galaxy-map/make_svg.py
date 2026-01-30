import json

# create the svg
sectors = ""
with open("sectors.json", "r") as file:
    sectors = json.load(file)

with open("sectors.svg", "w") as file:
    svg = "<svg width=\"100%\" height=\"100%\" viewBox=\"0 0 1000 1000\" xmlns=\"http://www.w3.org/2000/svg\">\n"
    for s in sectors:
        svg += '\t'
        svg += "<polygon style=\"stroke:lime;stroke-width:0.5;\" points=\""
        svg += s["points_string_svg"]
        svg += "\" />\n"
    svg += "</svg>"
    file.write(svg)