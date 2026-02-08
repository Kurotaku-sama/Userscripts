// ==UserScript==
// @name            Autoreload Streams
// @namespace       https://kurotaku.de
// @version         1.0.2
// @description     Auto reloads the page after a certain amount of time has passed to prevent stream freezing/crashing
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @include         https://www.twitch.tv/*
// @include         https://kick.com/*
// @include         https://trovo.live/*
// @include         https://dlive.tv/*
// @icon            https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Autoreload_Streams/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Autoreload_Streams/script.user.js
// @require         https://cdn.jsdelivr.net/gh/Kurotaku-sama/Userscripts@main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==


const STREAM_INDICATORS = {
    twitch: ['#live-channel-stream-information', '.channel-info-content'],
    kick: '#channel-content',
    trovo: '#live-info',
    dlive: '#livestream-info',
};

(async function() {
    await init_gm_config();

    await sleep_s(5);  // Delay to make sure page is loaded
    await check_and_reload();
})();

async function init_gm_config() {
    const config_id = "configuration_autoreload_streams";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Autoreload Streams',
        fields: {
            autoreload_twitch_enabled: {
                section: ['Autoreload Site Configuration'],
                type: 'checkbox',
                default: false,
                label: 'Autoreload all Twitch streams',
            },
            autoreload_kick_enabled: {
                type: 'checkbox',
                default: false,
                label: 'Autoreload all Kick streams',
            },
            autoreload_trovo_enabled: {
                type: 'checkbox',
                default: false,
                label: 'Autoreload all Trovo streams',
            },
            autoreload_dlive_enabled: {
                type: 'checkbox',
                default: false,
                label: 'Autoreload all DLive streams',
            },
            autoreload_twitch_time: {
                type: 'int',
                default: 30,
                min: 5,
                max: 1440,
                label: 'Twitch reload time (minutes)',
            },
            autoreload_kick_time: {
                type: 'int',
                default: 30,
                min: 5,
                max: 1440,
                label: 'Kick reload time (minutes)',
            },
            autoreload_trovo_time: {
                type: 'int',
                default: 30,
                min: 5,
                max: 1440,
                label: 'Trovo reload time (minutes)',
            },
            autoreload_dlive_time: {
                type: 'int',
                default: 30,
                min: 5,
                max: 1440,
                label: 'DLive reload time (minutes)',
            },
            streamer_settings: {
                section: ['Individual Streamer Configuration'],
                type: 'textarea',
                default: `hitsquadgodfather; true; 30
thegiftingchannel; true; 30
staggerrilla; true; 30
somekickstreamer; true; 20; kick
sometrovostreamer; true; 25; trovo
multistreamer; true; 15; twitch|trovo`,
                label: get_summary_html(),
            },
        },
        events: {
            save: () => { location.reload(); },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

function get_summary_html() {
    return `
<details style="margin-top:10px">
    <summary>How to use: (click me)</summary>
    <ul>
        <li>Format: <code>streamername; true/false; time_in_minutes; [optional: sites]</code></li>
        <li>Example: <code>hitsquadgodfather; true; 30</code></li>
        <li>Example with site restriction: <code>somekickstreamer; true; 20; kick</code></li>
        <li>Multiple sites: <code>multistreamer; true; 15; twitch|trovo</code></li>
        <li>Supported sites: <b>twitch</b>, <b>kick</b>, <b>trovo</b></li>
        <li>If you don't use the site value, the setting applies to <b>all</b> supported sites.</li>
        <li>One streamer per line</li>
        <li>"true" = autoreload enabled, "false" = disabled</li>
        <li>Time is given in minutes before reload</li>
        <li>Site restriction: use <code>|</code> to separate multiple sites (e.g. <code>kick|trovo</code>)</li>
    </ul>
</details>`;
}

async function check_and_reload() {
    const loc = location.href.toLowerCase(); // Current page URL in lowercase

    // Determine global/fallback autoreload settings for current site
    let global_enabled = false;
    let global_time = 60; // will only be used if no streamer matches
    let current_platform = '';

    switch(true) {
        case location.hostname.includes("twitch.tv"):
            global_enabled = GM_config.get("autoreload_twitch_enabled");
            global_time = GM_config.get("autoreload_twitch_time");
            current_platform = 'twitch';
            break;
        case location.hostname.includes("kick.com"):
            global_enabled = GM_config.get("autoreload_kick_enabled");
            global_time = GM_config.get("autoreload_kick_time");
            current_platform = 'kick';
            break;
        case location.hostname.includes("trovo.live"):
            global_enabled = GM_config.get("autoreload_trovo_enabled");
            global_time = GM_config.get("autoreload_trovo_time");
            current_platform = 'trovo';
            break;
        case location.hostname.includes("dlive.tv"):
            global_enabled = GM_config.get("autoreload_dlive_enabled");
            global_time = GM_config.get("autoreload_dlive_time");
            current_platform = 'dlive';
            break;
    }

    // Check streamer-specific settings and get reload_time if any match
    let reload_time = await process_streamers(loc, current_platform);

    // If no streamer matches but global autoreload is enabled, use global_time
    if(!reload_time && global_enabled)
        reload_time = global_time;

    // Perform reload if we have a reload_time
    if(reload_time) {
        log_reload(reload_time);
        await sleep_m(reload_time);

        // Abort if URL changed
        if(location.href.toLowerCase() !== loc) {
            console.log(`[Autoreload Streams] URL changed, aborting reload. Old: "${loc}", New: "${location.href.toLowerCase()}"`);
            return;
        }

        location.reload();
    }
}

// Process individual streamer settings and return reload_time if any streamer matches
async function process_streamers(loc, platform) {
    // Get the streamer configuration from GM_config
    const raw = GM_config.get("streamer_settings");
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0); // clean empty lines

    // Loop through each line in the config
    for (const line of lines)
        try {
            // Split line into parts: streamername; enabled; time; [optional sites]
            const parts = line.split(";").map(x => x.trim().toLowerCase());

            // Validate number of parts (must be 3 or 4)
            if(parts.length < 3 || parts.length > 4) throw `Invalid number of parts (${parts.length})`;

            const name = parts[0];                    // Streamer/channel name
            const enabled = parts[1];                 // "true" or "false"
            const streamer_time = parseInt(parts[2]); // Time in minutes before reload
            const sites = parts[3] ? parts[3].split("|").map(s => s.trim()) : null; // Optional site restriction

            // Validate streamer name
            if(!name) throw `Invalid streamer name`;

            // Validate enabled field
            if(enabled !== "true" && enabled !== "false") throw `Invalid enabled value "${enabled}"`;

            // Skip disabled streamers (still handled in catch for logging)
            if(enabled !== "true") continue;

            // Validate streamer reload time
            if(isNaN(streamer_time) || streamer_time <= 0) throw `Invalid reload time "${parts[2]}"`;

            // Validate sites if provided
            if (sites && !sites.every(s => Object.keys(STREAM_INDICATORS).includes(s)))
                throw `Invalid site(s) "${parts[3]}"`;

            // Check if current platform matches streamer sites or no site restriction
            if(!sites || sites.includes(platform)) {
                // Skip if current page URL doesn't match streamer
                if(!is_streamer_page(loc, platform, name)) continue;

                // Skip if streamer not live
                if(!has_live_indicator(platform)) continue;

                // Everything is valid
                return streamer_time;
            }

        } catch(err) {
            // Catch all validation errors and log them along with the faulty line
            console.warn(`[Autoreload Streams] ${err} | Line: "${line}"`);
        }

    return null;
}

// Check if current page matches the streamer (exact match, not substring)
function is_streamer_page(loc, platform, name) {
    name = name.toLowerCase();
    let channel = null;

    switch(platform) {
        case 'twitch': {
            const match = loc.match(/^https?:\/\/(?:www\.)?twitch\.tv\/([^/?#]+)/);
            channel = match ? match[1].toLowerCase() : null;
            break;
        }
        case 'kick': {
            const match = loc.match(/^https?:\/\/(?:www\.)?kick\.com\/([^/?#]+)/);
            channel = match ? match[1].toLowerCase() : null;
            break;
        }
        case 'trovo': {
            const match = loc.match(/^https?:\/\/(?:www\.)?trovo\.live\/s\/([^/?#]+)/);
            channel = match ? match[1].toLowerCase() : null;
            break;
        }
        case 'dlive': {
            const match = loc.match(/^https?:\/\/(?:www\.)?dlive\.tv\/([^/?#]+)/);
            channel = match ? match[1].toLowerCase() : null;
            break;
        }
    }

    return channel === name;
}

// Check if the current page contains a live indicator for the platform
function has_live_indicator(platform) {
    const selector = STREAM_INDICATORS[platform];
    if(!selector)
        return false;
    if(Array.isArray(selector))
        return selector.some(s => document.querySelector(s));
    return !!document.querySelector(selector);
}

// Utility logger for autoreload
function log_reload(minutes) {
    const now = new Date();
    const future = new Date(now.getTime() + minutes * 60000); // Add minutes in ms

    const hh = String(future.getHours()).padStart(2, '0');
    const mm = String(future.getMinutes()).padStart(2, '0');

    const msg = `[Autoreload Streams] Reloading in ${minutes} minutes at ${hh}:${mm}`;
    console.log(msg);
}