function visionSim_header() {
    let headerItems = [];

    let header = document.createElement("h1");
    header.innerText = "SWC Vision Simulator";
    headerItems.push(header);

    let description = document.createElement("p");
    description.classList.add("justified-text");
    description.innerText =
        "A tool to simulate the vision of a ship with a given range.";
    headerItems.push(description);

    return headerItems;
}

function visionSim_init(width, height) {
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
    const header = visionSim_header();

    for (const element of header) {
        container.insertAdjacentElement("beforeend", element);
    }
    container.insertAdjacentElement("beforeend", visionSim_init(20, 20));
});
