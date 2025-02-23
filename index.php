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

    <script src="/scripts/window.js" type="module" defer></script>
    <script src="/scripts/homepage.js" type="module" defer></script>

</head>

<!-- thanks to https://stackoverflow.com/a/5983338 for the FOUC test fix -->

<body onload="document.body.style.visibility=`visible`;">
    <script>
        document.body.style.visibility = `hidden`;
    </script>

    <div class="canvas">
        <div class="win95_window win95_window_visible " id="main_window">
            <div class="win95_header win95_header_focused" id="main_window_header">
                <span class="win95_header_text">Welcome!</span>
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
                Hello world!<br />
                <a href="https://google.com" target="_blank">Click here to go to Google!</a>
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
                This site has been developed in pure HTML, CSS, and JavaScript. I took inspiration from Windows 95 and the many Strawpages floating about on the internet.<br />
                I hope you enjoy your stay!
                <div class="win95_dashed_box" id="about_window_github_box">
                    Hello
                </div>
            </div>
        </div>
    </div>

</body>

</html>