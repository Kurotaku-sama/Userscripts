// ==UserScript==
// @name            givee.club & giveaway.su improvements
// @name:de         givee.club & giveaway.su Verbesserungen
// @namespace       https://kurotaku.de
// @version         1.0.2
// @description     A script for some improvements for givee.club & giveaway.su
// @description:de  Ein Skript für einige Verbesserungen für givee.club & giveaway.su
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://givee.club/*
// @match           https://giveaway.su/*
// @icon            https://givee.club/favicon.ico
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/givee.club_&_giveaway.su_improvements/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/givee.club_&_giveaway.su_improvements/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==


const SITE_DATA = {
    "givee.club": {
        sele_menu: `.user button[data-action="account-rewards"]`,
        sele_giveaways_container: "#event-active",
        sele_giveaway_container: "#event-active .col-md-4.col-sm-6",
        sele_giveaway_card: ".event-card",
        sele_giveaway_title: ".event-title .vertical-align-middle",
        sele_ads: ".definetelynotanad",
        sele_task_button_destination: ".actions-submit",
        sele_task_buttons: ".event-actions tr button.btn-default",
        html_button_toggle_visibility_open: `&nbsp;<button class="btn btn-default btn-xs" id="button_toggle_visibility"><i class="glyphicon glyphicon-eye-open"></i> <span class="hidden-xs">Show hidden</span></button>`,
        html_button_toggle_visibility_close: `&nbsp;<button class="btn btn-default btn-xs" id="button_toggle_visibility"><i class="glyphicon glyphicon-eye-close"></i> <span class="hidden-xs">Hide hidden</span></button>`,
        html_button_config: `&nbsp;<button class="btn btn-default btn-xs" id="button_config"><i class="glyphicon glyphicon-cog"></i> <span class="hidden-xs">Config</span></button>`,
        menu_insert: "afterend"
    },
    "giveaway.su": {
        sele_menu: "ul.menu",
        sele_giveaways_container: "#giveaways",
        sele_giveaway_container: "#giveaways .col-md-4.col-sm-6",
        sele_giveaway_card: ".giveaway-item",
        sele_giveaway_title: ".giveaway-title .vertical-align-middle",
        sele_ads: ".definetelynotanad",
        sele_task_button_destination: "#getKey",
        sele_task_buttons: "#actions tr button.btn-default",
        html_button_toggle_visibility_open: `<li id="button_toggle_visibility"><a><i class="glyphicon glyphicon-eye-open"></i> <span>Show hidden</span></a></li>`,
        html_button_toggle_visibility_close: `<li id="button_toggle_visibility"><a><i class="glyphicon glyphicon-eye-close"></i> <span>Hide hidden</span></a></li>`,
        html_button_config: `<li id="button_config"><a><i class="glyphicon glyphicon-cog"></i> <span>Config</span</a></li>`,
        menu_insert: "afterbegin"
    }
};

const CURRENT_DOMAIN = window.location.hostname;
const DATA = SITE_DATA[CURRENT_DOMAIN];
const LOC = window.location.href;
let gicl, gisu;

(async function() {
    await init_gm_config();

    if(get_field("script_enabled")) {
        insert_buttons();

        if(gicl.get("hide_ads"))
            hide_ads();

        wait_for_element(DATA.sele_giveaways_container).then(async () => {
            hide_items();

            if(get_field("hide_item_buttons"))
                hide_item_buttons();
        });

        if(LOC.includes("/event/"))
            insert_giveaway_draw_time();

        if(LOC.includes("/event/") || LOC.includes("/giveaway/view/"))
            insert_task_button();
    }
})();

