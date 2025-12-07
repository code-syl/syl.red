import { win95_drag } from "./window.js";

/* main window drag */
const _main_window_identifier = "main_window";
let _main_window = document.getElementById(_main_window_identifier);
let _main_window_draggable_header = document.getElementById(
    _main_window_identifier + "_header"
);
_main_window_draggable_header.addEventListener("mousedown", (event) => {
    win95_drag(event, _main_window);
});
_main_window_draggable_header.addEventListener(
    "touchstart",
    (event) => {
        win95_drag(event, _main_window);
    },
    {
        passive: false,
    }
);

/* about window drag */
const _about_window_identifier = "about_window";
let _about_window = document.getElementById(_about_window_identifier);
let _about_window_draggable_header = document.getElementById(
    _about_window_identifier + "_header"
);
_about_window_draggable_header.addEventListener("mousedown", (event) => {
    win95_drag(event, _about_window);
});
_about_window_draggable_header.addEventListener(
    "touchstart",
    (event) => {
        win95_drag(event, _about_window);
    },
    {
        passive: false,
    }
);

/* about windows appear and disappear */
let _about_button = document.querySelector(
    "#main_window .win95_header .win95_header_control#about"
);
["click", "touchstart"].forEach((event) => {
    _about_button.addEventListener(event, (e) => {
        e.stopPropagation();
        _about_window.classList.remove("win95_window_hidden");
        _about_window.classList.add("win95_window_visible");
        _main_window_draggable_header.classList.remove("win95_header_focused");
        _main_window_draggable_header.classList.add("win95_header_unfocused");
        _about_window_draggable_header.classList.remove(
            "win95_header_unfocused"
        );
        _about_window_draggable_header.classList.add("win95_header_focused");
        _about_window.style.zIndex = "2001";
        _main_window.style.zIndex = "2000";
    });
});
let _about_window_close_button = document.querySelector(
    "#about_window .win95_header .win95_header_control#close"
);
["click", "touchstart"].forEach((event) => {
    _about_window_close_button.addEventListener(event, (e) => {
        e.stopPropagation();
        _about_window.classList.remove("win95_window_visible");
        _about_window.classList.add("win95_window_hidden");
        _main_window_draggable_header.classList.remove(
            "win95_header_unfocused"
        );
        _main_window_draggable_header.classList.add("win95_header_focused");
        _about_window.style.zIndex = "2000";
        _main_window.style.zIndex = "2001";
    });
});

/* moving focus from one window to another */
let _all_windows = document.querySelectorAll(".win95_window");

["click", "touchstart"].forEach((event) => {
    _all_windows.forEach((window) => {
        window.addEventListener(event, (e) => {
            e.stopPropagation();
            window.style.zIndex = "2001";
            let header = window.querySelector(".win95_header");
            header.classList.remove("win95_header_unfocused");
            header.classList.add("win95_header_focused");
            _all_windows.forEach((other_window) => {
                if (
                    other_window !== window &&
                    !other_window.classList.contains("win95_window_hidden")
                ) {
                    other_window.style.zIndex = "2000";
                    let other_header =
                        other_window.querySelector(".win95_header");
                    other_header.classList.remove("win95_header_focused");
                    other_header.classList.add("win95_header_unfocused");
                }
            });
        });
    });
});

/* start button click */
let _start_button = document.querySelector(".win95_startbutton");
let _start_menu = document.querySelector(".win95_startmenu");
["click", "touchstart"].forEach((event) => {
    _start_button.addEventListener(event, (e) => {
        e.stopPropagation();
        if (_start_button.classList.contains("inactive")) {
            _start_button.classList.remove("inactive");
            _start_button.classList.add("active");
            _start_menu.classList.remove("inactive");
            _start_menu.classList.add("active");
        }
        else if (_start_button.classList.contains("active")) {
            _start_button.classList.remove("active");
            _start_button.classList.add("inactive");
            _start_menu.classList.remove("active");
            _start_menu.classList.add("inactive");
        }
    });
});