// ==UserScript==
// @name            Highlight and Filter Searchengine Results
// @name:de         Hervorheben und Filtern Suchmaschinen Ergebnisse
// @namespace       https://kurotaku.de
// @version         1.0.2
// @description     Highlight certain search results and remove blacklisted domains
// @description:de  Bestimmte Suchergebnisse hervorheben und Domains aus der Blacklist entfernen
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @include         https://www.startpage.com/do/search*
// @include         https://www.startpage.com/sp/search*
// @include         https://duckduckgo.com/*&q=*
// @include         https://www.google.*/search?*
// @icon            https://www.startpage.com/sp/cdn/favicons/favicon-32x32-gradient.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Highlight_and_Filter_Searchengine_Results/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Highlight_and_Filter_Searchengine_Results/script.user.js
// @require         https://cdn.jsdelivr.net/gh/Kurotaku-sama/Userscripts@main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==


// Sample SITE_DATA
// websitename: {
//     "insertion_container": "container that is a parent of the result_container and will contain the removed and highlighted results containers",
//     "result_container": "container that holds the search results",
//     "result_selector": "direct child elements of result_container that are individual search results",
//     "domain_selector": "first link inside result used to extract the domain",
//     "style_removed_container": "optional inline styles for the removed results container",
//     "style_highlighted_results_container": "optional inline styles for the highlighted results container"
// }

const SITE_DATA = {
    startpage: {
        site_key: "startpage",
        insertion_container: "#main",
        result_container: ".w-gl",
        result_selector: ":scope > .result",
        domain_selector: "a[href^='http']",
    },
    google: {
        site_key: "google",
        insertion_container: "#center_col",
        result_container: "#search",
        result_selector: ":scope > .g, :scope > div > div > div > div",
        domain_selector: "a[href^='http']",
    },
    duckduckgo: {
        site_key: "duckduckgo",
        insertion_container: "section[data-area='mainline']",
        result_container: "section[data-area='mainline'] > ol",
        result_selector: ":scope > li",
        domain_selector: "a[href^='http']",
        style_highlighted_results_container: "list-style: none;",
    },
};

const CURRENT_DOMAIN = window.location.hostname;
let DATA = null;

switch(true) {
    case CURRENT_DOMAIN.includes("startpage.com"):
        DATA = SITE_DATA.startpage;
        break;
    case CURRENT_DOMAIN.includes("google."):
        DATA = SITE_DATA.google;
        break;
    case CURRENT_DOMAIN.includes("duckduckgo.com"):
        DATA = SITE_DATA.duckduckgo;
        break;
    default:
        throw new Error("Unsupported domain, script stopped");
}

(async function() {
    await init_gm_config();

    // If page is google and searchtype is images, then abort
    if(DATA.site_key === "google") {
        const params = new URLSearchParams(window.location.search);
        if (params.get('udm') === '2')
            return;
    }

    await create_containers();

    if(DATA.site_key === "startpage" && GM_config.get("startpage_sponsorblock"))
        GM_addStyle(`
            ${DATA.insertion_container} > .result,
            #main > .result,
            #main iframe {
                display: none !important;
            }
        `);

    // Only grab results if at least one feature is enabled
    if(GM_config.get("highlight_enabled") || GM_config.get("blacklist_filter_enabled") || GM_config.get("special_sections_filter_enabled")) {
        add_dynamic_styles();

        const all_results = await get_resultlist();

        if(GM_config.get("highlight_enabled"))
            highlight_results(all_results);

        if(GM_config.get("blacklist_filter_enabled"))
            filter_blacklisted(all_results);

        if(GM_config.get("special_sections_filter_enabled"))
            remove_special_sections(all_results);

        if(GM_config.get("search_tabs_enabled"))
            filter_search_tabs();
    }
})();

