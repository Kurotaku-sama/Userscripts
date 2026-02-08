// ==UserScript==
// @name            Genshin Impact Teyvat Interactive Map - Automate Mark Pins
// @name:de         Genshin Impact Teyvat Interactive Map - Automatisches setzen der Markierung
// @namespace       https://kurotaku.de
// @version         1.3.2
// @description     Adds an switch, if the switch is enabled and you click on a map marker, the script automatic clicks on the mark pin button
// @description:de  Fügt einen Schalter hinzu, wenn der Schalter aktiviert ist und Sie auf eine Kartenmarkierung klicken, klickt das Skript automatisch auf den Markierungsknopf
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @include         https://act.hoyolab.com/ys/app/interactive-map/index.html*
// @icon            https://act.hoyolab.com/ys/app/interactive-map/mapicon.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Genshin_Impact_Teyvat_Interactive_Map_-_Automate_mark_pins/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Genshin_Impact_Teyvat_Interactive_Map_-_Automate_mark_pins/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @grant           GM_unregisterMenuCommand
// @run-at          document-body
// ==/UserScript==

let menu_id = null; // Store the menu ID to update it later

(async function() {
    // Set the switch value if it's the first time running the script
    if (GM_getValue("one-click-mark-switch") === undefined)
        GM_setValue("one-click-mark-switch", false);

    // Wait till map is visible
    wait_for_element(".mhy-map-container").then(async () => {
        update_menu_command();
        mark_on_open();
        observe_panel_and_insert_button();
    });
})();

function insert_button() {
    // Check if the on-page switch already exists
    if(!document.getElementById("k-one_click_mark")) {
        // Create the HTML for the on-page switch button
        const one_click_mark_switch = `
            <div id="k-one_click_mark" class="waypoint-switch mhy-map__waypoint">
                <div class="waypoint-switch__text">Automate Mark Pins</div>
                <div class="waypoint-switch__pic ${GM_getValue("one-click-mark-switch") ? "waypoint-switch__pic--active" : ""}"></div>
            </div>
        `;

        // Insert the switch button right before the map guide container
        document.querySelector("#user-guide-underground-map").insertAdjacentHTML("beforebegin", one_click_mark_switch);

        // Attach click event to toggle the switch on the page
        document.querySelector("#k-one_click_mark").addEventListener("click", toggle_one_click_mark, false);

        // Wait until the filter panel fold button exists to attach folding/unfolding behavior
        wait_for_element(".filter-panel__fold").then(async () => {
            const fold_button = document.querySelector(".filter-panel__fold");
            const icon_button = document.querySelector(".filter-panel__icon");

            // Attach event to fold/unfold the on-page switch when the filter panel is folded
            if (!fold_button._has_event) {
                fold_button.addEventListener(
                    "click",
                    () => document.getElementById("k-one_click_mark")?.classList.toggle("mhy-map__waypoint--folded"),
                    false
                );
                fold_button._has_event = true;
            }

            // Attach event to ensure the switch becomes visible when the filter panel icon is clicked
            if (!icon_button._has_event) {
                icon_button.addEventListener(
                    "click",
                    () => document.getElementById("k-one_click_mark")?.classList.remove("mhy-map__waypoint--folded"),
                    false
                );
                icon_button._has_event = true;
            }
        });
    }
}

async function mark_on_open() {
    while (GM_getValue("one-click-mark-switch")) {
        // Wait for the mark button to appear in the popup (only if it doesn't have the data-was-clicked attribute)
        await wait_for_element(".leaflet-popup-content .map-popup .gt-button-ys--primary:not([data-was-clicked])");
        // If the switch is enabled, click the button and set the data-was-clicked attribute
        if (GM_getValue("one-click-mark-switch") && document.querySelector(".leaflet-popup-content .map-popup .gt-button-ys--primary:not([data-was-clicked])")) {
            const button = document.querySelector(".map-popup .gt-button-ys--primary");
            button?.click();
            button?.setAttribute("data-was-clicked", "true");
        }
    }
}

async function observe_panel_and_insert_button() {
    while (true) {
        // Wait until the filter panel appears
        await wait_for_element(".filter-panel");
        // Insert the on-page switch button
        insert_button();
        // Wait until the filter panel disappears
        await wait_for_element_to_disappear(".filter-panel");
        // Loop repeats automatically
    }
}

function update_menu_command() {
    // Remove previous menu if exists (some GM implementations)
    if(menu_id)
        GM_unregisterMenuCommand(menu_id);

    // Register new menu with current status
    menu_id = GM_registerMenuCommand(`Automate Mark Pins: ${GM_getValue("one-click-mark-switch") ? "ON" : "OFF"}`, toggle_one_click_mark_menu);
}

// Toggle the on-page switch and sync the GM_value
function toggle_one_click_mark() {
    GM_setValue("one-click-mark-switch", !GM_getValue("one-click-mark-switch"));

    const pic = document.querySelector("#k-one_click_mark > .waypoint-switch__pic");
    pic?.classList.toggle("waypoint-switch__pic--active");

    // Update the menu to reflect the change
    update_menu_command();

    if(GM_getValue("one-click-mark-switch"))
        mark_on_open();
}

// Toggle the switch via the Userscript menu
function toggle_one_click_mark_menu() {
    GM_setValue("one-click-mark-switch", !GM_getValue("one-click-mark-switch"));

    const pic = document.querySelector("#k-one_click_mark > .waypoint-switch__pic");
    pic?.classList.toggle("waypoint-switch__pic--active");

    // Update the menu to reflect the change
    update_menu_command();

    if(GM_getValue("one-click-mark-switch"))
        mark_on_open();
}


GM_addStyle(`
.swal2-popup {
    font-size: unset;
}
#k-one_click_mark {
  bottom: 1rem;
}
#user-guide-underground-map {
  bottom: 1.8rem;
}
`);