// ==UserScript==
// @name            StreamElements improvements
// @name:de         StreamElements Verbesserungen
// @namespace       https://kurotaku.de
// @version         1.7.5
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
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==


let sold_out_items = [];
let subscriber_only_items = [];

(async function() {
    await init_gm_config(); // Initialize the configuration

    wait_for_element('.side-bar .usr-stats').then(async () => {
        insert_new_sidebar_container(); // Insert a new sidebar for the custom buttons
        insert_gm_config_button(); // Add the button to the filter container to open the configuration menu

        if(GM_config.get("script_enabled")) { // Check if the script is disabled in config
            insert_controls();

            for(let i = 0; i < 120; i++) // While the page items are still loading (2 minute limit than abort the functions)
                if(document.querySelectorAll("user-public-store > :nth-child(3) > div").length === 0)
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

            // if(GM_config.get("default_sorting") !== "Default") // Change the default sorting if its not "Default"
            //     change_default_sorting();

            // if(GM_config.get("default_sorting") === "Default" && (GM_config.get("sort_by_price_ascending") || GM_config.get("sort_by_price_descending"))) // Sort by price if Default is selected
            if(GM_config.get("sort_by_price_ascending") || GM_config.get("sort_by_price_descending")) // Sort by price if Default is selected
                sort_by_price();

            if(GM_config.get("magnifying_glass_buttons"))
                magnifying_glass_buttons();

            if(GM_config.get("hide_item_buttons"))
                hide_item_buttons();
        }
    });
})();

function init_gm_config() {
    GM_registerMenuCommand('Settings', () => GM_config.open());
    GM_config.init(
        {
            'id': 'configuration',
            'title': 'StreamElements improvements',
            'fields':
            {
                'script_enabled': { 'type': 'checkbox', 'default': true, 'label': 'Enable/Disable all improvements' },
                'items_to_hide': { 'section': ['Hide Items'], 'label': 'Hide items by name<br>(each item name must be written in a new line)', 'type': 'textarea'},
                'hide_items_from_list_by_default': { 'type': 'checkbox', 'default': true, 'label': 'Hide items by default' },
                'hide_sold_out_items_by_default': { 'type': 'checkbox', 'default': false, 'label': 'Hide sold out items by default' },
                'hide_subscriber_items_by_default': { 'type': 'checkbox', 'default': false, 'label': 'Hide subscriber only items by default' },
                'gray_out_hidden_items': { 'type': 'checkbox', 'default': true, 'section': ['Gray out'], 'label': 'Gray out hidden items' },
                'gray_out_sold_out_items': { 'type': 'checkbox', 'default': true, 'label': 'Gray out sold out items' },
                // 'default_sorting': { 'type': 'select', 'default': 'Default', 'options': ['Default', 'Newest first', 'Subscribers only', 'Cost'], 'section': ['Sorting'], 'label': 'StreamElements default Sorting' },  [BROKEN DUE TO STREAMELEMENTS UPDATE]
                'sort_by_price_ascending': { 'section': ['Sorting'], 'type': 'checkbox', 'default': true, 'label': 'Sort items by price (ascending)' },
                'sort_by_price_descending': { 'type': 'checkbox', 'default': false, 'label': `Sort items by price (descending)<br>
                                                                                               <details style="margin-top:10px">
                                                                                                 <summary>Info: (click me)</summary>
                                                                                                 <ul>
                                                                                                     <li>- "Ascending" dominates over "Descending".</li>
                                                                                                     <li>- If "Cost" and "Ascending" are selected, it will work.</li>
                                                                                                     <li>- If either checkbox is enabled, normal sorting may not work!</li>
                                                                                                     <li>- I recommend using the checkboxes for faster sorting!</li>
                                                                                                 </ul>
                                                                                              </details>` },
                'magnifying_glass_buttons': { 'type': 'checkbox', 'default': true, 'section': ['Miscellaneous'], 'label': 'Button in top left corner to search on Steam for this item!' },
                'hide_item_buttons': { 'type': 'checkbox', 'default': true, 'label': 'Button in top right corner for quick hide<br>(Warning: you still must save in this popup, to keep the changes saved!)' },
            },
            'events': {
                'init': () => {GM_config.set("items_to_hide", get_prepared_items_to_hide())},
                'save': () => {location.reload()},
            },
            'frame': document.body.appendChild(document.createElement('div')),
        });
}

