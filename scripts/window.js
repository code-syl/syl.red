const _main_window_identifier = "main_window";

let _main_window = document.getElementById(_main_window_identifier);
const _container = document.querySelector(".canvas");
let _main_window_draggable_header = document.getElementById(
    _main_window_identifier + "_header"
);
_main_window_draggable_header.addEventListener("mousedown", (event) => {
    _drag(event, _main_window);
});
_main_window_draggable_header.addEventListener(
    "touchstart",
    (event) => {
        _drag(event, _main_window);
    },
    {
        passive: false,
    }
);

// derived from https://infinitejs.com/posts/keep-dragged-elements-within-parent/
function _drag(event, element) {
    event.preventDefault();

    let clientX = event.clientX || event.touches[0].clientX;
    let clientY = event.clientY || event.touches[0].clientY;

    let offsetX = clientX - _main_window.getBoundingClientRect().left;
    let offsetY = clientY - _main_window.getBoundingClientRect().top;

    document.addEventListener("mousemove", _onMove);
    document.addEventListener("mouseup", _stop);
    document.body.addEventListener("mouseleave", _stop);

    document.addEventListener("touchmove", _onMove, { passive: false });
    document.addEventListener("touchend", _stop);

    function _onMove(event) {
        event.preventDefault();

        let clientX = event.clientX || event.touches[0].clientX;
        let clientY = event.clientY || event.touches[0].clientY;

        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        const containerRectangle = _container.getBoundingClientRect();
        const elementRectangle = element.getBoundingClientRect();

        // restrict movement within the container
        newX = Math.max(
            containerRectangle.left,
            Math.min(newX, containerRectangle.right - elementRectangle.width)
        );
        newY = Math.max(
            containerRectangle.top,
            Math.min(newY, containerRectangle.bottom - elementRectangle.height)
        );

        _main_window.style.left = newX - containerRectangle.left + "px";
        _main_window.style.top = newY - containerRectangle.top + "px";
    }

    function _stop() {
        document.removeEventListener("mousemove", _onMove);
        document.removeEventListener("mouseup", _stop);
        document.body.removeEventListener("mouseleave", _stop);

        document.removeEventListener("touchmove", _onMove);
        document.removeEventListener("touchend", _stop);
    }
}
