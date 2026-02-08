// ==UserScript==
// @name            z0r Controls
// @namespace       https://kurotaku.de
// @version         1.1
// @description     Use A & D or Left & Right arrows to navigate posts. Press Space to open comments. Press R for a random post
// @description:de  Mit A & D oder den Pfeiltasten Links & Rechts durch Beiträge navigieren. Mit Leertaste Kommentare öffnen. Mit R Zufallsbeitrag öffnen
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://z0r.de/*
// @icon            https://www.google.com/s2/favicons?domain=z0r.de
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/z0r_Controls/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/z0r_Controls/script.user.js
// @require         https://cdn.jsdelivr.net/gh/Kurotaku-sama/Userscripts@main/libraries/kuros_library.js
// @require         cdn.jsdelivr.net/npm/sweetalert2@11
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==

let disqus_open = false; // Flag to prevent multiple openings of the Disqus section
let unten; // Navigation container, will be set after element is loaded

(async function() {
    // Wait for the #unten element to exist in the DOM
    unten = await wait_for_element("#unten");

    // Set the keydown listener after #unten is ready
    document.onkeydown = check_key;
})();

function check_key(e) {
    e = e || window.event
    let kc = e.keyCode

    switch(kc) {
        case 37: // Left arrow
        case 65: // 'A'
            trigger_prev()
            break
        case 39: // Right arrow
        case 68: // 'D'
            trigger_next()
            break
        case 82: // 'R'
            trigger_random()
            break
        case 32: // Space
            trigger_disqus()
            break
    }
}

// Function to trigger previous post
function trigger_prev() {
    unten.getElementsByTagName("a")[0].click();
}

// Function to trigger random post
function trigger_random() {
    unten.getElementsByTagName("a")[1].click();
}

// Function to trigger next post
function trigger_next() {
    unten.getElementsByTagName("a")[2].click();
}

// Function to open Disqus comments
function trigger_disqus() {
    if (!disqus_open) {
        disqus_open = true;
        document.getElementById("disqus_button").click();
    }
}