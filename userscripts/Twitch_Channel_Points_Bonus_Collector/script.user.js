// ==UserScript==
// @name            Twitch Channel Points Bonus Collector
// @namespace       https://kurotaku.de
// @version         1.1.2
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

let global_abort_controller = null;
let last_title_text = "";
let last_active_channel = "";

(async function() {
    await init_gm_config();
    await wait_for_gm_config();

    // Small delay to ensure the DOM is ready for initial check
    await sleep_s(3);

    // Initial check on page load
    handle_navigation_change();

    // Use wait_for_element to ensure the <title> tag is available before observing
    const title_element = await wait_for_element('title');
    if (title_element) {
        const title_observer = new MutationObserver(handle_navigation_change);
        title_observer.observe(title_element, { childList: true });
    }
})();

function init_gm_config() {
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
            save: () => location.reload(),
        },
        frame: create_configuration_container(),
    });
}

/**
 * Handles logic when the user navigates between channels or pages.
 * Triggers on every title change observed by the MutationObserver.
 */
function handle_navigation_change() {
    const current_title = document.title;

    // A: Check if the title text actually changed to prevent redundant executions
    if (current_title === last_title_text) return;
    last_title_text = current_title;

    // Stop the loop of the previous channel immediately
    stop_active_collector();

    // Validation Part 1: Ensure we are on a standard Twitch page containing " - Twitch"
    const is_twitch_page = current_title.includes(" - Twitch");

    // Validation Part 2: Ensure .channel-root exists.
    // This distinguishes actual channel streams from categories (e.g., "Just Chatting") or homepages.
    const is_channel_view = document.querySelector('.channel-root') !== null;

    if (!is_twitch_page || !is_channel_view) return;

    // Check script state and filter permissions
    if (GM_config.get("script_enabled")) {
        const check = is_channel_allowed();

        // If not allowed, log the specific reason (Whitelist vs Blacklist)
        if (!check.allowed) {
            const reason_msg = check.reason === "blacklist" ? "Blacklist" : "Whitelist";
            print(`[Bonus Collector] Skipped due to ${reason_msg} settings.`);
            return;
        }

        // Extract channel name from the title string (e.g., "ChannelName - Twitch")
        const channel_name = current_title.split(" - ")[0];
        last_active_channel = channel_name;
        print(`[Bonus Collector] Started for channel: ${channel_name}`);

        // Create a new AbortController to manage the lifecycle of the async collection loop
        global_abort_controller = new AbortController();
        collect_point_bonus(global_abort_controller.signal);
    }
}

function stop_active_collector() {
    if (global_abort_controller) {
        // Cancel the current async loop
        global_abort_controller.abort();
        global_abort_controller = null;

        if (last_active_channel) {
            print(`[Bonus Collector] Stopped for channel: ${last_active_channel}`);
            last_active_channel = "";
        }
    }
}

function is_channel_allowed() {
    const path = window.location.pathname.split("/").filter(Boolean);
    if (path.length === 0) return { allowed: false, reason: "no_channel" };

    const channel = path[0].toLowerCase();
    const enable_whitelist = GM_config.get("enable_whitelist");
    const enable_blacklist = GM_config.get("enable_blacklist");

    const whitelist_raw = GM_config.get("whitelist") || "";
    const blacklist_raw = GM_config.get("blacklist") || "";

    const whitelist = whitelist_raw.split("\n").map(x => x.trim().toLowerCase()).filter(x => x.length > 0);
    const blacklist = blacklist_raw.split("\n").map(x => x.trim().toLowerCase()).filter(x => x.length > 0);

    // Whitelist check: If enabled and channel is missing, deny access
    if (enable_whitelist && whitelist.length > 0) {
        if (whitelist.includes(channel))
            return { allowed: true, reason: "whitelist" };

        return { allowed: false, reason: "whitelist" };
    }

    // Blacklist check: If enabled and channel is listed, deny access
    if (enable_blacklist && blacklist.includes(channel))
        return { allowed: false, reason: "blacklist" };

    return { allowed: true, reason: "none" };
}

async function collect_point_bonus(signal) {
    // Loop runs only as long as the signal is not aborted
    while(signal && !signal.aborted) {
        try {
            const bonus_icon = await wait_for_element(".claimable-bonus__icon");

            // Safety check: verify if we navigated away while waiting for the element
            if (signal.aborted) break;

            if (bonus_icon) {
                const now = new Date().toLocaleTimeString();
                bonus_icon.click();
                print(`[Bonus Collector] Bonus claimed at ${now}!`);
                // Wait 10 seconds to avoid spamming/double clicks
                await sleep_s(10);
            }
        } catch (error) {
            if (signal.aborted) break;
            await sleep_s(2);
        }
    }
}