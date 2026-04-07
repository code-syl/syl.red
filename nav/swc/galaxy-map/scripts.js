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
    let mouseTooltip = document.querySelector("div.mouse-tooltip");
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

        polygon.addEventListener("click", () => {
            document
                .querySelector(`div.alphabet-selectors > input[type="radio"]:checked`)
                .checked = false;
            document
                .querySelector(`div.alphabet-selectors > input#${polygon.dataset["name"][0].toUpperCase()}`)
                .checked = true;
            _prepareSectorSelector( 
                polygon.dataset["name"][0].toUpperCase()
            );
            let sectorSelector = document
                .querySelector(`div.sector-selectors > input[id="${polygon.dataset["name"]}_sector"]`);
            sectorSelector.checked = true;
            sectorSelector.scrollIntoView();
            document
                .querySelector(`polygon[data-checked="true"]`)
                .dataset["checked"] = false;
            document
                .querySelector(`polygon[data-name="${polygon.dataset["name"]}"]`)
                .dataset["checked"] = true;
            _prepareSystemSelector( 
                polygon.dataset["name"]
            );
            _prepareSectorMap(polygon.dataset["name"]);
        });
    });

    // prepare mouse tooltip
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
        if (c == 67 /* C */)
            elements.input.checked = true;
        
        alphabetSelector.appendChild(elements.input);
        alphabetSelector.appendChild(elements.label);
    }

    // prepare the sector selector for the first time
    _prepareSectorSelector( 
        alphabetSelector.querySelector("input[type=\"radio\"]:checked").value,
        "Coruscant"
    );

    // prepare the system selector for the first time
    let sectorSelector = document.querySelector("div.sector-selectors");
    _prepareSystemSelector(
        sectorSelector.querySelector("input[type=\"radio\"]:checked").value
    );

    // prepare the sector map for the first time
    _prepareSectorMap(
        sectorSelector.querySelector("input[type=\"radio\"]:checked").value
    );

    // prepare the controls
    let controls = document.querySelector(".sector-map-controls");
    let floppy = controls.querySelector("#floppy");
    floppy.onclick = () => _saveCurrentSectorToImage();
    floppy.onmouseenter = () => {
        mouseTooltip.classList.add("visible");
        mouseTooltip.innerHTML = "Save to PNG";
    };

    floppy.onmouseleave = () => {
        mouseTooltip.classList.remove("visible");
    };
}

function _createGalaxyMapSvg() {
    let galaxyMapSvg  = `<svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" class="sectors">\n`;
        galaxyMapSvg += `\t<g transform="scale(1,-1) translate(500,-500)">\n`;
    sectors.forEach((sector) => {
        galaxyMapSvg += `\t\t<polygon data-name="${sector.name}" data-uid="${sector.uid}" data-checked="false" points="${sector.points_string_svg}" />\n`;        
    });
        galaxyMapSvg += "\t</g>\n";
        galaxyMapSvg += "</svg>";

    return galaxyMapSvg;
}

function _createSelector(name, id, value, suffix = "") {
    let input = document.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("name", name);
    input.setAttribute("id", id + suffix);
    input.setAttribute("value", value);

    if (value == "A")
        input.checked = true;

    let label = document.createElement("label");
    label.setAttribute("for", id + suffix);
    label.innerText = value;

    return { "input" : input, "label" : label };
}

function _prepareSectorSelector(selectedLetter, selectedSectorName) {
    let sectorSelector = document.querySelector("div.sector-selectors");
    
    sectorSelector.innerHTML = ""; // remove JS warning and previous data    
    sectors
        .reduce((output, sector) => (
            sector.name.startsWith(selectedLetter) && output.push(sector.name),
            output
        ), [])
        .sort()
        .forEach((sector, index) => {
            let elements = _createSelector("sector", sector, sector, "_sector");
            if ((!selectedSectorName && index == 0) || (sector == selectedSectorName)) {
                elements.input.checked = true;
                document
                    .querySelectorAll("polygon[data-checked=\"true\"]")
                    .forEach(p => p.dataset["checked"] = false);
                document
                    .querySelector(`polygon[data-name="${elements.input.value}"]`)
                    .dataset["checked"] = true;

                _prepareSystemSelector(elements.input.value);
                _prepareSectorMap(elements.input.value);
            }

            elements.input.addEventListener("change", () => {
                // remove checked mark
                let previous = document.querySelectorAll("polygon[data-checked=\"true\"]");
                previous.forEach(p => p.dataset["checked"] = false);

                // add new checked mark
                document.querySelector(`polygon[data-name="${elements.input.value}"]`).dataset["checked"] = true;

                // make new systems list
                _prepareSystemSelector(elements.input.value);

                // create new sector zoom
                _prepareSectorMap(elements.input.value);
            });
            sectorSelector.appendChild(elements.input);
            sectorSelector.appendChild(elements.label);
        });    
    
    document.querySelector("div.sector-selectors input:checked").scrollIntoView();
}

function _prepareSystemSelector(selectedSector) {
    let systemSelector = document.querySelector("div.system-selectors");
    const systems = sectors.find(sector => sector.name === selectedSector)["systems"];

    systemSelector.innerHTML = ""; // remove JS warning and previous data    
    systems.forEach((system, index) => {
        let elements = _createSelector("system", system.name, system.name, "_system");

        systemSelector.appendChild(elements.input);
        systemSelector.appendChild(elements.label);
    });
}

