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

    <script src="/scripts/window.js" type="text/javascript" defer></script>

</head>

<!-- thanks to https://stackoverflow.com/a/5983338 for the FOUC test fix -->

<body onload="document.body.style.visibility=`visible`;">
    <script>
        document.body.style.visibility = `hidden`;
    </script>

    <div class="canvas">
        <div class="win95_window" id="main_window">
            <div class="win95_header" id="main_window_header">
                <span class="win95_header_text">Welcome!</span>
                <div class="win95_header_controls">
                    <div class="win95_header_control">
                        <div class="win95_header_control_question"></div>
                    </div>
                    <div class="win95_header_control">
                        <div class="win95_header_control_cross"></div>
                    </div>
                </div>
            </div>

        </div>
    </div>

</body>

</html>