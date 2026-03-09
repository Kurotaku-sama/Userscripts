// ==UserScript==
// @name            SteamDB Free Packages Claimer
// @namespace       https://kurotaku.de
// @version         1.0
// @description     Automatically claims free packages on SteamDB with configurable filters and duplicate tab detection.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://steamdb.info/*
// @icon            https://steamdb.info/static/logos/vector_prefers_schema.svg
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/SteamDB_Free_Packages_Claimer/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/SteamDB_Free_Packages_Claimer/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==

(async function() {
    await init_gm_config();

    // Verify current URL to ensure the script only executes on the specific free packages subpage
    if (window.location.pathname !== '/freepackages/') return;

    // Verify if the param is included (if set)
    if(!check_required_param()) return;

    // Execute cross-tab communication check to prevent multiple instances from running simultaneously
    await check_for_duplicate_tab();

    // Retrieve the user-defined startup delay from the configuration
    const initial_wait = GM_config.get('wait_after_init');
    print(`[SteamDB-FPC] Waiting ${initial_wait}s after init...`);
    await sleep_s(initial_wait); // Pause execution to allow the page to settle

    // Ensure the user is actually authenticated on SteamDB before proceeding
    if (!await check_if_signed_in()) return;

    // Perform an initial scan to see if there are any packages available for claiming
    if (await check_if_nothing_to_claim()) return;

    // Check if the current page filter matches the user's preferred filter (e.g., 'games only')
    await apply_filter();

    // Re-verify availability after filtering, as the list might now be empty
    if (await check_if_nothing_to_claim()) return;

    // All checks passed; trigger the activation process
    if (await start_claiming()) {
        // Wait for the process to finish and get status
        const is_success = await wait_for_completion();

        // If enabled, exclude packages that failed during the process
        if (GM_config.get('auto_exclude_failed')) await exclude_failed_packages();

        // Handle the final tab exit based on success/error
        await handle_exit(is_success);
    }
})();

