const _identifier = "main_window";
let _main_window_draggable = document.getElementById(_identifier);
const _container = document.querySelector(".canvas");
let _main_window_draggable_header = document.getElementById(
    _identifier + "_header"
);
_main_window_draggable_header.addEventListener("mousedown", _drag);
_main_window_draggable_header.addEventListener("touchstart", _drag, {
    passive: false,
});

// derived from https://infinitejs.com/posts/keep-dragged-elements-within-parent/
function _drag(event) {
    event.preventDefault();

    let clientX = event.clientX || event.touches[0].clientX;
    let clientY = event.clientY || event.touches[0].clientY;

    let offsetX = clientX - _main_window_draggable.getBoundingClientRect().left;
    let offsetY = clientY - _main_window_draggable.getBoundingClientRect().top;

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
        const elementRectangle = _main_window_draggable.getBoundingClientRect();

        // restrict movement within the container
        newX = Math.max(
            containerRectangle.left,
            Math.min(newX, containerRectangle.right - elementRectangle.width)
        );
        newY = Math.max(
            containerRectangle.top,
            Math.min(newY, containerRectangle.bottom - elementRectangle.height)
        );

        _main_window_draggable.style.left =
            newX - containerRectangle.left + "px";
        _main_window_draggable.style.top = newY - containerRectangle.top + "px";
    }

    function _stop() {
        document.removeEventListener("mousemove", _onMove);
        document.removeEventListener("mouseup", _stop);
        document.body.removeEventListener("mouseleave", _stop);

        document.removeEventListener("touchmove", _onMove);
        document.removeEventListener("touchend", _stop);
    }
}
