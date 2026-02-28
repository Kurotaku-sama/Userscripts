// ==UserScript==
// @name            StreamElements improvements
// @name:de         StreamElements Verbesserungen
// @namespace       https://kurotaku.de
// @version         1.7.11
// @description     A script for some improvements for StreamElements
// @description:de  Ein Skript für einige Verbesserungen für StreamElements
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://streamelements.com/*/store*
// @icon            https://cdn.streamelements.com/static/logo/logo_red.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/StreamElements_improvements/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/StreamElements_improvements/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==


let sold_out_items = [];
let subscriber_only_items = [];

// Selectors for nearly any SE element
const SELECTOR = {
    SIDEBAR: "aside",
    STORE: "main .grid",
    FILTER_BAR: "main > div > div:first-of-type",
    ITEMS: "main .grid > div",
    ITEM: {
        TITLE: ":scope h3",
        DESC: ":scope > :nth-child(2) > :nth-child(1) > p",
        QUANTITY: ":scope > :nth-child(2) .lucide-shopping-cart",
        COST: ":scope > :nth-child(2) .lucide-coins",
        SUB_ONLY : ":scope > :nth-child(1) > span",
    }
};

// Copy of the classes the Buttons on SE are using
const BUTTON_CLASSES = "class='w-full py-2 rounded-lg border border-[#5684fd] text-[#5684fd] text-sm font-semibold uppercase tracking-wide hover:bg-[#5684fd]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'";

(async function() {
    await init_gm_config();

    wait_for_element(SELECTOR.SIDEBAR).then(async () => {
        await sleep(500); // Load after 500 MS to prevent the page from removing my panel again

        insert_new_sidebar_container(); // Insert a new sidebar for the custom buttons
        insert_gm_config_button(); // Add the button to the filter container to open the configuration menu

        insert_controls();

        for(let i = 0; i <= 120; i++) // While the page items are still loading (2 minute limit than abort the functions)
            if(document.querySelectorAll(SELECTOR.ITEMS).length === 0)
                if(i === 120)
                    return; // Abort
                else
                    await sleep_s(1); // Wait and try again

        if(GM_config.get("hide_items_from_list_by_default"))
            toggle_hidden_itemlist();

        if(GM_config.get("gray_out_hidden_items")) // If items should be grayed out that are in hidden list
            gray_out_hidden_items();

        check_sold_out_items();
        if(GM_config.get("hide_sold_out_items_by_default")) // Hide items when out of stock
            toggle_sold_out_items();

        check_subscriber_only_items();
        if(GM_config.get("hide_subscriber_items_by_default")) // Hide items when out of stock
            toggle_subscriber_only_items();

        if(GM_config.get("gray_out_sold_out_items")) // If items should be grayed out that are out of stock
            gray_out_sold_out_items();

        if(GM_config.get("sort_by_price_ascending") || GM_config.get("sort_by_price_descending")) // Sort by price if Default is selected
            sort_by_price();

        if(GM_config.get("magnifying_glass_buttons"))
            magnifying_glass_buttons();

        if(GM_config.get("hide_item_buttons"))
            hide_item_buttons();
    });
})();

