<!DOCTYPE html>

<html lang="en">

<head>
    <title>SWC -- Syl.red</title>
    <meta charset="UTF-8">
    <meta name="author" content="Code-Syl" />
    <meta name="description" content="Everything related to the browser game Star Wars Combine, by Code-Syl" />
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="/styles/common.css" type="text/css" media="screen" />
    <script src="/components/main-content/main-content.component.js" type="module" defer></script>
    <script src="/components/nav-bar/nav-bar.component.js" type="module" defer></script>
    <script src="/components/swc/swc-menu-item/swc-menu-item.component.js" type="module" defer></script>
</head>

<!-- thanks to https://stackoverflow.com/a/5983338 for the FOUC test fix -->

<body onload="document.body.style.visibility=`visible`;">
    <script>
        document.body.style.visibility = `hidden`;
    </script>

    <main-content>
        <h1 id="top">
            S<span class="grey-header">tar</span>
            W<span class="grey-header">ars</span>
            C<span class="grey-header">ombine</span>
        </h1>

        <div class="horizontal-ulist">
            <ul>
                <li><a href="#characters">Characters</a></li>
                <li id="dot">&middot;</li>
                <li><a href="#tools">Tools</a></li>
            </ul>
        </div>

        <p class="justified-text">
            The Star Wars Combine is a browser-based MMO that was released
            around December 1998. Now, of course given my age, I did not start
            playing this game at that time. According to my profile, I joined
            the Combine around March 2020. I can thank Arturia Paorach for
            dragging me into this mess.
            This weird little Star Wars-themed corner of the internet did keep
            me entertained, with its roleplay, politics, and the occasional
            drama. I have also met some interesting people, to say the least.
        </p>

        <p class="justified-text">
            During my time in the Combine, I have made a few characters, as
            well as a few tools to help me in my journeys. I want to dedicate
            this page to those characters and tools. Having said that, this
            page will be a constant <i>work in progress</i>.
        </p>

        <h2 id="characters"><a href="#top">Characters</a></h2>

        <div class="row">
            <a href="http://holocron.swcombine.com/wiki/Alani_Myrtel" target="_blank">
                <swc-menu-item>
                    <img slot="image" src="/assets/swc-alani-myrtel-banner.jpg" alt="Alani Myrtel" />
                    <span slot="title">Alani Myrtel</span>
                </swc-menu-item>
            </a>
            <a href="http://holocron.swcombine.com/wiki/Niera_Crukx" target="_blank">
                <swc-menu-item>
                    <img slot="image" src="/assets/swc-niera-crukx-banner.jpg" alt="Niera Crukx" />
                    <span slot="title">Niera Crukx</span>
                </swc-menu-item>
            </a>
        </div>

        <h2 id="tools"><a href="#top">Tools</a></h2>

        <div class="row">
            <a href="/swc/swc-vision-simulator/">
                <swc-menu-item>
                    <img slot="image" src="/assets/swc-vision-simulator-menu-banner.jpg" alt="Vision Simulator" />
                    <span slot="title">Vision Simulator</span>
                </swc-menu-item>
            </a>
        </div>
    </main-content>
</body>

</html>