// ==UserScript==
// @name         Twitch Channel Points Bonus Collector
// @namespace    https://kurotaku.de
// @version      0.9
// @description  Automatically collects Twitch channel points bonuses
// @author       Kurotaku
// @license      CC BY-NC-SA 4.0
// @match        https://www.twitch.tv/*
// @icon         https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png
// @updateURL    https://github.com/Kurotaku-sama/Userscripts/raw/main/Twitch Channel Points Bonus Collector/script.user.js
// @downloadURL  https://github.com/Kurotaku-sama/Userscripts/raw/main/Twitch Channel Points Bonus Collector/script.user.js
// @require      https://gist.github.com/Kurotaku-sama/1a7dcb227ce3d7a1b596afe725c0052a/raw/kuros_library.js
// @require      https://cdn.jsdelivr.net/npm/sweetalert2
// @grant        GM_registerMenuCommand
// ==/UserScript==


(async function() {
    collect_point_bonus();
})();

async function collect_point_bonus() {
    wait_for_element(".claimable-bonus__icon").then(async bonus_icon => {
        bonus_icon.click()
        await sleep_m(5)
        collect_point_bonus()
    })
}