// --------------------------
// GM_config initialization
// --------------------------
async function init_gm_config() {
    const config_id = "configuration_hiafisere";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Highlight and Filter Searchengine Results',
        fields: {
            highlight_enabled: {
                section: ['Highlight'],
                type: 'checkbox',
                default: true,
                label: 'Enable Highlighting',
            },
            highlight_terms: {
                label: 'Highlight Domain Terms<br>Enter one domain per line, e.g. "example.com".<br>Optional: prefix with site keys separated by ";" followed by "|", e.g. "google;duckduckgo|example.com"',
                type: 'textarea',
            },
            highlight_styles: {
                label: 'CSS Styles (this will be applied to highlighted search results)',
                type: 'input',
                default: 'padding: 20px; border: cyan 2px solid;',
            },
            blacklist_filter_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable Blacklist Filter',
                section: ['Blacklist Filter'],
            },
            blacklist_filter_notification_enabled: {
                type: 'checkbox',
                default: false,
                label: 'Do not show removed results notification',
            },
            blacklist_filter_terms: {
                label: 'Blacklist Domain Terms<br>Enter one domain per line, e.g. "example.com".<br>Optional: prefix with site keys separated by ";" followed by "|", e.g. "google;duckduckgo|example.com"',
                type: 'textarea',
            },
            blacklist_styles: {
                label: 'CSS Styles (this will be applied to blacklisted search results)',
                type: 'input',
                default: 'padding: 20px; border: red 2px solid',
            },
            search_tabs_enabled: {
                section: ['Search Tabs (Only Google)'],
                type: 'checkbox',
                default: false,
                label: 'Enable Tab Rearrange/Filter',
            },
            search_tabs_order: {
                label: 'Tab Order (semicolon separated, e.g. "All;Web;Images;Videos;Short videos")',
                type: 'text',
            },
            search_tabs_remove: {
                label: 'Tabs to Remove/Hide (semicolon separated, e.g. "News;Products")',
                type: 'text',
            },
            startpage_sponsorblock: {
                section: ['Miscellaneous'],
                type: 'checkbox',
                default: true,
                label: 'Sponsorblock on Startpage',
            },
            special_sections_filter_enabled: {
                type: 'checkbox',
                default: false,
                label: 'Remove Special Sections on Google & DuckDuckGo (Tables, Sitelinks etc.)',
            },
        },
        events: {
            init: () => {
                GM_config.set("highlight_terms", GM_config.get("highlight_terms").replace(/^\s*$(?:\r\n?|\n)/gm, ""));
                GM_config.set("blacklist_filter_terms", GM_config.get("blacklist_filter_terms").replace(/^\s*$(?:\r\n?|\n)/gm, ""));
            },
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
}

// --------------------------
// Containers creation
// --------------------------
async function create_containers() {
    const container = await wait_for_element(DATA.insertion_container);

    // removed_results_container
    if(!document.getElementById("removed_results_container")) {
        const style = DATA.style_removed_container ? ` style="${DATA.style_removed_container}"` : "";
        container.insertAdjacentHTML("afterbegin", `<div class="removed_results_container"${style}></div>`);
    }

    // highlighted_results_container
    if(!document.getElementById("highlighted_results_container")) {
        const style = DATA.style_highlighted_results_container ? ` style="${DATA.style_highlighted_results_container}"` : "";
        container.insertAdjacentHTML("afterbegin", `<div class="highlighted_results_container"${style}></div>`);
    }
}

// --------------------------
// Extract domain
// --------------------------
function extract_domain(result) {
    // Select the element containing the link
    const el = result.querySelector(DATA.domain_selector);

    if(el && el.href) {
        try {
            // Parse the hostname and remove "www."
            let host = new URL(el.href).hostname.replace(/^www\./, "").toLowerCase();

            // Keep only the last two parts (example.com) if more than 2 parts
            let parts = host.split(".");
            if(parts.length > 2) host = parts.slice(-2).join(".");

            return host;
        } catch(e) {}; // Ignore parsing errors
    }

    // Return empty string if no valid domain found
    return "";
}

// --------------------------
// Highlighting
// --------------------------
function highlight_results(results) {
    const highlight_terms = prepare_terms("highlight_terms"); // Get terms from config
    const container = document.querySelector(".highlighted_results_container"); // Where highlighted results go

    let to_highlight = [];

    results.forEach((result, i) => {
        // Extract the domain from the current search result
        const domain = extract_domain(result);
        // Check if the domain matches any of the configured highlight terms for this site (or global)
        const match_obj = highlight_terms.find(obj => ( !obj.sites || obj.sites.includes(DATA.site_key) ) && domain.includes(obj.term));

        // If a match is found, add the result to the list to be highlighted
        if(match_obj)
            to_highlight.push({result, index: highlight_terms.length - 1});
    });

    // Sort so higher priority terms appear first
    to_highlight.sort((a,b) => b.index - a.index);

    // Move and style highlighted results
    to_highlight.forEach((obj, i) => {
        const {result, index} = obj;
        result.parentNode.removeChild(result);
        container.appendChild(result);
        style_result(result, index, i === to_highlight.length-1); // last gets extra margin
    });
}

