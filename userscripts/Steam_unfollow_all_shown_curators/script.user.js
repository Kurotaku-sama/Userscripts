// ==UserScript==
// @name            Steam unfollow all shown curators
// @name:de         Steam entfolge allen geladenen Kuratoren
// @namespace       https://kurotaku.de
// @version         1.1.2
// @description     This script adds two buttons: one scrolls down and loads all curators, the other unfollows all currently shown curators.
// @description:de  Dieses Skript fügt zwei Buttons hinzu: Einer scrollt nach unten und lädt alle Kuratoren, der andere entfolgt allen derzeit angezeigten Kuratoren.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://store.steampowered.com/curators/mycurators*
// @icon            https://steamcommunity.com/favicon.ico
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_unfollow_all_shown_curators/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_unfollow_all_shown_curators/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==

(function() {
    let button_unfollow_template = "<a class='k-unfollow-curators btn_green_steamui btn_medium {id_class}'><span>Unfollow all loaded curators</span></a>";
    let button_load_all_curators = "<a class='k-load-all-curators btn_green_steamui btn_medium' style='margin-left:20px;'><span>Load all curators</span></a>";

    // Upper button in Navigation Bar
    wait_for_element(".navigation_bar").then(element => {
        let upper_button_html = button_unfollow_template.replace("{id_class}", "k-unfollow-button-upper");
        element.insertAdjacentHTML("afterend", upper_button_html + button_load_all_curators);

        // Set event listener directly on the new button
        document.querySelector(".k-unfollow-button-upper").addEventListener("click", unfollow_curators);
        document.querySelector(".k-load-all-curators").addEventListener("click", check_all_curators_loaded);
    });

    // Lower button in Page Content
    wait_for_element(".page_content_ctn .page_content").then(element => {
        let lower_button_html = button_unfollow_template.replace("{id_class}", "k-unfollow-button-lower");
        element.insertAdjacentHTML("beforeend", lower_button_html);

        // Set event listener directly on the new button
        document.querySelector(".k-unfollow-button-lower").addEventListener("click", unfollow_curators);
    });
})();


async function unfollow_curators() {
    toggle_buttons(false);
    let elements = document.querySelectorAll(".following_button");
    let total = elements.length;
    let progress = 0;

    if(elements.length > 0)
        Swal.fire({
            title: "Unfollowing curators...",
            html: `<progress value="${progress}" max="${total}"></progress><br>${progress}/${total}`,
            icon: "info",
            theme: "dark",
            backdrop: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

    for(let i = 0; i < elements.length; i++) {
        await sleep_s(1);
        elements[i].click();
        progress++;
        Swal.update({
            html: `<progress value="${progress}" max="${total}"></progress><br>${progress}/${total}`
        });
    }

    if(elements.length > 0)
        Swal.fire({
            title: "Unfollowed all shown curators",
            text: `${elements.length} curators have been unfollowed.`,
            icon: "success",
            theme: "dark",
            backdrop: true
        });

    toggle_buttons(true);
}

function check_all_curators_loaded() {
    toggle_buttons(false); // Disable buttons

    let previous_count = 0;
    let current_count = 0;
    let retries = 0;
    let scroll_delay = 2; // Delay between checks in seconds
    const max_retries = 2; // Max retries if the count doesn't change

    window.scrollTo(0, document.body.scrollHeight);
    const check_interval = setInterval(async () => {
        // Scroll to the bottom of the page to trigger loading more curators
        window.scrollTo(0, document.body.scrollHeight);

        // Count the current number of curator elements
        current_count = document.querySelectorAll(".curator_recommendation_capsule").length;

        // Check if the count has changed
        if (current_count === previous_count) {
            retries++;
            if (retries >= max_retries) {
                let curator_count = document.querySelectorAll(".following_button")?.length;
                clearInterval(check_interval); // Stop the interval
                Swal.fire({
                    title: "All curators loaded",
                    text: `${curator_count} curators have been loaded, you can now click the "Unfollow all loaded curators" button.`,
                    icon: "success",
                    theme: "dark",
                    backdrop: false
                });
                toggle_buttons(true); // Re-enable buttons
                return;
            } else
                await sleep_s(2); // Wait 2 seconds before retrying
        } else {
            // Count has changed, continue checking
            previous_count = current_count;
            retries = 0; // Reset retries
        }
    }, scroll_delay * 1000); // Convert delay to milliseconds
}

function toggle_buttons(enable) {
    const buttons = document.querySelectorAll(".k-unfollow-curators, .k-load-all-curators");
    switch (enable) {
        case true:
            // Enable buttons
            buttons.forEach(button => {
                button.style.pointerEvents = "auto"; // Allow clicks
                button.style.opacity = "1"; // Reset opacity
                button.style.cursor = "pointer"; // Show pointer cursor
            });
            break;

        case false:
            // Disable buttons
            buttons.forEach(button => {
                button.style.pointerEvents = "none"; // Block clicks
                button.style.opacity = "0.5"; // Dim opacity for visual feedback
                button.style.cursor = "not-allowed"; // Show disabled cursor
            });
            break;

        default:
            console.error("Invalid parameter. Use `true` to enable or `false` to disable buttons.");
            break;
    }
}