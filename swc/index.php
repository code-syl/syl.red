<!DOCTYPE html>

<html lang="en">

<head>
    <title>SWC Tools by Code-Syl</title>
    <meta charset="UTF-8">
    <meta name="author" content="Code-Syl" />
    <meta name="description" content="Tools for the browser game Star Wars Combine, by Code-Syl" />
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="/styles/common.css" type="text/css" media="screen" />
    <script src="/components/main-content/main-content.component.js" type="module" name="main-content" defer></script>
    <script src="/components/nav-bar/nav-bar.component.js" type="module" name="nav-bar" defer></script>
    <script src="/components/swc/swc-menu-item/swc-menu-item.component.js" type="module" name="swc-menu-item" defer></script>
</head>

<!-- thanks to https://stackoverflow.com/a/5983338 for the FOUC test fix -->

<body onload="document.body.style.visibility=`visible`;">
    <script>
        document.body.style.visibility = `hidden`;
    </script>

    <main-content>
        <h1>
            S<span class="grey-header">tar</span>
            W<span class="grey-header">ars</span>
            C<span class="grey-header">ombine</span>
        </h1>
        <div class="row">
            <swc-menu-item>
                <span slot="title">Character</span>
            </swc-menu-item>
            <swc-menu-item></swc-menu-item>
            <swc-menu-item></swc-menu-item>
        </div>
    </main-content>
</body>

</html>