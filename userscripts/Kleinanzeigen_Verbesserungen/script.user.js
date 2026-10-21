// ==UserScript==
// @name            Kleinanzeigen improvements
// @name:de         Kleinanzeigen Verbesserungen
// @namespace       https://kurotaku.de
// @version         2.8
// @description     Some improvements for kleinanzeigen.de
// @description:de  Einige Verbesserungen für kleinanzeigen.de
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.kleinanzeigen.de/*
// @icon            https://www.kleinanzeigen.de/favicon.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kleinanzeigen_Verbesserungen/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kleinanzeigen_Verbesserungen/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
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


(async function () {
    await init_gm_config();
    main();
})();

async function main() {
    let loc = window.location.href;

    if (GM_config.get("remove_ads"))
        adblock();

    if (GM_config.get("enlarge_images"))
        image_enlarge_preview();

    if (GM_config.get("show_screenshot_mode_button") && loc.includes("m-nachrichten.html"))
        show_screenshot_mode_button();

    if (GM_config.get("hide_paid_features"))
        hide_paid_features();

    if (GM_config.get("hide_newletter_checkbox"))
        hide_newletter_checkbox();

    if (GM_config.get("hide_ai_suggestion"))
        hide_ai_suggestion();

    if (loc.includes("p-anzeige-aufgeben"))
        anzeige_aufgeben_seite();

    if (GM_config.get("meins_to_nachrichten"))
        meins_to_nachrichten();

    if (GM_config.get("filter_active") && loc.includes("s-"))
        filter_search_containing_words();
}

async function init_gm_config() {
    const config_id = "configuration_klever";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Einstellungen", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Kleinanzeigen Verbesserungen',
        fields: {
            remove_ads: {
                section: ['Allgemeine Einstellungen'],
                type: 'checkbox',
                default: true,
                label: 'Werbungen verbergen<br>Ersetzt keinen richtigen Adblocker! Benutze zusätzlich: uBlock Origin',
            },
            enlarge_images: {
                type: 'checkbox',
                default: true,
                label: 'Bildvergrößerung beim Hovern während der Suche',
            },
            meins_to_nachrichten: {
                type: 'checkbox',
                default: true,
                label: 'Nachrichten statt Anzeigen bei "Meins"',
            },
            show_screenshot_mode_button: {
                type: 'checkbox',
                default: true,
                label: 'Screenshot Modus Button aktivieren',
            },
            hide_paid_features: {
                type: 'checkbox',
                default: false,
                label: 'Verberge fast alle bezahlbare Zusatzoptionen',
            },
            hide_newletter_checkbox: {
                type: 'checkbox',
                default: true,
                label: 'Verberge die Newsletter anmeldung über dem "Anzeige aufgeben" Button',
            },
            hide_ai_suggestion: {
                type: 'checkbox',
                default: false,
                label: 'Verberge den KI Banner "Mach deine Anzeige schnell mit KI" beim Inserieren',
            },
            disable_buy_now: {
                section: ['"Anzeige aufgeben" Standardwerte<br><span style="font-size: 0.8em;">Warnung: Wird hier irgendein Standardwert durch das Script ausgefüllt, wird das KI-Vorschlagsbanner von der Seite automatisch mit entfernt.</span>'],
                type: 'checkbox',
                default: true,
                label: 'Direkt kaufen standardmäßig deaktivieren',
            },
            default_price: {
                label: 'Preis',
                type: 'text',
            },
            default_price_type: {
                label: 'Preistyp',
                type: 'select',
                default: 'Festpreis',
                options: ['Festpreis', 'VB', 'Zu verschenken'],
            },
            default_only_pickup: {
                type: 'checkbox',
                default: false,
                label: 'Standardmäßig nur Abholung',
            },
            default_description: {
                label: 'Beschreibung',
                type: 'textarea',
            },
            filter_active: {
                section: ['Suchfilter'],
                type: 'checkbox',
                default: false,
                label: 'Filterfunktion aktivieren',
            },
            filter_search_containing_words: {
                label: 'Filterbegriffe (jeder Begriff ein eine neue Zeile)',
                type: 'textarea',
            },
        },
        events: {
            init: () => {GM_config.set("filter_search_containing_words", GM_config.get("filter_search_containing_words").replace(/^\s*$(?:\r\n?|\n)/gm, ""))}, // To prevent blank lines
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

async function adblock() {
    // Try 10 times to remove the ads
    for(let i = 0; i < 10; i++) {
        remove_single_element(".site-base--left-banner > div");
        remove_single_element(".site-base--right-banner > div");
        remove_single_element("#brws_banner-supersize");
        remove_single_element("#btf-billboard");
        remove_array_elements("[id^='liberty']");
        await sleep_s(1);
    }
}

function remove_single_element(selector) {
    document.querySelector(selector)?.remove();
}

function remove_array_elements(selector) {
    let elements = document.querySelectorAll(selector);
    if(elements && elements.length > 0)
        elements.forEach((element) => element.remove());
}

function image_enlarge_preview() {
    // Covers the card layout of the search results (data-image-container) as well as the list and tile layouts
    let imageboxes = document.querySelectorAll(`
        li[data-clickable="card"] [data-image-container] img,
        .ad-listitem .srpimagebox img,
        .itemtile-fullpic .itemtile-header img
    `);
    GM_addStyle(`
    /* The enlarged image is hidden via scale instead of display so that the grow animation can be transitioned. Visibility is switched after the transition ends so the hidden image never blocks clicks. */
    .enlarged-image
    {visibility: hidden; pointer-events: none; transform: scale(0.5); transform-origin: top left; transition: transform 0.5s ease, visibility 0s linear 0.5s; height: unset !important; position: absolute; top:0; left:0; z-index: 100 !important; min-width:200px; max-width: 400px !important; max-height: 400px !important; width: fit-content !important; border-radius: 8px;}

    .itemtile-header:hover .enlarged-image
    {max-width:300px !important; max-height:300px !important}

    /* Pointer events are enabled while hovered so the pointer stays inside the hover area when it moves over the enlarged part of the image */
    .aditem-image:hover .enlarged-image,
    .itemtile-header:hover .enlarged-image,
    [data-image-container]:hover .enlarged-image
    {visibility: visible; pointer-events: auto; transform: scale(1); transition: transform 0.5s ease, visibility 0s;}

    .ad-listitem .aditem-image
    {z-index: unset;}

    .ad-listitem .aditem-image .imagebox.srpimagebox,
    .itemtile-fullpic .itemtile-header,
    li[data-clickable="card"] [data-image-container]
    {overflow: unset !important}

    .ad-listitem .aditem-image .imagebox.srpimagebox img,
    .itemtile-fullpic .itemtile-header img
    {z-index:2}

    /* Resting state: z-index is a numeric value so it can be interpolated. After the hover ends it falls linearly from the hover level to the resting level over the shrink duration. The card that is left therefore always stays below a card that is hovered next, while still being above all resting cards until its image has fully shrunk. */
    li[data-clickable="card"]
    {position: relative; z-index: 0; transition: z-index 0.5s linear;}

    li[data-clickable="card"] article > div:has([data-image-container])
    {z-index: 1; transition: z-index 0.5s linear;}

    /* The image column and the text column of a card are sibling stacking contexts, so the later text column would paint over the enlarged image. The hovered image column is lifted above it instantly. */
    li[data-clickable="card"] article > div:has([data-image-container]:hover)
    {z-index: 2000; transition: z-index 0s;}

    /* The whole hovered card is lifted above all other cards, including a card whose image is still shrinking, so the enlarged image is never clipped by a neighbor. */
    li[data-clickable="card"]:has([data-image-container]:hover)
    {z-index: 2000; transition: z-index 0s;}
    `);

    imageboxes.forEach((element) => {
        let data_imgsrc = element.getAttribute("src");
        if(data_imgsrc) { // Check if an image exist
            let img_url = `${data_imgsrc.split("?")[0]}?rule=$_59.JPG`;
            let new_element = `<img src="${img_url}" class="enlarged-image">`;
            element.insertAdjacentHTML("beforebegin", new_element);
        }
    });
}

function show_screenshot_mode_button() { // Credits go to Shirotaku who had the idea and gave me his script, I just added it here with a couple of changes
    wait_for_element('.Messagebox .infinite-scroll-component').then(async () => {
        let button = `<button id="button_screenshot_mode" class="Button--Body">Screenshotmodus aktivieren</button>`;
        let top_bar = document.querySelector(".Messagebox .Messagebox--Grid--Row1");
        top_bar.style.paddingRight = "10px";
        top_bar.style.marginRight = "0%";
        top_bar.insertAdjacentHTML("beforeend", button);
        document.querySelector("#button_screenshot_mode").addEventListener("click", async () => {
            if (!document.querySelector(".Messagebox--Grid--Row2--Col1").hidden) {
                document.querySelector(".Messagebox--Grid--Row2--Col1").hidden = true;
                document.querySelector(".Messagebox--Grid--Row2--Col2").style.width = "100%";
                document.querySelector(".Messagebox--Grid--Row2").style.height = "100%";
                document.querySelector(".Conversation--Grid--Row3").style.height = `\"${document.querySelector(".MessageList").scrollHeight}px\"`;
                document.querySelector("#button_screenshot_mode").innerHTML = "Screenshotmodus deaktivieren";
            } else {
                document.querySelector(".Messagebox--Grid--Row2--Col1").hidden = false;
                document.querySelector(".Messagebox--Grid--Row2").style.height = '';
                document.querySelector(".Messagebox--Grid--Row2--Col2").style.width = '';
                document.querySelector("#button_screenshot_mode").innerHTML = "Screenshotmodus aktivieren";
            }
        });
    });
}

