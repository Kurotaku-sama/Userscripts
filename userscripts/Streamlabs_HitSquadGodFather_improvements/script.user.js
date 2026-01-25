// ==UserScript==
// @name            Streamlabs HitSquadGodFather improvements
// @name:de         Streamlabs HitSquadGodFather verbesserungen
// @namespace       https://kurotaku.de
// @version         1.1.4
// @description     A script for some improvements for Streamlabs for HitSquadGodFather
// @description:de  Ein Skript für einige Verbesserungen für Streamlabs für HitSquadGodFather
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://streamlabs.com/dasteamgodfather*
// @icon            https://yt3.ggpht.com/0G-q6XBRPcEzUBn9OipycFN53PGuvoIwkmC-VwXYxQVClnU2jjbvcTdJuL87ZDukecU2812l=s88-c-k-c0x00ffffff-no-rj
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Streamlabs_HitSquadGodFather_improvements/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Streamlabs_HitSquadGodFather_improvements/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==

(async function() {
    await init_gm_config();

    wait_for_element('.cloudbot-store__items').then(async () => {
        insert_new_sidebar_container(); // Insert a new sidebar for the custom buttons
        insert_gm_config_button(); // Add the button to the filter container to open the configuration menu

        if(GM_config.get("script_enabled")) { // Check if the script is disabled in config
            // Layout
            if(GM_config.get("streamelements_store_layout"))
                streamelements_store_layout();
            else {
                if(GM_config.get("hide_twitch_stream"))
                    hide_twitch_stream();

                if(GM_config.get("hide_social_panels"))
                    hide_social_panels();

                if(GM_config.get("hide_footer"))
                    hide_footer();

                if(GM_config.get("use_full_side_width"))
                    use_full_side_width();
            }

            for(let i = 0; i < 120; i++) // While the page items are still loading (2 minute limit than abort the functions)
                if(document.querySelector(".cloudbot-store-item") === null || document.querySelector(".cloudbot-store-item") === 0)
                    if(i === 120)
                        return; // Abort
                    else
                        await sleep_s(1); // Wait and try again

            insert_controls();

            // Functional
            if(GM_config.get("hide_items_from_list_by_default"))
                toggle_hidden_itemlist();

            if(GM_config.get("gray_out_hidden_items")) // If items should be grayed out that are in hidden list
                gray_out_hidden_items();

            if(GM_config.get("sort_by_price") || GM_config.get("sort_by_price_descending"))
                sort_by_price();

            if(GM_config.get("magnifying_glass_buttons"))
                magnifying_glass_buttons();

            if(GM_config.get("hide_item_buttons"))
                hide_item_buttons();
        }
    });
})();

