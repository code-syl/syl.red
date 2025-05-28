let visionSimRangeValue = 10;
const mode = {
    Add: "Add",
    Remove: "Remove",
};
Object.freeze(mode);
let currentMode = mode.Add;
const canvasSize = 22;

function visionSim_header_init() {
    let headerItems = [];

    let header = document.createElement("h1");
    header.innerText = "SWC Vision Simulator";
    headerItems.push(header);

    let description = document.createElement("p");
    description.classList.add("justified-text");
    description.innerText =
        "A tool to simulate the vision of a ground trooper with a given range. This tool is currently a work in progress and may not be fully functional.";
    headerItems.push(description);

    return headerItems;
}

function visionSim_controls_init() {
    let row = document.createElement("div");
    row.classList.add("row");
    row.id = "controls";

    // controls
    let btnReset = document.createElement("div");
    btnReset.classList.add("btn");
    btnReset.innerText = "\u21bb";
    btnReset.addEventListener("click", () => {
        currentMode = mode.Add;
        visionSim_clearVision();
        console.info("Received command to: reset.");
    });
    row.appendChild(btnReset);

    let btnAdd = document.createElement("div");
    btnAdd.classList.add("btn");
    btnAdd.innerText = "Add";
    btnAdd.addEventListener("click", () => {
        if (currentMode === mode.Add) return;
        currentMode = mode.Add;
        console.info("Received command to change mode to: add.");
    });
    row.appendChild(btnAdd);

    let btnRemove = document.createElement("div");
    btnRemove.classList.add("btn");
    btnRemove.innerText = "Remove";
    btnRemove.addEventListener("click", () => {
        if (currentMode === mode.Remove) return;
        currentMode = mode.Remove;
        console.info("Received command to change mode to: remove.");
    });
    row.appendChild(btnRemove);

    let rangeContainer = document.createElement("div");
    rangeContainer.classList.add("range-container");

    let rangeTitle = document.createElement("span");
    rangeTitle.innerText = "Range:";
    rangeContainer.appendChild(rangeTitle);

    let rangeSlider = document.createElement("input");
    rangeSlider.classList.add("slider");
    rangeSlider.id = "range";
    rangeSlider.type = "range";
    rangeSlider.min = 1;
    rangeSlider.max = 20;
    rangeSlider.value = visionSimRangeValue;
    rangeSlider.step = 1;
    rangeContainer.appendChild(rangeSlider);

    let rangeLabel = document.createElement("label");
    rangeLabel.htmlFor = "range";
    visionSimRangeValue = rangeSlider.value;
    rangeLabel.innerText = visionSimRangeValue;
    rangeContainer.appendChild(rangeLabel);

    rangeSlider.addEventListener("input", () => {
        visionSimRangeValue = rangeSlider.value;
        rangeLabel.innerText = visionSimRangeValue;
        console.info("New Range Value:", visionSimRangeValue);
    });

    row.appendChild(rangeContainer);

    return [row];
}

function visionSim_canvas_init(width, height) {
    let visionSim = document.createElement("div");
    visionSim.id = "vision-sim";

    let canvas = document.createElement("div");
    canvas.classList.add("canvas");
    for (let y = 0; y < height; y++) {
        let row = document.createElement("div");
        row.classList.add("row");
        row.dataset.y = y;

        for (let x = 0; x < width; x++) {
            let tile = document.createElement("div");
            tile.classList.add("tile");
            tile.dataset.x = x;
            tile.dataset.y = y;
            tile.addEventListener("click", tile_onClick());
            row.appendChild(tile);
        }

        canvas.appendChild(row);
    }

    visionSim.appendChild(canvas);

    return visionSim;
}

function tile_onClick() {
    return (tile) => {
        switch (currentMode) {
            case mode.Add:
                console.info(
                    "Tile:",
                    tile.target.dataset.x,
                    tile.target.dataset.y
                );
                visionSim_drawVisionCircle(
                    parseInt(tile.target.dataset.x),
                    parseInt(tile.target.dataset.y)
                );
                break;
            case mode.Remove:
                console.log("I am on remove mode");
                break;
            default:
                console.warn("Help! I am lost!");
                break;
        }
    };
}

function visionSim_drawVisionCircle(originX, originY) {
    const xMin = Math.max(0, originX - visionSimRangeValue);
    const xMax = Math.min(canvasSize, originX + visionSimRangeValue);
    const yMin = Math.max(0, originY - visionSimRangeValue);
    const yMax = Math.min(canvasSize, originY + visionSimRangeValue);

    for (let y = yMin; y <= yMax && y < canvasSize; y++) {
        for (let x = xMin; x <= xMax && x < canvasSize; x++) {
            if (x < 0 || y < 0) continue;
            const inRange =
                Math.sqrt(
                    Math.pow(x - originX, 2) + Math.pow(y - originY, 2)
                ) <= visionSimRangeValue;
            if (inRange) {
                visionSim_drawSingleActive(x, y);
            }
        }
    }

    document
        .querySelector(`.tile[data-x="${originX}"][data-y="${originY}"]`)
        .classList.add("origin");
}

function visionSim_drawSingleActive(x, y) {
    let tile = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    console.log("Drawing at:", x, y);
    tile.classList.add("active");
}

function visionSim_clearVision() {
    let tiles = document.querySelectorAll(".tile");
    for (let tile of tiles) {
        tile.classList.remove("active");
        tile.classList.remove("origin");
    }
}

// https://stackoverflow.com/a/51468627
// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentElement
document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".main-content");
    const header = visionSim_header_init();
    const controls = visionSim_controls_init();

    for (const element of header) {
        container.insertAdjacentElement("beforeend", element);
    }
    for (const control of controls) {
        container.insertAdjacentElement("beforeend", control);
    }
    container.insertAdjacentElement(
        "beforeend",
        visionSim_canvas_init(canvasSize, canvasSize)
    );
});