async function init_gm_config() {
    const config_id = "configuration_streamelements_improvements";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'StreamElements improvements',
        fields: {
            items_to_hide: {
                section: ['Hide Items'],
                label: 'Hide items by name<br>(each item name must be written in a new line)',
                type: 'textarea',
            },
            hide_items_from_list_by_default: {
                type: 'checkbox',
                default: true,
                label: 'Hide items by default',
            },
            hide_sold_out_items_by_default: {
                type: 'checkbox',
                default: false,
                label: 'Hide sold out items by default',
            },
            hide_subscriber_items_by_default: {
                type: 'checkbox',
                default: false,
                label: 'Hide subscriber only items by default',
            },
            gray_out_hidden_items: {
                section: ['Gray out'],
                type: 'checkbox',
                default: true,
                label: 'Gray out hidden items',
            },
            gray_out_sold_out_items: {
                type: 'checkbox',
                default: true,
                label: 'Gray out sold out items',
            },
            sort_by_price_ascending: {
                section: ['Sorting'],
                type: 'checkbox',
                default: true,
                label: 'Sort items by price (ascending)',
            },
            sort_by_price_descending: {
                type: 'checkbox',
                default: false,
                label: 'Sort items by price (descending)',
            },
            hint_sorting_info: {
                type: 'hidden',
                label: `
                    <details style="margin-bottom:10px; margin-left: 25px;">
                        <summary style="cursor:pointer;">Info: Sorting logic (click me)</summary>
                        <ul style="margin-top:5px;">
                            <li>"Ascending" dominates over "Descending".</li>
                            <li>If "Cost" and "Ascending" are selected, it will work.</li>
                            <li>If either checkbox is enabled, normal sorting may not work!</li>
                        </ul>
                    </details>`,
                save: false,
            },
            magnifying_glass_buttons: {
                section: ['Miscellaneous'],
                type: 'checkbox',
                default: true,
                label: 'Button in top left corner to search on Steam for this item!',
            },
            hide_item_buttons: {
                type: 'checkbox',
                default: true,
                label: 'Button in top right corner for quick hide',
            },
            hint_save_warning: {
                type: 'hidden',
                label: '<b>Warning: you still must save in this popup to keep changes saved!</b>',
                save: false,
            },
        },
        events: {
            init: () => { GM_config.set("items_to_hide", get_prepared_items_to_hide()) },
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

function insert_new_sidebar_container() {
    let sidebar = document.querySelector(SELECTOR.SIDEBAR);
    let custom_container = "<div id='custom_container'></div>";
    sidebar.insertAdjacentHTML('beforeend', custom_container);
}

function insert_gm_config_button() {
    let sidebar = document.querySelector("#custom_container");
    let button = `<a id='gm_config_button' ${BUTTON_CLASSES}>StreamElements improvements config</a>`;
    sidebar.insertAdjacentHTML('beforeend', button);
    document.querySelector("#gm_config_button").addEventListener("click",() => GM_config.open());
}

// Custom controls under the config button
function insert_controls() {
    let sidebar = document.querySelector("#custom_container");

    let hide_items_slider = `<div class="slidercontainer"><label class="switch"><input id="toggle-hide-itemlist" type="checkbox" ${GM_config.get("hide_items_from_list_by_default") ? 'checked' : ''}><span class="slider round"></span></label>Show/Hide hidden items</div>`;
    sidebar.insertAdjacentHTML('beforeend', hide_items_slider);
    document.getElementById("toggle-hide-itemlist").addEventListener ("click", toggle_hidden_itemlist, false);

    let sold_out_slider = `<div class="slidercontainer"><label class="switch"><input id="toggle-sold-out" type="checkbox" ${GM_config.get("hide_sold_out_items_by_default") ? 'checked' : ''}><span class="slider round"></span></label>Show/Hide sold out items</div>`;
    sidebar.insertAdjacentHTML('beforeend', sold_out_slider);
    document.getElementById("toggle-sold-out").addEventListener ("click", toggle_sold_out_items, false);

    let subscriber_only_slider = `<div class="slidercontainer"><label class="switch"><input id="toggle-subscriber-only" type="checkbox" ${GM_config.get("hide_subscriber_items_by_default") ? 'checked' : ''}><span class="slider round"></span></label>Show/Hide subscriber items</div>`;
    sidebar.insertAdjacentHTML('beforeend', subscriber_only_slider);
    document.getElementById("toggle-subscriber-only").addEventListener ("click", toggle_subscriber_only_items, false);

    let button_itemlist = `<a id='get-itemlist' ${BUTTON_CLASSES}>Get itemlist</a>`;
    sidebar.insertAdjacentHTML('beforeend', button_itemlist);
    document.getElementById("get-itemlist").addEventListener ("click", get_itemlist, false);

    let button_export_as_table = `<a id='get-item-table' ${BUTTON_CLASSES}>Show items as table</a>`;
    sidebar.insertAdjacentHTML('beforeend', button_export_as_table);
    document.getElementById("get-item-table").addEventListener ("click", get_item_table, false);

    let button_open_redemption_history = `<a id='redemption_history' ${BUTTON_CLASSES}>Show redemption history</a>`;
    sidebar.insertAdjacentHTML('beforeend', button_open_redemption_history);
    document.getElementById("redemption_history").addEventListener ("click", show_redemption_history, false);
}

// UNUSED
// function reverse_store_items() {
//     const list = document.querySelector(SELECTOR.STORE);
//     const items = Array.from(list.querySelectorAll(SELECTOR.ITEMS));
//     items.reverse();
//     items.forEach((item) => {
//         list.appendChild(item);
//     });
// }

function sort_by_price() {
    let ascending = GM_config.get("sort_by_price_ascending");
    let list = document.querySelector(SELECTOR.STORE);
    let nodes_to_sort = list.querySelectorAll(SELECTOR.ITEMS);

    Array.prototype.map.call(nodes_to_sort, function(node) {
        return {
            node: node,
            cost: get_item_cost(node)
        };
    }).sort(function(a, b) {
        return ascending ? a.cost - b.cost : b.cost - a.cost;
    }).forEach(function(item) {
        list.appendChild(item.node);
    });
}

function get_itemlist() { // Get list with all items in store
    let item_list = "";
    document.querySelectorAll(SELECTOR.ITEMS).forEach(function(item) {
        let title_el = item.querySelector(SELECTOR.ITEM.TITLE);
        if(title_el)
            item_list += `${title_el.textContent.trim()}\n`;
    });
    console.clear();
    if(item_list !== "") {
        console.log(item_list);
        alert("Item list displayed in the console (F12 on most browsers)\nCopy the list and paste it to the config textarea.\nRemove the items from the list that you still want to see!");
    }
    else
        alert("There are no items shown currently");
}

function get_item_table() {
    document.getElementById("get-item-table").remove(); // Remove the Button to prevent users from clicking it again
    let store_items_container = document.querySelector(SELECTOR.STORE);
    let items = document.querySelectorAll(SELECTOR.ITEMS); // Get all items in store
    let table = "<table id='item-table' class='item-table'>";
    table += "<tr><th>Name</th><th>Description</th><th>Price</th><th>Stock</th></tr>"; // Cell headlines
    items.forEach(function(item) {
        // Get all informations from cards
        let title = get_item_title(item);
        let description = get_item_description(item);
        let stock = get_item_quantity(item);
        let cost = get_item_cost(item);


        // Add line to table
        table += `<tr><td>${title}</td><td>${description}</td><td class='table-item-cost'>${cost}</td><td class='table-item-stock'>${stock}</td></tr>`;

    })
    table += "</table>";

    // Remove Filter Barf
    document.querySelector(SELECTOR.FILTER_BAR)?.remove();

    // Download table button
    let button_download_as_csv = `<a id='download-item-table' ${BUTTON_CLASSES}>Download table as CSV</a>`;
    store_items_container.style.display = "unset"; // Change from grid to unset to allow 100 % width
    store_items_container.innerHTML = button_download_as_csv + table;
    document.getElementById("download-item-table").addEventListener ("click", function() {download_table_as_csv("item-table")}, false);
}

function show_redemption_history() {
    window.open("https://streamelements.com/dashboard/account/redemptions", "_blank").focus();
}

function toggle_hidden_itemlist() {
    let hidden_items = get_hidden_items_array();
    let items = document.querySelectorAll(SELECTOR.ITEMS); // Get all items in store
    items.forEach(function(item) {
        let title = get_item_title(item);
        if(hidden_items.includes(title))
            item.classList.toggle("hide-item");
    })
}

function toggle_sold_out_items() {
    sold_out_items.forEach(function(item) {
        item.classList.toggle("sold-out-item");
    });
}

function toggle_subscriber_only_items() {
    subscriber_only_items.forEach(function(item) {
        item.classList.toggle("hide-subscriber-item");
    });
}

function gray_out_hidden_items() {
    let hidden_items = get_hidden_items_array();
    let items = document.querySelectorAll(SELECTOR.ITEMS); // Get all items in store
    items.forEach(function(item) {
        let title = get_item_title(item);
        if(hidden_items.includes(title))
            item.classList.add("gray-out-item");
    });
}

function gray_out_sold_out_items() {
    sold_out_items.forEach(function(item) {
        item.classList.add("gray-out-item");
    });
}

function magnifying_glass_buttons() {
    let items = document.querySelectorAll(SELECTOR.ITEMS);
    let magnifying_glass_button = `<div class="magnifying-glass-container">🔎</div>`;

    items.forEach((item) => {
        item.insertAdjacentHTML('beforeend', magnifying_glass_button);
        item.querySelector(".magnifying-glass-container").addEventListener("click", search_on_steam, false);
    });
}

function search_on_steam(event) {
    let el = event.target;

    // One more up to reach the full item container
    let item = el?.parentNode;
    if (!item) return;

    // 2nd child holds the description and title
    let content_block = item.children[1];

    // Extract description text from <p><span> inside content block
    let desc_span = content_block.querySelector("p:first-of-type");
    let desc = desc_span?.textContent || "";

    // Try to match a Steam URL
    let steam_url_regex = /https?:\/\/store\.steampowered\.com\/(app|bundle)\/\d+\/[\w\d%_\-]+\/?/i;
    let match = desc.match(steam_url_regex);

    if (match) {
        // Open matched Steam link
        window.open(match[0], "_blank");
    } else {
        // Fallback: search by title from <h6>
        let title_el = content_block.querySelector(SELECTOR.ITEM.TITLE);
        let title = title_el?.textContent.trim() || "";
        window.open(`https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`, "_blank");
    }
}

function hide_item_buttons() {
    let items = document.querySelectorAll(SELECTOR.ITEMS);
    let eye_button = `<div class="eye-container">👁️</div>`;

    items.forEach((item) => {
        let hidden_items = get_hidden_items_array();
        let title = get_item_title(item);
        if(!hidden_items.includes(title)) {
            item.insertAdjacentHTML('beforeend', eye_button);
            item.querySelector(".eye-container").addEventListener("click", add_to_hidden, false);
        }
    });
}

function add_to_hidden(event) {
    let el = event.target;

    // One more up to reach the full item container
    let item = el?.parentNode;
    if (!item) return;

    // Remove the eye button if it exists
    let add_to_hidden_button = item.querySelector(".eye-container");
    if (add_to_hidden_button)
        add_to_hidden_button.remove();

    // Get title from item (custom function)
    let title = get_item_title(item);

    // Store hidden item list
    GM_config.set("items_to_hide", get_prepared_items_to_hide(title));

    // Gray out item visually if config says so
    if (GM_config.get("hide_items_from_list_by_default"))
        item.classList.add("gray-out-item");

    // Fully hide item if toggle is active
    let hide_itemlist_enabled = document.querySelector("#toggle-hide-itemlist")?.checked;
    if (hide_itemlist_enabled)
        item.classList.add("hide-item");
}

function get_item_title(item) {
    // Use textContent instead of innerHTML to avoid &amp; vs & mismatches
    let title_el = item.querySelector(SELECTOR.ITEM.TITLE);
    if(!title_el) return ""
    return title_el.textContent.trim();
}

function get_item_description(item) {
    return item.querySelector(SELECTOR.ITEM.DESC)?.innerText.trim() || "";
}

function get_item_quantity(item) {
    // Find all <p> tags in the details area
    let paragraphs = item.querySelectorAll(SELECTOR.ITEM.QUANTITY);

    for (let p of paragraphs) {
        p = p.parentNode.querySelector("span");
        if (p) {
            return p.innerText
                .replace("shopping_basket", "")
                .replace("items left", "")
                .replace("left", "")
                .trim();
        }
    }

    // If no stock paragraph found, treat as unlimited
    return "Unlimited";
}

function get_item_cost(item) {
    // Find all <p> tags in the details area
    let paragraphs = item.querySelectorAll(SELECTOR.ITEM.COST);

    for (let p of paragraphs) {
        p = p.parentNode.querySelector("span");
        if (p) {
            let number = p.innerText
            .replace("monetization_on", "")
            .replace(/\D/g, "") // Remove all non-digits
            .trim();

            return parseInt(number, 10) || 0; // Return as integer
        }
    }

    // Fallback if no cost info is found
    return 0;
}

function get_prepared_items_to_hide(new_title = null) {
    let items_to_hide = GM_config.get("items_to_hide");
    if(new_title) // Add new item title if exist
        items_to_hide += `\n${new_title.trim()}`;
    items_to_hide = items_to_hide.replace(/^\s*$(?:\r\n?|\n)/gm, ""); // Remove blank lines
    items_to_hide = trim_spaces(items_to_hide); // Remove Spaces
    items_to_hide = sort_alphabetically(items_to_hide); // Sort alphabetical

    return items_to_hide;
}

function check_sold_out_items() {
    let items = document.querySelectorAll(SELECTOR.ITEMS);
    items.forEach(function(item) {
        let quantity_text = get_item_quantity(item);
        if (quantity_text.toLowerCase().includes("sold out"))
            sold_out_items.push(item);
    })
}

function check_subscriber_only_items() {
    let items = document.querySelectorAll(SELECTOR.ITEMS);

    items.forEach(function(item) {
        let elements = item.querySelectorAll(SELECTOR.ITEM.SUB_ONLY);
        for (let element of elements)
            if (element.textContent.trim() === "Sub only")
                subscriber_only_items.push(item);
    });
}

function get_hidden_items_array() {
    let hidden_items = GM_config.get("items_to_hide").split("\n");
    hidden_items = hidden_items.map(function (el) {return el.trim();}); // Trim away the spaces
    hidden_items = hidden_items.filter((el) => el !== ""); // Remove all empty lines (shouldn't happen anymore, but safe is safe)
    return hidden_items;
}

GM_addStyle(`
#root > div > .w-full {
    margin: unset !important;
}

aside {
    width: 20vw;
}

main {
    min-width: 75vw;
}

/* Center "Sub only" */
main .grid .bg-bg-card div:nth-child(1) > span {
    left: 50%;
    right: unset !important;
    transform: translateX(-50%);
}

/* ----- CUSTOM ELEMENTS ----- */
#custom_container > a {
    margin-bottom: 20px;
    display: block;
    text-align: center;
    margin-top: 15px;
    user-select: none;
    -webkit-user-select: none;
}

/* Switch */
.switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
}

input:checked + .slider {
    background-color: #2196F3;
}

input:focus + .slider {
    box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
    border-radius: 34px;
}

.slider.round:before {
    border-radius: 50%;
}

/* Eye fixed positioning after update */
${SELECTOR.ITEMS} {
    position: relative;
}

.eye-container,
.magnifying-glass-container {
    position: absolute;
    height: 30px;
    width: 30px;
    background-color: rgba(20, 20, 20, 0.3);
    border-radius: 50%;
    color: white;
    cursor: pointer;
    padding: 3px;
    margin: unset;
    user-select: none;
    -webkit-user-select: none;
}

/* Eye */
.eye-container {
    right: 5px;
    top: 5px;
}

/* Magnifying Glass */
.magnifying-glass-container {
    left: 5px;
    top: 5px;
}

.hide-item,
.sold-out-item,
.hide-subscriber-item {
    display: none !important;
}

.gray-out-item {
    filter: saturate(0%);
}

.sort-buttons-container {
    display: grid;
    grid-template-columns: 50% 50%;
}

.slidercontainer {
    letter-spacing: 1.2px;
    padding-left: 10px;
    padding-right: 10px;
    font-size: 11px;
    line-height: 35px;
    user-select: none;
    -webkit-user-select: none;
    text-transform: uppercase;
    font-weight: 600;
    margin-top: 15px;
}

.slidercontainer > .switch {
    margin-right: 10px;
}

.item-table td,
.item-table th {
    border: 2px solid #fff;
    padding: 10px;
}

.table-item-cost,
.table-item-stock {
    text-align: center;
}

#download-item-table {
    display: block;
    max-width: 250px;
    text-align: center;
    margin-bottom: 20px;
}
`);