// --------------------------
// Blacklist filtering
// --------------------------
function filter_blacklisted(results) {
    // Get blacklist terms from config
    const blacklist_terms = prepare_terms("blacklist_filter_terms");
    let removed_count = 0;

    results.forEach(result => {
        // Extract the domain from the current search result
        const domain = extract_domain(result);
        // Check if the domain matches any of the blacklist terms for this site (or global)
        if(blacklist_terms.some(obj => (!obj.sites || obj.sites.includes(DATA.site_key)) && domain.includes(obj.term))) {
            // Add classes instead of removing
            result.classList.add("blacklisted_result", "hidden");
            removed_count++;
        }
    });

    // Update notification area if results were removed
    const removed_container = document.querySelector(".removed_results_container");

    if(removed_container && removed_count > 0 && !GM_config.get("blacklist_filter_notification_enabled")) {
        const html = `
            <span class="removed_blacklist_text">Removed ${removed_count} blacklisted results</span>
            <label class="blacklist_toggle_wrapper">
                <input type="checkbox" id="blacklist_toggle">
                <span class="blacklist_toggle_slider"></span>
            </label>
        `;
        removed_container.innerHTML = html;

        removed_container.querySelector("#blacklist_toggle").addEventListener("change", () => {
            document.querySelectorAll(".blacklisted_result").forEach(el => el.classList.toggle("hidden"));
        });
    }
}

// --------------------------
// Search tabs filter/sort
// --------------------------
function filter_search_tabs() {
    // Select the container that holds all tabs
    const container = document.querySelector("div[role='list']");
    if(!container) return;

    // Collect all direct tab items (role=listitem)
    const all_tabs = Array.from(container.querySelectorAll("div[role='listitem']"));
    if(all_tabs.length === 0) return;

    // Read user configuration for ordering and removing tabs
    const order_config = GM_config.get("search_tabs_order")
    .split(";")
    .map(t => t.trim().toLowerCase())
    .filter(t => t);

    const remove_config = GM_config.get("search_tabs_remove")
    .split(";")
    .map(t => t.trim().toLowerCase())
    .filter(t => t);

    // Return early if both configs are empty
    if(order_config.length === 0 && remove_config.length === 0)
        return;

    // Helper: get visible tab name text robustly
    const get_tab_name = el => {
        const link = el.querySelector("a"); // primary link inside tab
        if(link) return link.textContent.trim();
        // fallback: any visible text
        return el.textContent.trim();
    };

    // Remove tabs that are in the remove_config
    const filtered_tabs = all_tabs.filter(tab => !remove_config.includes(get_tab_name(tab).toLowerCase()));

    // Sort tabs according to order_config
    const sorted_tabs = [];
    order_config.forEach(name => {
        filtered_tabs.forEach(tab => {
            if(get_tab_name(tab).toLowerCase() === name && !sorted_tabs.includes(tab))
                sorted_tabs.push(tab);
        });
    });

    // Append any remaining tabs that were not in order_config
    filtered_tabs.forEach(tab => {
        if(!sorted_tabs.includes(tab)) sorted_tabs.push(tab);
    });

    // Clear original container and append new order
    container.innerHTML = "";
    sorted_tabs.forEach(tab => container.appendChild(tab));
}

// --------------------------
// Special sections removal
// --------------------------
function remove_special_sections(results) {
    switch (DATA.site_key) {
        case "google":
            results.forEach(result => {
                const tables = result.querySelectorAll("table");
                tables.forEach(table => table.style.display = "none");

                const sitelinks = result.querySelectorAll(".sld, .mslg");
                sitelinks.forEach(sl => sl.style.display = "none");
            })
            break;

        case "duckduckgo":
            results.forEach(result => {
                const ul = result.querySelector("article ul");
                if(ul && ul.parentNode && ul.parentNode.parentNode)
                    ul.parentNode.parentNode.style.display = "none";
            })
            break;

        default:
            break;
    }
}