function insert_new_sidebar_container() {
    let sidebar = document.querySelector(".side-bar .usr-stats");
    let custom_container = "<div id='custom_container' class='usr-stats'></div>";
    sidebar.insertAdjacentHTML('afterend', custom_container);
}

function insert_gm_config_button() {
    let sidebar = document.querySelector("#custom_container");
    let button = "<a id='gm_config_button' class='md-stroked md-button'>StreamElements improvements config</a>";
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

    let button_itemlist = "<a id='get-itemlist' class='md-stroked md-button md-dark-theme'>Get itemlist</a>";
    sidebar.insertAdjacentHTML('beforeend', button_itemlist);
    document.getElementById("get-itemlist").addEventListener ("click", get_itemlist, false);

    let button_export_as_table = "<a id='get-item-table' class='md-stroked md-button md-dark-theme'>Show items as table</a>";
    sidebar.insertAdjacentHTML('beforeend', button_export_as_table);
    document.getElementById("get-item-table").addEventListener ("click", get_item_table, false);

    let button_open_redemption_history = "<a id='redemption_history' class='md-stroked md-button md-dark-theme'>Show redemption history</a>";
    sidebar.insertAdjacentHTML('beforeend', button_open_redemption_history);
    document.getElementById("redemption_history").addEventListener ("click", show_redemption_history, false);
}

// function change_default_sorting() {
//     const sort_method = GM_config.get("default_sorting");
//     let selector = null;
//     switch(sort_method) {
//         case "Default":
//             break;
//         case "Newest first":
//             selector = "#select_option_7";
//             break;
//         case "Subscribers only":
//             selector = "#select_option_8";
//             break;
//         case "Cost":
//             selector = "#select_option_9";
//             break;
//         default:
//             break;
//     };
//     if(selector)
//         wait_for_element(`#select_container_11 ${selector}`).then(async () => {
//             const dropdown_container = document.querySelector("#select_container_11");
//             if (!dropdown_container) return;

//             dropdown_container.style.visibility = "hidden"; // Hide the dropdown menu
//             // Click the selected option
//             document.querySelector(`#select_container_11 ${selector}`)?.click();

//             // Wait until .md-click-catcher exists and click it until it disappears
//             await wait_for_element(".md-click-catcher");
//             let click_catcher;
//             while ((click_catcher = document.querySelector(".md-click-catcher"))) {
//                 click_catcher.click();
//                 await sleep(50);
//             }

//             await sleep(100); // Short delay for the popup to disappear
//             // Restore the visibility of the dropdown menu
//             dropdown_container.style.visibility = "";

//             if(GM_config.get("sort_by_price_ascending") && sort_method === "Cost")
//                 reverse_store_items();
//         });
// }

function reverse_store_items() {
    const list = document.querySelector("user-public-store > :nth-child(3)");
    const items = Array.from(list.querySelectorAll(":scope > div"));
    items.reverse();
    items.forEach((item) => {
        list.appendChild(item);
    });
}

function sort_by_price() {
    let ascending = GM_config.get("sort_by_price_ascending");
    let list = document.querySelector("user-public-store > :nth-child(3)");
    let nodes_to_sort = list.querySelectorAll(":scope > div");

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
    document.querySelectorAll("user-public-store > :nth-child(3) h6").forEach(function(el){item_list += `${el.innerHTML.trim()}\n`});
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
    let store_items_container = document.querySelector("user-public-store > :nth-child(3)");
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div"); // Get all items in store
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

    // Remove Filters
    document.querySelectorAll(".filter-items-input").forEach((filter) => {filter.remove()});

    // Download table button
    let button_download_as_csv = "<a id='download-item-table' class='md-stroked md-button md-dark-theme'>Download table as CSV</a>";
    store_items_container.style.display = "unset"; // Change from grid to unset to allow 100 % width
    store_items_container.innerHTML = button_download_as_csv + table;
    document.getElementById("download-item-table").addEventListener ("click", function() {download_table_as_csv("item-table")}, false);
}