function hide_paid_features() {
    // Produktseite Box ganz oben
    // Meine Anzeigen
    // Anzeige aufgeben "Mehr Sichtbarkeit für deine Anzeige" (the fieldset is identified through its screen reader heading because it has no id of its own)
    GM_addStyle(`#pvap-featrs #command,.manageaditem-featuretable,#postad-features,fieldset:has(#ad-feature-group) {display : none;}`);
}

function hide_newletter_checkbox() {
    // The first selector targets the old layout, the second one the checkbox label of the current posting form
    GM_addStyle(`#postad-publish .l-container-row .l-row.a-double-margin.l-container-row,label[for="ad-marketing-consent"] {display : none;}`);
}

function hide_ai_suggestion() {
    // The banner is the only block in the first span of the posting form island and is identified by its sparkle icon
    GM_addStyle(`astro-island > span > div:has(> div > svg[data-title="aiSparkleOutline"]) {display : none !important;}`);
}

// Elements that already received their default value, so a re-render or a manual change by the user is never overwritten again
const handled_elements = new WeakSet();
// Ids of fields the user edited by hand. Defaults are never applied to these fields.
const user_touched_ids = new Set();
let post_ad_observer = null;

function anzeige_aufgeben_seite() {
    // Only trusted events come from a real user interaction, scripted input events are not trusted
    document.addEventListener("input", (event) => {
        if (event.isTrusted && event.target?.id)
            user_touched_ids.add(event.target.id);
    }, true);

    // The observer is required because shipping and buy now options only exist after a category was chosen, and the form is re-rendered on every category change
    let apply_scheduled = false;
    post_ad_observer = new MutationObserver(() => {
        if (apply_scheduled)
            return;
        apply_scheduled = true;
        // Batch bursts of DOM mutations into a single run per frame
        requestAnimationFrame(() => {
            apply_scheduled = false;
            apply_post_ad_defaults();
        });
    });
    // The ssr attribute is removed from the astro-island when hydration finishes, so attribute changes are observed as well
    post_ad_observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["ssr"] });
    apply_post_ad_defaults();
}