// --------------------------
// Helper functions
// --------------------------
// Prepare list of terms from GM_config with optional site filtering
function prepare_terms(config_key) {
    return GM_config.get(config_key)
        .split("\n") // Split lines by newline
        .map(line => line.trim()) // Remove leading/trailing whitespace
        .filter(line => line) // Remove empty lines
        .map(line => {
        const parts = line.split("|"); // Split site keys from term
        // Skip lines with more than 2 parts
        if(parts.length > 2) return null;

        // If no site keys, treat as global term
        if(parts.length === 1) return {sites: null, term: parts[0].toLowerCase()};

        // Parse multiple site keys separated by ";"
        const sites = parts[0].split(";").map(s => s.trim().toLowerCase());
        return {sites, term: parts[1].toLowerCase()};
    })
        .filter(x => x); // Remove null entries
}

// Apply custom style and re-order a single search result
function style_result(result, index, last) {
    // Move result up (negative order puts it first)
    result.style.order = -1 - index;

    // NOT USED ANYMORE STYLE IS ADDED VIA CLASS
    // Append user CSS styles from GM_config
    // result.setAttribute("style", result.getAttribute("style") + GM_config.get("highlight_styles"))

    // Add CSS class instead
    result.classList.add("highlighted_result");

    // Ensure max width
    result.style.maxWidth = "100%";

    // Add spacing only for the last highlighted element
    result.style.margin = !last ? "unset" : "0 0 30px 0";
}

// Collect all search results on the page (waits until first result exists)
async function get_resultlist() {
    // Wait until container exists
    const container = await wait_for_element(DATA.result_container);
    if(!container) return [];

    // Wait until at least one result exists inside the container
    await wait_for_element(DATA.result_selector, container);

    // Grab all results
    const results = Array.from(container.querySelectorAll(DATA.result_selector));
    return results;
}

// --------------------------
// Styles
// --------------------------
function add_dynamic_styles() {
    // Get highlight styles from GM_config, split by semicolon into individual CSS rules
    const highlight_styles = GM_config.get("highlight_styles")
    .split(";") // Split string into array at each semicolon
    .map(s => s.trim()) // Remove leading/trailing whitespace from each rule
    .filter(Boolean) // Remove any empty strings resulting from extra semicolons
    .map(s => s.endsWith("!") ? s : `${s} !important`) // Append !important if not already present
    .join("; "); // Join back into a single string separated by semicolons;

    // Get blacklist styles from GM_config, process in the same way
    const blacklist_styles = GM_config.get("blacklist_styles")
    .split(";") // Split string into array at each semicolon
    .map(s => s.trim()) // Trim whitespace
    .filter(Boolean) // Remove empty entries
    .map(s => s.endsWith("!") ? s : `${s} !important`) // Append !important
    .join("; "); // Join back into a single string;

    // Inject the processed styles into the page using GM_addStyle
    GM_addStyle(`
    .highlighted_result { ${highlight_styles} }
    .blacklisted_result { ${blacklist_styles} }
    `);
};

GM_addStyle(`
.hidden {
    display: none !important;
}

.highlighted_results_container {
    display: grid;
    grid-template-columns: 100%;
    margin-bottom: 20px;
}

.highlighted_results_container > div,
.highlighted_results_container > div > div,
.highlighted_results_container > div > div > div {
    margin: unset !important;
}

.removed_results_container {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    color: red;
    font-weight: bold;
    font-size: 14px;
}

.blacklist_toggle_wrapper {
    position: relative;
    width: 40px;
    height: 20px;
    cursor: pointer;
}

.blacklist_toggle_wrapper input {
    display: none;
}

.blacklist_toggle_slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: red;
    border-radius: 20px;
    transition: 0.3s;
}

.blacklist_toggle_slider::before {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    left: 2px;
    top: 2px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
}

#blacklist_toggle:checked + .blacklist_toggle_slider {
    background-color: #ccc;
}

#blacklist_toggle:checked + .blacklist_toggle_slider::before {
    transform: translateX(20px);
}
`);