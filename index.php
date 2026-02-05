<!DOCTYPE html>

<html lang="en">

<head>
    <title>Home -- Syl.red</title>
    <meta charset="UTF-8">
    <meta name="author" content="Code-Syl" />
    <meta name="description" content="Portfolio and website of Code-Syl" />
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="/styles/common.css" type="text/css" media="screen" />
    <link rel="stylesheet" href="/styles/window.css" type="text/css" media="screen" />
    <link rel="stylesheet" href="/styles/homepage.css" type="text/css" media="screen" />
    <link rel="stylesheet" href="/styles/desktopicon.css" type="text/css" media="screen" />
    <link rel="stylesheet" href="/styles/taskbar.css" type="text/css" media="screen" />

    <script src="/scripts/window.js" type="module" defer></script>
    <script src="/scripts/homepage.js" type="module" defer></script>

</head>

<body>

    <div class="canvas">
        <div class="win95_desktop_icon_container">
            <a href="https://github.com/code-syl/" target="_blank">
                <div class="win95_desktop_icon clickable">
                    <div class="win95_desktop_icon_image" id="internet">
                        <div class="win95_pixel"></div>
                    </div>
                    <span class="win95_desktop_icon_text"><mark class="win95_desktop_icon_text">GitHub</mark></span>
                </div>
            </a>
        </div>

        <div class="win95_window win95_window_visible" id="main_window">
            <div class="win95_header win95_header_focused" id="main_window_header">
                <span class="win95_header_text">Hi!</span>
                <div class="win95_header_controls">
                    <div class="win95_header_control clickable" id="about">
                        <div class="win95_header_control_question"></div>
                    </div>
                    <div class="win95_header_control">
                        <div class="win95_header_control_cross disabled"></div>
                    </div>
                </div>
            </div>
            <div id="main_window_canvas">
                Welcome to this corner of the internet!<br />
                This is my personal website and portfolio. Here is where I try out all sorts of wacky stuff when I feel like it.<br />
                Please feel free to navigate through this 'forever W.I.P.':<br />

                <ul>
                    <li><a href="/nav/swc/">Star Wars</a></li>
                    <li>Check back another time!</li>
                </ul>

                <span class="signature">~<a href="https://github.com/code-syl" target="_blank">code-syl</a></span>
            </div>

            <div class="homepage_welcome_image_container">
                <img src="/assets/homepage_welcome_image.png" alt="A woman wearing a black t-shirt and a blue denim pair of paints. She is smiling and looking at the camera. Her right hand is raised in a waving position. Her hair is crimson red, and her eyes are amber. Her skin is fair. The art style is pixel art and the opacity of the image is slightly reduced to make it act as a background image." />
            </div>
        </div>

        <div class="win95_window win95_window_hidden" id="about_window">
            <div class="win95_header" id="about_window_header">
                <span class="win95_header_text">About</span>
                <div class="win95_header_controls">
                    <div class="win95_header_control clickable" id="close">
                        <div class="win95_header_control_cross"></div>
                    </div>
                </div>
            </div>
            <div id="about_window_canvas">
                This site has been developed in pure HTML, CSS, and JavaScript. Some of the JSON data was generated beforehand with Python. I took inspiration from Windows 95 and the many Strawpages floating about on the internet.<br />
                I hope you enjoy your stay!<br />
                <span>- <a href="https://github.com/code-syl/" target="_blank">code-syl</a></span>
            </div>
        </div>

        <div class="win95_taskbar">
            <div class="win95_startbutton inactive">
                <div class="win95_minilogo">
                    <div class="win95_pixel"></div>
                </div>
                <span>Start</span>
            </div>
        </div>
        <div class="win95_startmenu inactive">
            <img id="rick" src="/assets/rick.gif" alt="Rick Astley dancing."/>
        </div>
    </div>

</body>

</html>