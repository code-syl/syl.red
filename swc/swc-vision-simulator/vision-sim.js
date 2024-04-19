let visionSimRangeValue = 10;

function visionSim_header_init() {
    let headerItems = [];

    let header = document.createElement("h1");
    header.innerText = "SWC Vision Simulator";
    headerItems.push(header);

    let description = document.createElement("p");
    description.classList.add("justified-text");
    description.innerText =
        "A tool to simulate the vision of a ship with a given range. This tool is currently a work in progress and may not be fully functional.";
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
    row.appendChild(btnReset);

    let btnAdd = document.createElement("div");
    btnAdd.classList.add("btn");
    btnAdd.innerText = "Add";
    row.appendChild(btnAdd);

    let btnRemove = document.createElement("div");
    btnRemove.classList.add("btn");
    btnRemove.innerText = "Remove";
    row.appendChild(btnRemove);

    let rangeTitle = document.createElement("div");
    rangeTitle.innerText = "Range:";
    row.appendChild(rangeTitle);

    let rangeSlider = document.createElement("input");
    rangeSlider.classList.add("slider");
    rangeSlider.id = "range";
    rangeSlider.type = "range";
    rangeSlider.min = 0;
    rangeSlider.max = 20;
    rangeSlider.value = this.visionSimRangeValue;
    rangeSlider.step = 1;
    row.appendChild(rangeSlider);

    let rangeLabel = document.createElement("label");
    rangeLabel.htmlFor = "range";
    this.visionSimRangeValue = rangeSlider.value;
    rangeLabel.innerText = this.visionSimRangeValue;
    row.appendChild(rangeLabel);

    rangeSlider.addEventListener("input", () => {
        this.visionSimRangeValue = rangeSlider.value;
        rangeLabel.innerText = this.visionSimRangeValue;
    });

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
            row.appendChild(tile);
        }

        canvas.appendChild(row);
    }

    visionSim.appendChild(canvas);

    return visionSim;
}

// https://stackoverflow.com/a/51468627
// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentElement
document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector("main-content");
    const header = visionSim_header_init();
    const controls = visionSim_controls_init();

    for (const element of header) {
        container.insertAdjacentElement("beforeend", element);
    }
    for (const control of controls) {
        container.insertAdjacentElement("beforeend", control);
    }
    container.insertAdjacentElement("beforeend", visionSim_canvas_init(20, 20));
});