function _prepareSectorMap(sectorName) {
    let sectorMap = document.querySelector("figure.sector-map");
    sectorMap.innerHTML = _createSectorMapSvg(
        sectorName
    );

    // add tooltip
    let systemHitboxes = sectorMap.querySelectorAll("rect.system-hitbox");
    let mouseTooltip = document.querySelector("div.mouse-tooltip");
    systemHitboxes.forEach((hitbox) => {
        hitbox.addEventListener("mouseenter", () => {
            mouseTooltip.classList.add("visible");
            mouseTooltip.innerHTML = hitbox.dataset["name"];
        });

        hitbox.addEventListener("mouseleave", () => {
            mouseTooltip.classList.remove("visible");
        });
    });

    
}

function _createSectorMapSvg(sectorName) {
    const sector = sectors.find(s => s.name == sectorName);
    let pointsStr = sector.points_string_svg;
    const numbers = pointsStr.split(/[\s,]+/).map(n => parseFloat(n));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < numbers.length; i += 2) {
        const x = numbers[i];
        const y = numbers[i+1];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    const width  = maxX - minX;
    const height = maxY - minY;

    const padding = Math.min(width, height) * 0.20 || 4;
    const viewBoxWidth  = width  + padding * 2;
    const viewBoxHeight = height + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    // draw sector polygon
    const shiftedPoints = [];
    for (let i = 0; i < numbers.length; i += 2) {
        const x = numbers[i]     + offsetX;
        const y = numbers[i + 1] + offsetY;
        shiftedPoints.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }

    // draw systems
    const shiftedSystems = sector.systems.map(system => ({
        ...system,
        shiftedX: system.x + offsetX,
        shiftedY: system.y + offsetY,
    }));

    const finalPoints = shiftedPoints.join(" ");
    const baseStroke = Math.max(0.4, viewBoxWidth * 0.0008);
    const glowStroke = baseStroke * 2.5;

    const svg = `
<svg 
    viewBox="0 0 ${viewBoxWidth.toFixed(1)} ${viewBoxHeight.toFixed(1)}"
    preserveAspectRatio="xMidYMid meet"
    width="100%"
    height="100%"
>
    <g transform="scale(1,-1) translate(0, -${viewBoxHeight.toFixed(1)})">
    <polygon
        points="${finalPoints}"
        vector-effect="non-scaling-stroke"
    />

    <polygon
        points="${finalPoints}"
        fill="none"
        stroke-width="${glowStroke}"
        filter="url(#glow)"
    />

    ${shiftedSystems.map(system => `
        <rect
            x="${system.shiftedX.toFixed(2)}"
            y="${system.shiftedY.toFixed(2)}"
        />
        <rect
            x="${system.shiftedX.toFixed(2) - 0.25}"
            y="${system.shiftedY.toFixed(2) - 0.25}"
            class="system-hitbox"
            data-name="${system.name}"
            data-x="${system.x}"
            data-y="${system.y}"
            data-uid="${system.uid}"
            data-url="${system.url}"
        />
    `).join('')}
    </g>

    <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
</svg>`;

    return svg;
}

function _tooltipMove(event, element) {
    element.style.left = (event.clientX + 5) + "px";
    element.style.top = (event.clientY + 5) + "px";
}

function _saveCurrentSectorToImage() {
    // * get the figure with the sector map
    // * draw it to a canvas
    // * get the blob of the canvas
    // * download
    // sources:
    // * https://stackoverflow.com/questions/12652769/rendering-html-elements-to-canvas
    // * https://stackoverflow.com/questions/11112321/how-to-save-canvas-as-png-image

    const sectorElement = document.querySelector("figure.sector-map svg");
    if (!sectorElement) {
        console.error("No SVG found inside igure.sector-map.");
        return;
    }
    
    let width = sectorElement.clientWidth;
    let height =  sectorElement.clientHeight;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.canvas.width = width;
    context.canvas.height = height;

    const clonedElement = sectorElement.cloneNode(true);
    clonedElement.setAttribute("width", width);
    clonedElement.setAttribute("height", height);
    if (sectorElement.hasAttribute("viewBox")) {
        clonedElement.setAttribute("viewBox", sectorElement.getAttribute("viewBox"));
    }

    // get the computed style because the SVG itself depends on styles defined in a CSS stylesheet
    _copyComputedStyles(sectorElement, clonedElement);

    const serializer = new XMLSerializer();
    const svg = serializer.serializeToString(clonedElement);

    const blob = new Blob(
        [svg], 
        {type: 'image/svg+xml;charset=utf-8'}
    );

    const objectUrl = URL.createObjectURL(blob);
    const temporaryImage = new Image();
    temporaryImage.onload = () => {
        context.drawImage( temporaryImage, 0, 0 );
        URL.revokeObjectURL( objectUrl );

        canvas.toBlob((png) => {
            if (!png) {
                console.error("Couldn't create PNG blob.");
                return;
            }

            const downloadUrl = URL.createObjectURL(png);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = "sector-map.png";
            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(downloadUrl);
        }, "image/png");
    };

    temporaryImage.onerror = () => {
        console.error("Failed to load SVG into image.");
        URL.revokeObjectURL(objectUrl);
        return;
    };

    temporaryImage.src = objectUrl;
}

function _copyComputedStyles(sourceNode, targetNode) {
    // check if both are elements
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
    if (sourceNode.nodeType !== 1 || targetNode.nodeType !== 1) 
        return;

    const computedStyle = window.getComputedStyle(sourceNode);
    let inlineStyle = "";

    for (const prop of computedStyle) {
        inlineStyle += `${prop}: ${computedStyle.getPropertyValue(prop)}; `;
    }

    targetNode.setAttribute("style", inlineStyle);

    const sourceChildren = sourceNode.children;
    const targetChildren = targetNode.children;

    // recursively to get all children and their computed styles (<g> elements etc..)
    for (let i = 0; i < sourceChildren.length; i++) {
        _copyComputedStyles(sourceChildren[i], targetChildren[i]);
    }
}