function show_redemption_history() {
    window.open("https://streamelements.com/dashboard/account/redemptions", "_blank").focus();
}

function toggle_hidden_itemlist() {
    let hidden_items = get_hidden_items_array();
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div"); // Get all items in store
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
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div"); // Get all items in store
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
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div");
    let magnifying_glass_button = `<div class="magnifying-glass-container"><div class="ico ico-mglass"></div></div>`;
    items.forEach((item) => {
        item.insertAdjacentHTML('beforeend', magnifying_glass_button);
        item.querySelector(".magnifying-glass-container").addEventListener("click", search_on_steam, false);
    });
}

function search_on_steam(event) {
    let el = event.target;

    // Go up until we hit the magnifying-glass-container
    while (el && !el.classList.contains("magnifying-glass-container"))
        el = el.parentNode;

    // One more up to reach the full item container
    let item = el?.parentNode;
    if (!item) return;

    // 2nd child holds the description and title
    let content_block = item.children[1];

    // Extract description text from <p><span> inside content block
    let desc_span = content_block.querySelector("p > span");
    let desc = desc_span?.textContent || "";

    // Try to match a Steam URL
    let steam_url_regex = /https?:\/\/store\.steampowered\.com\/(app|bundle)\/\d+\/[\w\d%_\-]+\/?/i;
    let match = desc.match(steam_url_regex);

    if (match) {
        // Open matched Steam link
        window.open(match[0], "_blank");
    } else {
        // Fallback: search by title from <h6>
        let title_el = content_block.querySelector("h6");
        let title = title_el?.textContent.trim() || "";
        window.open(`https://store.steampowered.com/search/?term=${title}`, "_blank");
    }
}

function hide_item_buttons() {
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div");
    let eye_button = `<div class="eye-slash-container"><div class="eye slash"><div></div><div></div></div></div>`;

    items.forEach((item) => {
        let hidden_items = get_hidden_items_array();
        let title = get_item_title(item);
        if(!hidden_items.includes(title)) {
            item.insertAdjacentHTML('beforeend', eye_button);
            item.querySelector(".eye-slash-container").addEventListener("click", add_to_hidden, false);
        }
    });
}

function add_to_hidden(event) {
    let el = event.target;

    // Go up until we hit the magnifying-glass-container
    while (el && !el.classList.contains("eye-slash-container"))
        el = el.parentNode;

    // One more up to reach the full item container
    let item = el?.parentNode;
    if (!item) return;

    // Remove the eye-slash button if it exists
    let add_to_hidden_button = item.querySelector(".eye-slash-container");
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
    let title_el = item.querySelector("h6")
    if(!title_el) return ""
    return title_el.textContent.trim()
}

function get_item_description(item) {
    return item.querySelector(":scope > :nth-child(2) > p > span")?.innerText.trim() || "";
}

