// get the data
const sectorDataPath = "/nav/swc/galaxy-map/sectors.json";
let sectors = {};
fetch(sectorDataPath)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Couldn't fetch JSON data. HTTP Status: ${response.status}`);
        }
        return response.json();
    })
    .then(d => {
        sectors = d;
        _loadWebpage();
    })
    .catch(e =>  {
        console.error("Failed to load the webpage!", e);
        document.body.innerHTML = "The webpage couldn't be loaded.";
        document.body.style["color"] = "red";
    });

// if the data is loaded, continue loading the website
function _loadWebpage() {
    // prepare and add the galaxy map SVG
    const galaxyMapSvgText = _createGalaxyMapSvg(sectors);
    let galaxyMap = document.querySelector("figure.galaxy-map");
    galaxyMap.innerHTML = galaxyMapSvgText;
    
    let galaxyMapSvg = galaxyMap.querySelector("svg.sectors");
    galaxyMapSvg.querySelectorAll("polygon").forEach(polygon => {
        polygon.addEventListener("mouseenter", () => {
            mouseTooltip.classList.add("visible");
            mouseTooltip.innerHTML = polygon.dataset["name"];
        });

        polygon.addEventListener("mouseleave", () => {
            mouseTooltip.classList.remove("visible");
        });
    });

    // prepare mouse tooltip
    let mouseTooltip = document.querySelector("div.mouse-tooltip");
    document.addEventListener("mousemove", (e) => {
        _tooltipMove(e, mouseTooltip);
    });
    
    // prepare the alphabet selector for the first time
    let alphabetSelector = document.querySelector("div.alphabet-selectors");
    alphabetSelector.innerHTML = ""; // remove JS warning
    for (let c = 65 /* A */; c <= 90 /* Z */; c++) {
        const currentCharacter = String.fromCharCode(c);
        let elements = _createSelector("startingLetter", currentCharacter, currentCharacter);
        elements.input.addEventListener("change", () => {
            _prepareSectorSelector(elements.input.value);
        });
        if (c == 65)
            elements.input.checked = true;
        alphabetSelector.appendChild(elements.input);
        alphabetSelector.appendChild(elements.label);
    }

    // prepare the sector selector for the first time
    _prepareSectorSelector( 
        alphabetSelector.querySelector("input[type=\"radio\"]:checked").value
    );
}

function _createGalaxyMapSvg() {
    let galaxyMapSvg  = "<svg width=\"100%\" height=\"100%\" viewBox=\"0 0 1000 1000\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sectors\">\n";
        galaxyMapSvg += "\t<g transform=\"scale(1,-1) translate(500,-500)\">\n";
    sectors.forEach((sector) => {
        galaxyMapSvg += `\t\t<polygon data-name=\"${sector.name}\" data-uid=\"${sector.uid}\" data-checked=\"false\" points=\"${sector.points_string_svg}\" />\n`;
    });
        galaxyMapSvg += "\t</g>\n";
        galaxyMapSvg += "</svg>";

    return galaxyMapSvg;
}

function _createSelector(name, id, value) {
    let input = document.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("name", name);
    input.setAttribute("id", id);
    input.setAttribute("value", value);

    if (value == "A")
        input.checked = true;

    let label = document.createElement("label");
    label.setAttribute("for", id);
    label.innerText = value;

    return { "input" : input, "label" : label };
}

function _prepareSectorSelector(selectedLetter) {
    let sectorSelector = document.querySelector("div.sector-selectors");
    sectorSelector.innerHTML = ""; // remove JS warning and previous data
    
    sectors
        .reduce((output, sector) => (
            sector.name.startsWith(selectedLetter) && output.push(sector.name),
            output
        ), [])
        .sort()
        .forEach((sector, index) => {
            let elements = _createSelector("sector", sector, sector);
            if (index == 0) {
                elements.input.checked = true;
                document
                    .querySelectorAll("polygon[data-checked=\"true\"]")
                    .forEach(p => p.dataset["checked"] = false);
                document
                    .querySelector(`polygon[data-name="${elements.input.value}"]`)
                    .dataset["checked"] = true;
            }

            elements.input.addEventListener("change", () => {
                // remove checked mark
                let previous = document.querySelectorAll("polygon[data-checked=\"true\"]");
                previous.forEach(p => p.dataset["checked"] = false);

                // add new checked mark
                document.querySelector(`polygon[data-name="${elements.input.value}"]`).dataset["checked"] = true;
            });
            sectorSelector.appendChild(elements.input);
            sectorSelector.appendChild(elements.label);
        });    
}

function _tooltipMove(event, element) {
    element.style.left = (event.clientX + 5) + "px";
    element.style.top = (event.clientY + 5) + "px";
}