function set_react_value(element, value) {
    // React tracks input values through the prototype setter. Assigning element.value directly would be ignored by its change detection, so the native setter is used followed by bubbling input and change events.
    const prototype = Object.getPrototypeOf(element);
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
}

function fill_field(selector, value, attempt = 0) {
    const field = document.querySelector(selector);

    // Skip fields that are missing, already filled or were edited by the user
    if (!field || !value || field.value || user_touched_ids.has(field.id))
        return;

    set_react_value(field, value);

    // The framework can discard the value while it is re-rendering, so verify shortly after and retry a few times
    setTimeout(() => {
        if (field.isConnected && !field.value && attempt < 5)
            fill_field(selector, value, attempt + 1);
    }, 300);
}

function select_radio(input_selector) {
    const input = document.querySelector(input_selector);
    if (!input || handled_elements.has(input))
        return;
    handled_elements.add(input);

    // Clicking the label is the same interaction a user performs and works with the visually hidden input
    if (!input.checked)
        document.querySelector(`label[for="${input.id}"]`)?.click();
}

async function select_price_type(combobox, wanted_label) {
    const selected_label = document.querySelector("#ad-price-type-selected-option")?.textContent.trim();
    if (!wanted_label || selected_label === wanted_label)
        return;

    combobox.click();

    // The options are rendered after the dropdown opens, so poll for up to 2 seconds. The option texts are identical to the labels in the configuration.
    for (let i = 0; i < 20; i++) {
        await sleep_s(0.1);
        const option = Array.from(document.querySelectorAll('[role="option"]')).find((element) => element.textContent.trim() === wanted_label);
        if (option) {
            option.click();
            return;
        }
    }

    // Close the dropdown again if the option could not be found
    if (combobox.getAttribute("aria-expanded") === "true")
        combobox.click();
}