async function init_gm_config() {
    const config_id = "configuration_steamdb_claimer";
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'SteamDB Free Packages Claimer',
        fields: {
            preferred_filter: {
                section: ['General Settings'],
                label: 'Default Filter',
                type: 'select',
                options: ['all', 'owned', 'all-no-demos', 'games', 'demos', 'others'],
                default: 'all',
            },
            required_url_parameter: {
                label: 'Requir URL Parameter to start (optional)<br>For example "autoclaim"<br>Script only runs if the URL includes the param (e.g. "https://steamdb.info/freepackages/?autoclaim")',
                type: 'text',
                default: '',
            },
            wait_after_init: {
                label: 'Wait after Start (5-60 sec)',
                type: 'int',
                min: 3,
                max: 60,
                default: 10,
            },
            wait_after_filter: {
                label: 'Wait after Filter change (5-60 sec)',
                type: 'int',
                min: 3,
                max: 60,
                default: 10,
            },
            auto_close_empty: {
                label: 'Auto-close tab if nothing to claim',
                type: 'checkbox',
                default: true,
            },
            auto_exclude_failed: {
                label: 'Auto-exclude failed packages',
                type: 'checkbox',
                default: true,
            },
            close_mode_success: {
                section: ['Automation - On Success'],
                label: 'Success Close Tab Action',
                type: 'select',
                options: ['Disabled', 'Instant', 'Time'],
                default: 'Time',
            },
            close_time_success: {
                label: 'Wait time on Success (1-60 sec, only when Time is selected)',
                type: 'int',
                min: 1,
                max: 60,
                default: 5,
            },
            close_mode_error: {
                section: ['Automation - On Error'],
                label: 'Error Close Tab Action',
                type: 'select',
                options: ['Disabled', 'Instant', 'Time'],
                default: 'Time',
            },
            close_time_error: {
                label: 'Wait time on Error (1-60 sec, only when Time is selected)',
                type: 'int',
                min: 1,
                max: 60,
                default: 30,
            }
        },
        events: {
            save: () => { location.reload(); }
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

async function check_if_signed_in() {
    // If this link exists, the user is not logged in
    const signed_in = document.querySelector("header a.header-login") === null;

    if (!signed_in) {
        print("[SteamDB-FPC] ERROR: You are not logged in! Script stopping.");
        await sleep_s(5);
        window.close();
        return false;
    }

    return true;
}

function check_required_param() {
    const required_param = GM_config.get('required_url_parameter').trim();
    if (required_param !== "") {
        const url_params = new URLSearchParams(window.location.search);
        if (!url_params.has(required_param)) {
            print(`[SteamDB-FPC] Required parameter "${required_param}" not found in URL. Script stopped.`);
            return false;
        }
        print(`[SteamDB-FPC] Parameter "${required_param}" detected. Starting automation...`);
    }
    return true;
}

async function check_for_duplicate_tab() {
    return new Promise((resolve) => {
        // Use a descriptive channel name for SteamDB free packages
        const channel = new BroadcastChannel('steamdb_freepackages_claimer');
        const instance_id = Math.random().toString(36).substring(7); // Unique ID for this specific tab
        let duplicate_detected = false;

        channel.onmessage = async (event) => {
            // Destructure message for easier access
            const { msg, id } = event.data;
            if (id === instance_id) return; // Ignore our own messages

            switch (msg) {
                case 'check_for_active_instance':
                    // If another tab asks, confirm we are active
                    channel.postMessage({ msg: 'freepackages_active', id: instance_id });
                    break;

                case 'freepackages_active':
                    // If we get a response, a duplicate exists
                    duplicate_detected = true;
                    channel.close();

                    if (typeof Swal !== 'undefined') {
                        await Swal.fire({
                            title: 'Duplicate Detected',
                            text: 'Another SteamDB Claimer tab is already active. Stopping this one...',
                            icon: 'warning',
                            timer: 3000,
                            backdrop: true,
                            theme: "dark",
                            showConfirmButton: false,
                        });
                        await sleep_s(3);
                    }

                    window.close();
                    // Resolve true so the main script knows to stop, even if window.close() fails
                    resolve(true);
                    break;
            }
        };

        // Broadcast a message to see if any other tab already has the script running
        channel.postMessage({ msg: 'check_for_active_instance', id: instance_id });

        // Wait 1000ms for responses; if none come, we are the primary tab
        setTimeout(() => {
            if (!duplicate_detected) resolve(false);
        }, 1000);
    });
}

async function check_if_nothing_to_claim() {
    // Wait for the loading container to appear
    const loading_box = await wait_for_element("#loading");

    // Check if the empty-state message is present in the container
    if (loading_box.innerText.includes("There are no free packages remaining for you.")) {
        print("[SteamDB-FPC] Nothing to claim.");
        // Close the tab if the specific auto-close setting is enabled
        if (GM_config.get("auto_close_empty"))
            window.close();
        return true;
    }
    return false;
}

async function apply_filter() {
    // Retrieve the user-defined filter from settings
    const target = GM_config.get("preferred_filter");
    const container = document.querySelector(".app-history-filters");

    // If filter container is missing, assume we can proceed
    if (!container) return true;

    // Check if the current active button already matches our target filter
    const active_btn = container.querySelector(".btn-info");
    if (active_btn?.getAttribute("data-filter") === target) return true;

    // Find and click the target filter button if it's not already active
    const target_btn = container.querySelector(`.js-filter[data-filter="${target}"]`);
    if (target_btn) {
        target_btn.click();

        // If the filter was just changed, we need to wait for the page content to update
        const filter_wait = GM_config.get('wait_after_filter');
        print(`[SteamDB-FPC] Filter mismatch, waiting ${filter_wait}s for update...`);
        await sleep_s(filter_wait);

        return false; // Return false to indicate that a refresh happened
    }

    return true;
}

async function start_claiming() {
    const timeout = 60; // Timeout duration in seconds
    print(`[SteamDB-FPC] Searching for activation button (Timeout: ${timeout}s)...`);

    // Race between your wait_for_element and a timeout timer
    const start_button = await Promise.race([
        wait_for_element("#js-activate-now"),
        new Promise(resolve => setTimeout(() => resolve(null), timeout * 1000))
    ]);

    // If the timeout won the race, start_button will be null
    if (!start_button) {
        print(`[SteamDB-FPC] ERROR: Activation button not found within ${timeout}s. Closing tab...`);

        if (typeof Swal !== 'undefined')
            await Swal.fire({
                title: 'Timeout',
                text: `The activation button did not appear within ${timeout} seconds. Closing tab...`,
                icon: 'error',
                timer: 5000,
                backdrop: true,
                theme: "dark",
                showConfirmButton: false
            });

        window.close();
        return false;
    }

    // If the button exists but is disabled (e.g., already claimed or Steam error)
    if (start_button.classList.contains("disabled") || start_button.hasAttribute("disabled")) {
        print("[SteamDB-FPC] Button found, but it is currently disabled. Closing tab...");
        window.close();
        return false;
    }

    // If we reached this point, the button is found and clickable
    print("[SteamDB-FPC] Button found. Starting activation...");
    start_button.click();

    // Start monitoring the progress
    return true;
}

async function wait_for_completion() {
    // Wait for any h4 status message to appear in the loading container
    const status_element = await wait_for_element("#loading h4");
    const status_text = status_element.innerText;

    // Check if the process finished successfully
    const is_success = status_text.includes("Script finished.");
    print(`[SteamDB-FPC] Process finished. Success: ${is_success}`);

    return is_success;
}

async function exclude_failed_packages() {
    print("[SteamDB-FPC] Scanning for failed packages to exclude...");

    // List of error messages that trigger an automatic exclusion
    const failure_messages = [
        "You do not own the required app",
        "Steam says this is an invalid package",
        "There was a problem adding this product to your account"
    ];

    // Select all status rows within the loading container
    const rows = document.querySelectorAll("#loading .tabular-nums");
    let excluded_count = 0;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();

        // Check if the current row contains any of the failure messages
        const should_exclude = failure_messages.some(msg => text.includes(msg.toLowerCase()));

        if (should_exclude) {
            const btn_exclude = row.querySelector(".js-remove");
            if (btn_exclude) {
                // Trigger the [Ignore] button click
                btn_exclude.click();
                excluded_count++;

                // Visual feedback: dim and strike through the processed row
                row.style.opacity = "0.5";
                row.style.textDecoration = "line-through";
            }
        }
    });

    if (excluded_count > 0)
        print(`[SteamDB-FPC] Automatically excluded ${excluded_count} failed packages.`);

    // Small delay to ensure SteamDB processes the exclusion requests before tab closes
    await sleep_s(2);
}

async function handle_exit(is_success) {
    // Wait for the final status message to be sure
    const status_element = document.querySelector("#loading h4");
    const status_text = status_element ? status_element.innerText : "Unknown state";

    // Determine the action and wait time based on whether it was a success or an error
    const mode = is_success ? GM_config.get('close_mode_success') : GM_config.get('close_mode_error');
    const wait_time = is_success ? GM_config.get('close_time_success') : GM_config.get('close_time_error');

    print(`[SteamDB-FPC] Exit status: "${status_text}"`);

    switch (mode) {
        case 'Disabled':
            print("[SteamDB-FPC] Auto-close is disabled for this state.");
            break;

        case 'Instant':
            window.close();
            break;

        case 'Time':
            print(`[SteamDB-FPC] Closing in ${wait_time}s...`);
            await sleep_s(wait_time);
            window.close();
            break;
    }
}