async function init_gm_config() {
    const config_id_gicl = "configuration_gicl";
    const config_id_gisu = "configuration_gisu";

    gicl = new GM_config({
        id: config_id_gicl,
        title: "givee.club improvements",
        fields: {
            companion: {
                type: "button",
                size: 100,
                label: "Install Giveaway Companion (Recommended)",
                click: () => window.open("https://raw.githubusercontent.com/longnull/GiveawayCompanion/master/GiveawayCompanion.user.js", "_blank"),
            },
            script_enabled: {
                type: "checkbox",
                default: true,
                label: "Enable/Disable all improvements",
            },
            hide_ads: {
                type: "checkbox",
                default: true,
                label: "Hide sponsored content",
            },
            hide_item_buttons: {
                type: "checkbox",
                default: true,
                label: "Button in top right corner for quick hide",
            },
            hide_items_from_list_by_default: {
                type: "checkbox",
                default: true,
                label: "Hide items by default",
            },
            instant_hide: {
                type: "checkbox",
                default: false,
                label: "Instant hide",
            },
            items_to_hide: {
                label: "Hide items by name<br>(each item name must be written in a new line)",
                type: "textarea",
            },
        },
        frame: create_configuration_container(),
    })

    gisu = new GM_config({
        id: config_id_gisu,
        title: "giveaway.su improvements",
        fields: {
            companion: {
                type: "button",
                size: 100,
                label: "Install Giveaway Companion (Recommended)",
                click: () => window.open("https://raw.githubusercontent.com/longnull/GiveawayCompanion/master/GiveawayCompanion.user.js", "_blank"),
            },
            script_enabled: {
                type: "checkbox",
                default: true,
                label: "Enable/Disable all improvements",
            },
            hide_item_buttons: {
                type: "checkbox",
                default: true,
                label: "Button in top right corner for quick hide",
            },
            hide_items_from_list_by_default: {
                type: "checkbox",
                default: true,
                label: "Hide items by default",
            },
            instant_hide: {
                type: "checkbox",
                default: false,
                label: "Instant hide",
            },
            items_to_hide: {
                label: "Hide items by name<br>(each item name must be written in a new line)",
                type: "textarea",
            },
        },
        frame: create_configuration_container(),
    })

    GM_registerMenuCommand("Settings givee.club", () => gicl.open());
    GM_registerMenuCommand("Settings giveaway.su", () => gisu.open());
    await wait_for_gm_config();
}

function get_config() {
    if (CURRENT_DOMAIN === "givee.club")
        return gicl;
    else if (CURRENT_DOMAIN === "giveaway.su")
        return gisu;
    return null;
}

function get_field(field_name) {
    const config = get_config();
    return config ? config.get(field_name) : false;
}

async function insert_buttons() {
    // Wait for menu element based on current domain
    wait_for_element(DATA.sele_menu).then((menu_element) => {
        let html = "";

        // Check if we're on homepage (for toggle button)
        const home = document.querySelector(DATA.sele_giveaways_container);
        if (home)
            html += get_field("hide_items_from_list_by_default") ? DATA.html_button_toggle_visibility_open : DATA.html_button_toggle_visibility_close;

        // Always add config button
        html += DATA.html_button_config;

        // Insert buttons using domain-specific method
        menu_element.insertAdjacentHTML(DATA.menu_insert, html);

        // Add event listeners
        document.getElementById("button_config")?.addEventListener("click", () => get_config()?.open());
        document.getElementById("button_toggle_visibility")?.addEventListener("click", toggle_visibility);

        // Remove empty <a> tags (giveaway.su specific)
        if (CURRENT_DOMAIN === "giveaway.su") {
            const empty_links = menu_element.querySelectorAll('a');
            empty_links.forEach(a => {
                if (!a.textContent.trim()) a.remove();
            });
        }
    });
}

function toggle_visibility() {
    const btn = document.getElementById("button_toggle_visibility");
    const icon = btn.querySelector("i");
    const text = btn.querySelector("span");

    icon.classList.toggle("glyphicon-eye-open");
    icon.classList.toggle("glyphicon-eye-close");

    text.textContent = text.textContent == "Show hidden" ? "Hide hidden" : "Show hidden";

    let hidden = document.querySelectorAll(".gray-out-item");
    hidden.forEach(el => el.classList.toggle("hide-item"));
}

function hide_ads() {
    const elements = document.querySelectorAll(DATA.sele_ads);

    elements.forEach(ad => {
        const parent = ad.closest('.col-md-4.col-sm-6');
        parent ? parent.remove() : ad.remove();
    });
}

function hide_item_buttons() {
    const items = document.querySelectorAll(DATA.sele_giveaway_card);
    const eye_button = `<div class="eye-container"><i class="glyphicon glyphicon-eye-close"></i></div>`;

    items.forEach((item) => {
        if (!item.parentNode.classList.contains("gray-out-item")) {
            item.parentNode.insertAdjacentHTML('afterbegin', eye_button);
            item.parentNode.querySelector(".eye-container").addEventListener("click", add_to_hidden, false);
        }
    });
}