function get_item_quantity(item) {
    // Find all <p> tags in the details area
    let paragraphs = item.querySelectorAll(":scope > :nth-child(2) > div > p");

    for (let p of paragraphs) {
        if (p.innerText.includes("shopping_basket")) {
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
    let paragraphs = item.querySelectorAll(":scope > :nth-child(2) > div > p");

    for (let p of paragraphs) {
        if (p.innerText.includes("monetization_on")) {
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
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div");
    items.forEach(function(item) {
        let quantity_text = get_item_quantity(item);
		if (quantity_text.toLowerCase().includes("sold out"))
			sold_out_items.push(item);
    })
}

function check_subscriber_only_items() {
    let items = document.querySelectorAll("user-public-store > :nth-child(3) > div");

    items.forEach(function(item) {
        let icons = item.querySelectorAll("span.material-icons");
        for (let icon of icons)
            if (icon.textContent.trim() === "star")
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
#configuration {
    padding: 20px !important;
    max-height: 600px !important;
    max-width: 500px !important;
    background: inherit !important;
    background-color: #020923 !important;
    color:#fff !important;
}

#configuration .section_header {
    margin-bottom: 10px !important;
}

#configuration input {
    margin: unset;
    margin-right: 10px;
}

#configuration input[type="text"] {
    display: block;
}

#configuration textarea {
    width: 100%;
    min-height: 100px;
    resize: vertical;
    background: inherit;
    color: inherit;
}

#configuration select {
    background: inherit;
    color: inherit;
    width: 145px;
    margin-right: 10px;
    appearance: none;
}

#configuration option {
    background-color: #020923 !important;
    color:#fff !important;
}

#configuration_saveBtn,
#configuration_closeBtn,
#configuration_resetLink {
    background: inherit;
    color: #fff !important;
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


/* Eye Slash fixed positioning after update */
user-public-store > :nth-child(3) > div {
  position: relative;
}

/** Eye Slash **/
.eye-slash-container {
  position: absolute;
  right: 0;
  padding: 10px;
  height: 40px;
  width: 40px;
}
.eye-slash-container:hover {
  cursor: pointer;
}
.eye{
  z-index: 0;
  width:1.25em;
  height:0.75em;
  position:absolute;
  display:inline-block;
  --background:#aaa;
  --color:currentColor;
}
.eye div{
  overflow:hidden;
  height:50%;
  position:relative;
  margin-bottom:-1px;
}
.eye div:before{
  content:'';
  background:currentColor;
  position:absolute;
  left:0;
  right:0;
  height:300%;
  border-radius:100%;
}
.eye div:last-child:before{
  bottom:0;
}
.eye:before{
  content:'';
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%, -50%);
  width:0.35em;
  height:0.35em;
  background:var(--color);
  border:0.1em solid var(--background);
  border-radius:100%;
  z-index:1;
}
.eye:after{
  content:'';
  position:absolute;
  top:-0.15em;
  left:calc(33.333% - 0.15em);
  transform:rotate(45deg) scaleX(0);
  transform-origin:left center;
  width:90%;
  height:0.1em;
  background:var(--color);
  border-top:0.1em solid var(--background);
  z-index:2;
  transition:transform 0.25s;
}
.eye.slash:after{
  transform:rotate(45deg) scaleX(1);
}


/**Magnifying glass**/
.magnifying-glass-container {
  position: absolute;
  padding: 10px;
  height: 40px;
  width: 40px;
}
.magnifying-glass-container:hover {
  cursor: pointer;
}
.ico-mglass {
  position: absolute;
  display:inline-block;
  background: transparent;
  border-radius: 30px;
  height: 12px;
  width: 12px;
  border: 2px solid #fff;
}
.ico-mglass:after {
  content: "";
  height: 2px;
  width: 8px;
  background: #fff;
  position: absolute;
  top: 9px;
  left: 6px;
  -webkit-transform: rotate(45deg);
  -moz-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  -o-transform: rotate(45deg);
}


.userpages-wrap {max-width: unset;}

.hide-item,.sold-out-item,.hide-subscriber-item {display: none;}

.gray-out-item {filter: saturate(0%);}

.sort-buttons-container {display: grid;  grid-template-columns: 50% 50%;}

.slidercontainer {letter-spacing: 1.2px;padding-left: 16px;padding-right: 16px;font-size: 12px;line-height: 36px;user-select: none;text-transform: uppercase;font-weight: 600; margin-top: 15px;}

.slidercontainer > .switch {margin-right: 10px;}

.item-table td, .item-table th {border: 2px solid #fff;padding: 10px;}

.table-item-cost,.table-item-stock {text-align:center;}
`);