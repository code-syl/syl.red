// prepare mouse tooltip
document.addEventListener("mousemove", (e) => {
    _tooltipMove(e, document.querySelector("div.mouse-tooltip"));
});

// prepare galaxy map
let mapSvg = document.querySelector("svg.sectors");
const svgPath = "/nav/swc/galaxy-map/sectors.svg";
fetch(svgPath)
    .then(response => response.text())
    .then(svgText => {
        const container = document.querySelector("div.galaxy-map");
        container.innerHTML = svgText;
        let mouseTooltip = document.querySelector("div.mouse-tooltip");

        const svg = container.querySelector("svg.sectors");
        svg.querySelectorAll("polygon").forEach(polygon => {
            polygon.addEventListener("mouseenter", () => {
                mouseTooltip.classList.add("visible");
                mouseTooltip.innerHTML = polygon.dataset["name"];
            });

            polygon.addEventListener("mouseleave", () => {
                mouseTooltip.classList.remove("visible");
            });
        });
    })
    .catch(e => console.error("SVG failed to load:", e));




function _tooltipMove(event, element) {
    element.style.left = (event.clientX + 5) + "px";
    element.style.top = (event.clientY + 5) + "px";
}