function add_to_hidden(event) {
    let item = event.target; // Get the item
    while(item.classList.value !== "col-md-4 col-sm-6") // Go up till you reach the item
        item = item.parentNode;

    item.querySelector(".eye-container")?.remove();

    let href_and_title = get_event_href_and_title(item);
    get_config().set("items_to_hide", get_prepared_items_to_hide(href_and_title)); // Override old list

    if(get_field("hide_items_from_list_by_default"))
        item.classList.add("gray-out-item");

    if(get_field("instant_hide"))
        item.classList.add("hide-item");

    get_config().save();
}

function get_event_href_and_title(event) {
    return `${event.querySelector(DATA.sele_giveaway_card).pathname} - ${event.querySelector(DATA.sele_giveaway_title).innerText}`;
}

function get_event_href(event) {
    return `${event.querySelector(DATA.sele_giveaway_card).pathname}`;
}

function get_prepared_items_to_hide(new_title = null) {
    let items_to_hide = get_field("items_to_hide") || "";

    // Add new title if provided
    if (new_title)
        items_to_hide += `\n${new_title.trim()}`;

    // Process the items string
    items_to_hide = items_to_hide
        .replace(/^\s*$(?:\r\n?|\n)/gm, "") // Remove blank lines
        .split('\n')                        // Split into array
        .map(line => trim_spaces(line))     // Trim each line
        .filter(line => line !== "")        // Remove empty lines
        .filter((line, index, self) =>      // Remove duplicates
            self.indexOf(line) === index
        )
        .sort(sort_alphabetically)          // Sort alphabetically
        .join('\n');                        // Join back to string

    return items_to_hide;
}

function hide_items() {
    let hidden_items = get_hidden_items_array();
    let events = document.querySelectorAll(DATA.sele_giveaway_container); // Get all items in store
    events.forEach(function(event) {
        if(event.querySelector(DATA.sele_ads) === null) {
            let href = get_event_href(event);
            if(hidden_items.includes(href)) {
                event.classList.add("gray-out-item");
                if(get_field("hide_items_from_list_by_default"))
                    event.classList.add("hide-item");
            }
        }
    })
}

function get_hidden_items_array() {
    let hidden_items = get_field("items_to_hide").split("\n");
    hidden_items = hidden_items.map(function (el) {return el.split(" - ")[0].trim();}); // Trim away the spaces
    hidden_items = hidden_items.filter((el) => el !== ""); // Remove all empty lines (shouldn't happen anymore, but safe is safe)
    return hidden_items;
}

function insert_task_button() {
    wait_for_element(DATA.sele_task_button_destination).then(async (destination) => {
        const button = "<button type='button' class='btn btn-success btn-sm' id='k-check-tasks'>Check Tasks</button>";
        destination.innerHTML = button + destination.innerHTML;
        document.getElementById("k-check-tasks").addEventListener ("click", check_tasks, false);
    });
}

function check_tasks() {
    let buttons = document.querySelectorAll(DATA.sele_task_buttons);
    buttons.forEach(button => button.click());
}

function insert_giveaway_draw_time() {
    let countdown = document.querySelector(".event-countdown");
    if(countdown) {
        let time = new Date();
        let time_left = parseInt(countdown.getAttribute("data-timeleft"));
        time.setSeconds(time.getSeconds() + time_left);
        countdown.insertAdjacentHTML('afterend', `<div class="event_countdown">Giveaway will be drawn on: <span>${format_date_time(time)}</span></div>`);
    }
}

function format_date_time(time) {
    let date = time.getDate() >= 10 ? time.getDate() : '0'+time.getDate();
    let month = time.getMonth() >= 10 ? time.getMonth() : '0'+time.getMonth();
    let full_year = time.getFullYear();
    let hours = time.getHours() >= 10 ? time.getHours() : '0'+time.getHours();
    let minutes = time.getMinutes() >= 10 ? time.getMinutes() : '0'+time.getMinutes();
    let formated_date = `${date}.${month}.${full_year} - ${hours}:${(minutes)}`;
    return formated_date
}

GM_addStyle(`
#button_toggle_visibility {
  width: 95px;
}

.event_countdown {
  text-align: center;
  font-size: 18px;
  margin-top: 20px;
}

.event_countdown > span {
  font-weight: bold;
}

.eye-container {
  position: absolute;
  right: 0;
  padding: 10px;
  height: 40px;
  width: 40px;
}

.gray-out-item {filter: saturate(0%)}

.hide-item {display: none !important}
`);