async function init_gm_config() {
    const config_id = "configuration_slabs_hsgf_imp";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Streamlabs HitSquadGodFather improvements',
        fields: {
            script_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable/Disable all improvements',
            },
            items_to_hide: {
                label: 'Hide items by name<br>(each item name must be written in a new line)',
                type: 'textarea',
            },
            hide_items_from_list_by_default: {
                type: 'checkbox',
                default: true,
                label: 'Hide items by default',
            },
            gray_out_hidden_items: {
                type: 'checkbox',
                default: true,
                label: 'Gray out hidden items',
            },
            sort_by_price: {
                type: 'checkbox',
                default: false,
                label: 'Sort items always by price',
            },
            sort_by_price_descending: {
                type: 'checkbox',
                default: false,
                label: 'Sort items always by price (descending)',
            },
            magnifying_glass_buttons: {
                type: 'checkbox',
                default: true,
                label: 'Button in top left corner to search on Steam for this item!',
            },
            hide_item_buttons: {
                type: 'checkbox',
                default: true,
                label: 'Button in top right corner for quick hide<br>(Warning: you still must save in this popup, to keep the changes saved!)',
            },
            streamelements_store_layout: {
                section: ['Layout'],
                type: 'checkbox',
                default: true,
                label: 'StreamElements store layout<br>(This contains all other layout options)',
            },
            hide_twitch_stream: {
                type: 'checkbox',
                default: true,
                label: 'Hide Twitch stream',
            },
            hide_social_panels: {
                type: 'checkbox',
                default: true,
                label: 'Hide all social panel',
            },
            hide_footer: {
                type: 'checkbox',
                default: true,
                label: 'Hide footer',
            },
            use_full_side_width: {
                type: 'checkbox',
                default: true,
                label: 'Use the full width of the site',
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
    let sidebar = document.querySelector("#cs-baf3d5c0-b4c2-4bd6-85b8-f98cf20a3779");
    let custom_container = "<div id='custom_container' class='usr-stats'></div>";
    sidebar.innerHTML = custom_container;
}

function insert_gm_config_button() {
    let sidebar = document.querySelector("#custom_container");
    let button = "<a id='gm_config_button' class=''>Streamlabs improvements config</a>";
    sidebar.insertAdjacentHTML('beforeend', button);
    document.querySelector("#gm_config_button").addEventListener("click",() => GM_config.open());
}

// Custom controls under the config button
function insert_controls() {
    let sidebar = document.querySelector("#custom_container");

    let hide_items_slider = `<div class="slidercontainer"><label class="switch"><input id="toggle-hide-itemlist" type="checkbox" ${GM_config.get("hide_items_from_list_by_default") ? 'checked' : ''}><span class="slider round"></span></label>Show/Hide hidden items</div>`;
    sidebar.insertAdjacentHTML('beforeend', hide_items_slider);
    document.getElementById("toggle-hide-itemlist").addEventListener ("click", toggle_hidden_itemlist, false);

    let button_itemlist = "<a id='get-itemlist'>Get itemlist</a>";
    sidebar.insertAdjacentHTML('beforeend', button_itemlist);
    document.getElementById("get-itemlist").addEventListener ("click", get_itemlist, false);

    let button_export_as_table = "<a id='get-item-table'>Show items as table</a>";
    sidebar.insertAdjacentHTML('beforeend', button_export_as_table);
    document.getElementById("get-item-table").addEventListener ("click", get_item_table, false);

    let button_open_redemption_history = "<a id='redemption_history'>Show redemption history</a>";
    sidebar.insertAdjacentHTML('beforeend', button_open_redemption_history);
    document.getElementById("redemption_history").addEventListener ("click", show_redemption_history, false);
}

function streamelements_store_layout() {
    hide_twitch_stream();
    hide_social_panels();
    hide_footer();
    use_full_side_width();

    let element_selector = '#cs-8089a7aa-c2f6-4b4a-b664-df5e4729c32b';
    wait_for_element(element_selector).then(async () => {
        document.querySelectorAll(".site-canvas-sections-container > div")[1].classList.add("flex");
        // Sidebar
        document.querySelector("#cs-cbbab448-e39c-4851-b7f1-3ac264471e5e .site-section-content.flex").classList.remove("flex");
        document.querySelector("#cs-cbbab448-e39c-4851-b7f1-3ac264471e5e").parentNode.style.width = "20%";
        // Store
        document.querySelector("#cs-8089a7aa-c2f6-4b4a-b664-df5e4729c32b > div").style.minWidth = "100%";
        document.querySelector("#cs-8089a7aa-c2f6-4b4a-b664-df5e4729c32b").parentNode.style.width = "80%";
    });
}

function hide_twitch_stream() {
    let element_selector = '#cs-50a9d92d-90a3-417a-b45e-2332b646cb64';
    wait_for_element(element_selector).then(async () => {
        document.querySelector(element_selector).parentNode.remove();
    });
}

function hide_social_panels() {
    let element_selector = '#cs-17e4caec-a25a-4e30-a34b-10ac919b23cc';
    wait_for_element(element_selector).then(async () => {
        document.querySelector(element_selector).parentNode.remove();
    });
}

function hide_footer() {
    let element_selector = '.footer-container';
    wait_for_element(element_selector).then(async () => {
        document.querySelector(element_selector).remove();
    });
}

function use_full_side_width() {
    GM_addStyle(`.site-canvas--live .site-canvas-sections-container .site-section-content { max-width: unset !important }`);
}

function get_itemlist() { // Get list with all items in store
    let item_list = "";
    document.querySelectorAll("div > .cloudbot-store-item__title:first-of-type").forEach(function(el){item_list += `${el.innerText.trim()}\n`});
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
    let store_items_container = document.querySelector("#cs-30bfba7c-b1e9-47a4-b4b9-9ffa59855a5c");
    let items = document.querySelectorAll(".cloudbot-store-item"); // Get all items in store
    let table = "<table id='item-table' class='item-table'>";
    table += "<tr><th>Name</th><th>Description</th><th>Price</th><th>Stock</th></tr>"; // Cell headlines
    items.forEach(function(item) {
        // Get all informations from cards
        let title = item.querySelector("div > .cloudbot-store-item__title:first-of-type").innerText.trim();
        let description = item.querySelector(".cloudbot-store-item__description").innerText.trim();
        let stock = item.querySelector(".cloudbot-store-item__badge .s-badge").innerText.trim().replace("Remaining", '');
        let cost = item.querySelector("div > .cloudbot-store-item__title:last-of-type").textContent.replace(/\D/g, '');

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
    document.querySelector("#cs-30bfba7c-b1e9-47a4-b4b9-9ffa59855a5c").style.overflow = "auto"; // Add scroll bar
}

function show_redemption_history() {
    window.open("https://streamlabs.com/dashboard#/cloudbot/store/redemptions", "_blank").focus();
}

function toggle_hidden_itemlist() {
    let hidden_items = get_hidden_items_array();
    let items = document.querySelectorAll(".cloudbot-store-item"); // Get all items in store
    items.forEach(function(item) {
        let title = get_item_title(item);
        if(hidden_items.includes(title))
            item.classList.toggle("hide-item");
    })
}

function gray_out_hidden_items() {
    let hidden_items = get_hidden_items_array();
    let items = document.querySelectorAll(".cloudbot-store-item"); // Get all items in store
    items.forEach(function(item) {
        let title = get_item_title(item);
        if(hidden_items.includes(title)) {
            item.classList.add("gray-out-item");
        }
    });
}

function sort_by_price() {
    let descending = GM_config.get("sort_by_price_descending");
    let list = document.querySelector(".cloudbot-store__items"); // Get container with the items in store
    let nodesToSort = list.querySelectorAll(".cloudbot-store-item"); // Get all items in store

    Array.prototype.map.call(nodesToSort, function(node) {
        return {
            node: node,
            relevantText: node.querySelector('div > .cloudbot-store-item__title:last-of-type').textContent.replace(/\D/g, '') // Remove all symbols except numbers
        };
    }).sort(function(a, b) {
        // Check if descending is enabled, if it is than a and b must be switched
        return descending ? b.relevantText.localeCompare(a.relevantText, undefined, {'numeric': true}) : a.relevantText.localeCompare(b.relevantText, undefined, {'numeric': true})
    }).forEach(function(item) {
        list.appendChild(item.node);
    });
}

function magnifying_glass_buttons() {
    let items = document.querySelectorAll(".cloudbot-store-item");
    let magnifying_glass_button = `<div class="magnifying-glass-container" onclick="event.stopPropagation()"><div class="ico ico-mglass"></div></div>`;
    items.forEach((item) => {
        item.insertAdjacentHTML('afterbegin', magnifying_glass_button);
        item.querySelector(".magnifying-glass-container").addEventListener("click", search_on_steam, false);
    });
}

function search_on_steam(event) {
    let item = event.target; // Get the item
    while(item.classList.contains("cloudbot-store-item") === false) // Go up till you reach the item
        item = item.parentNode;

    let title = get_item_title(item);
    window.open(`https://store.steampowered.com/search/?term=${title}`, "_blank");
}

function hide_item_buttons() {
    let items = document.querySelectorAll(".cloudbot-store-item");
    let eye_button = `<div class="eye-slash-container" onclick="event.stopPropagation()" ><div class="eye slash"><div></div><div></div></div></div>`;

    items.forEach((item) => {
        let hidden_items = get_hidden_items_array();
        let title = get_item_title(item);
        if(!hidden_items.includes(title)) {
            item.insertAdjacentHTML('afterbegin', eye_button);
            item.querySelector(".eye-slash-container").addEventListener("click", add_to_hidden, false);
        }
    });
}

function add_to_hidden(event) {
    let item = event.target; // Get the item
    while(item.classList.contains("cloudbot-store-item") === false) // Go up till you reach the item
        item = item.parentNode;

    let add_to_hidden_button = item.querySelector(".eye-slash-container");
    add_to_hidden_button.remove(); // Remove the button

    let title = get_item_title(item);
    GM_config.set("items_to_hide", get_prepared_items_to_hide(title)); // Override old list

    if(GM_config.get("hide_items_from_list_by_default"))
        item.classList.add("gray-out-item");

    let hide_itemlist_enabled = document.querySelector("#toggle-hide-itemlist").checked;
    if(hide_itemlist_enabled)
        item.classList.add("hide-item");
}

function get_item_title(item) {
    return item.querySelector(".cloudbot-store-item__title").innerHTML.trim();
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

function get_hidden_items_array() {
    let hidden_items = GM_config.get("items_to_hide").split("\n");
    hidden_items = hidden_items.map(function (el) {return el.trim();}); // Trim away the spaces
    hidden_items = hidden_items.filter((el) => el !== ""); // Remove all empty lines (shouldn't happen anymore, but safe is safe)
    return hidden_items;
}

GM_addStyle(`
.cloudbot-store-item__badge {
  top:unset !important;
  bottom: 8px;
}

.cloudbot-store-item__badge .s-badge {
  color: #000 !important;
}

body .night .root-element-for-custom-colors .v--modal {
  background-color: #000 !important;
}

.cloudbot-store__header .cloudbot-store__loyalty {font-size: 30px;}

/* 100 % Store height */
#cs-30bfba7c-b1e9-47a4-b4b9-9ffa59855a5c { position: unset; }
#cs-8089a7aa-c2f6-4b4a-b664-df5e4729c32b .site-section-child-container { height: unset !important; }

/* Small monitor sidebar fix */
#cs-cbbab448-e39c-4851-b7f1-3ac264471e5e > .site-section-content > .site-section-child-container:first-of-type {height: unset !important;}

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



#custom_container {
  width: 100%;
  background-size: cover;
  background-position: center center;
  background-color: rgba(0, 0, 0, 0.63);
  border-radius: 8px;
  padding: 16px;
}

#gm_config_button,
#get-itemlist,
#get-item-table,
#redemption_history,
#download-item-table{
  display: block;
  margin-left: auto;
  margin-right: auto;
  border: 1px solid;
  border-radius: 20px;
  padding: 4px 16px;
  cursor: pointer;
  text-align: center;
  margin-top:15px;
}

.hide-item {display: none;}

.gray-out-item {filter: saturate(0%);}

.sort-buttons-container {display: grid;  grid-template-columns: 50% 50%;}

.slidercontainer {letter-spacing: 1.2px;padding-left: 16px;padding-right: 16px;font-size: 12px;line-height: 36px;user-select: none;text-transform: uppercase;font-weight: 600; margin-top: 15px;}

.slidercontainer > .switch {margin-right: 10px;}

.item-table { margin-top:15px; width: 100%; }

.item-table td, .item-table th {border: 2px solid #fff !important;padding: 10px;}

.table-item-cost,.table-item-stock {text-align:center;}
`);