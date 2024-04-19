<!DOCTYPE html>

<html lang="en">

<head>
    <title>Home -- Syl.red</title>
    <meta charset="UTF-8">
    <meta name="author" content="Code-Syl" />
    <meta name="description" content="Portfolio and website of Code-Syl" />
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="/styles/common.css" type="text/css" media="screen" />
    <script src="/components/main-content/main-content.component.js" type="module" defer></script>
    <script src="/components/under-construction/under-construction.component.js" type="module" defer></script>
    <script src="/components/nav-bar/nav-bar.component.js" type="module" defer></script>
</head>

<!-- thanks to https://stackoverflow.com/a/5983338 for the FOUC test fix -->

<body onload="document.body.style.visibility=`visible`;">
    <script>
        document.body.style.visibility = `hidden`;
    </script>

    <main-content>
        <under-construction></under-construction>
    </main-content>
</body>

</html>