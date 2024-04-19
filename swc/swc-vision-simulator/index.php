<!DOCTYPE html>

<html lang="en">

<head>
    <title>SWC Vision Simulator -- Syl.red</title>
    <meta charset="UTF-8">
    <meta name="author" content="Code-Syl" />
    <meta name="description" content="A simulator simulating the vision system in SWC, by Code-Syl" />
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="/styles/common.css" type="text/css" media="screen" />
    <link rel="stylesheet" href="/swc/swc-vision-simulator/vision-sim.css" type="text/css" media="screen" />

    <script src="/components/main-content/main-content.component.js" type="module" defer></script>
    <script src="/components/nav-bar/nav-bar.component.js" type="module" defer></script>

    <script src="/swc/swc-vision-simulator/vision-sim.js" defer></script>
</head>

<!-- thanks to https://stackoverflow.com/a/5983338 for the FOUC test fix -->

<body onload="document.body.style.visibility=`visible`;">
    <script>
        document.body.style.visibility = `hidden`;
    </script>

    <main-content>
    </main-content>
</body>

</html>