async function apply_post_ad_defaults() {
    // Values set before hydration would be discarded by the framework, so wait until the island is hydrated
    if (document.querySelector("astro-island[ssr]"))
        return;

    // Price and description are re-applied while they are empty, because the form can reset them when the category changes
    fill_field("#ad-price-amount", GM_config.get("default_price"));
    fill_field("#ad-description", GM_config.get("default_description"));

    // Price type
    const combobox_price_type = document.querySelector("#ad-price-type");
    if (combobox_price_type && !handled_elements.has(combobox_price_type)) {
        handled_elements.add(combobox_price_type);
        await select_price_type(combobox_price_type, GM_config.get("default_price_type"));
    }

    // Shipping (only available after a category was chosen)
    if (GM_config.get("default_only_pickup"))
        select_radio("#ad-shipping-enabled-no");

    // Buy now (only available after a category was chosen and only for eligible categories)
    if (GM_config.get("disable_buy_now"))
        select_radio("#ad-buy-now-false");
}

async function meins_to_nachrichten() {
    const selector_parent = 'li[data-testid="nav-menu-item-my-ads-item"], #site-mainnav-my';
    const selector_button = '#nav-menu-item-my-ads, #site-mainnav-my-link';
    const selector_text = '.text-bodyRegularStrong, .ka-site-mainnav--item--text';
    const clone_id = "nav-menu-item-my-ads-clone";

    // Inject styles: hide original buttons and ensure only our clone is visible
    GM_addStyle(`
        ${selector_parent} { width: 70px !important; }
        ${selector_button}:not([id="${clone_id}"]) { display: none !important; }
        #${clone_id} { display: flex !important; }
    `);

    // Infinite loop to handle dynamic re-rendering of the navigation menu
    while (true) {
        // Wait until the parent navigation item is available in the DOM
        const parent_li = await wait_for_element(selector_parent);
        const original_button = parent_li.querySelector(selector_button);

        // Check if the original exists and our clone is not already present
        if (original_button && !parent_li.querySelector(`#${clone_id}`)) {
            // Create a deep copy of the original button
            const clone = original_button.cloneNode(true);
            clone.id = clone_id;

            // Update label to "Nachrichten" before injecting the clone
            const text_label = clone.querySelector(selector_text);
            if (text_label)
                text_label.innerHTML = "Nachrichten";

            // Forward hover event to the hidden original button to trigger the panel
            clone.onmouseenter = () => {
                original_button.click();
            };

            // Override click to navigate directly to the messages page
            clone.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = "/m-nachrichten.html";
            };

            // Insert the customized clone into the DOM next to the hidden original
            parent_li.insertBefore(clone, original_button);
        }

        // Wait until the clone is removed (e.g., by a page update) before restarting the loop
        await wait_for_element_to_disappear(`#${clone_id}`);
    }
}

function filter_search_containing_words() {
    let items = document.querySelectorAll(".ad-listitem"); // Get all items from page
    let words = GM_config.get("filter_search_containing_words").split("\n"); // Get filter words as array
    let removed_counter = 0;
    if(words && words.length > 0 && words[0].trim() != "") {
        items.forEach(item => {
            let title = item.querySelector(".text-module-begin a")?.textContent.toLowerCase().trim(); // Prepare the title for check
            for(let i = 0; i < words.length; i++) {
                if(title?.includes(words[i].toLowerCase().trim())) { // Check if title contains a word from filter list
                    item.remove();
                    removed_counter++;
                    break;
                }
            }
        });
        let breadcrumb = document.querySelector(".breadcrump-summary");
        if(breadcrumb)
            breadcrumb.textContent += ` | ${removed_counter} rausgefiltert`;
    }
}