// ==UserScript==
// @name            Twitch Channel Points Bonus Collector
// @namespace       https://kurotaku.de
// @version         1.1.1
// @description     Automatically collects Twitch channel points bonuses with whitelist and blacklist support
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.twitch.tv/*
// @icon            https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Twitch_Channel_Points_Bonus_Collector/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Twitch_Channel_Points_Bonus_Collector/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==

(async function() {
    await init_gm_config();

    if(GM_config.get("script_enabled")) { // Check if the script is disabled in config
        if (!is_channel_allowed()) {
            console.log("[Bonus Collector] Skipped due to whitelist/blacklist settings.");
            return;
        }

        collect_point_bonus();
    }
})();

async function collect_point_bonus() {
    while(true) {
        const bonus_icon = await wait_for_element(".claimable-bonus__icon")
        bonus_icon.click()
        const now = new Date().toLocaleTimeString()
        print(`[Bonus Collector] Bonus claimed at ${now}!`)
        await sleep_s(10)
    }
}

async function init_gm_config() {
    GM_registerMenuCommand('Settings', () => GM_config.open());
    GM_config.init({
        id: 'configuration_twitch_bonus_collector',
        title: 'Twitch Bonus Collector Config',
        fields: {
            script_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable/Disable the script',
            },
            enable_whitelist: {
                type: 'checkbox',
                default: false,
                label: 'Enable whitelist',
            },
            whitelist: {
                label: `<b>Whitelist (one channel per line)</b><br>If whitelist is enabled, <b>only these channels</b> will be active.`,
                type: 'textarea',
            },
            enable_blacklist: {
                type: 'checkbox',
                default: false,
                label: 'Enable blacklist',
            },
            blacklist: {
                label: `<b>Blacklist (one channel per line)</b><br>If whitelist is enabled, blacklist will be ignored.`,
                type: 'textarea',
            },
        },
        events: {
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

function is_channel_allowed() {
    // Split the URL path into segments and remove empty strings
    const path = window.location.pathname.split("/").filter(Boolean);
    if (path.length === 0) return false; // No channel in path, disallow

    // Take the first path segment as the channel name and convert to lowercase
    const channel = path[0].toLowerCase();

    // Retrieve whitelist/blacklist settings from GM_config
    const enable_whitelist = GM_config.get("enable_whitelist");
    const enable_blacklist = GM_config.get("enable_blacklist");

    const whitelist_raw = GM_config.get("whitelist") || "";
    const blacklist_raw = GM_config.get("blacklist") || "";

    // Normalize whitelist/blacklist: trim spaces, lowercase, remove empty lines
    const whitelist = whitelist_raw.split("\n").map(x => x.trim().toLowerCase()).filter(x => x.length > 0);
    const blacklist = blacklist_raw.split("\n").map(x => x.trim().toLowerCase()).filter(x => x.length > 0);

    // Whitelist has priority: if enabled and not empty, only allow channels in the list
    if (enable_whitelist && whitelist.length > 0)
        return whitelist.includes(channel);

    // Blacklist check: if enabled, disallow channels in the list (only if whitelist is off)
    if (enable_blacklist && blacklist.includes(channel))
        return false;

    return true; // Default: allow channel if no whitelist/blacklist rules apply
}