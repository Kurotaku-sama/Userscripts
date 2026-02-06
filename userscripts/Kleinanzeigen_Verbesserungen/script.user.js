// ==UserScript==
// @name            Kleinanzeigen improvements
// @name:de         Kleinanzeigen Verbesserungen
// @namespace       https://kurotaku.de
// @version         2.7.3
// @description     Some improvements for kleinanzeigen.de
// @description:de  Einige Verbesserungen für kleinanzeigen.de
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.kleinanzeigen.de/*
// @icon            https://www.kleinanzeigen.de/favicon.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kleinanzeigen_Verbesserungen/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kleinanzeigen_Verbesserungen/script.user.js
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


(async function () {
    await init_gm_config();

    if (GM_config.get("script_enabled")) {
        if (window.location.href.includes("p-anzeige-aufgeben"))
            setup_html_observer();

        main();
    }
})();

async function main(second_call = false) {
    if(second_call) // Second call is required on the Inserieren page because it removed the whole HTML dom after automatically selecting a product category but doesn't reload the page
        await init_gm_config();

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

    if (loc.includes("p-anzeige-aufgeben-schritt2.html"))
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
            script_enabled: {
                section: ['Allgemeine Einstellungen'],
                type: 'checkbox',
                default: true,
                label: 'Aktiviere/Deaktiviere alle Verbesserungen',
            },
            remove_ads: {
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
            disable_auto_categorize: {
                section: ['"Anzeige aufgeben" Standardwerte'],
                type: 'checkbox',
                default: false,
                label: 'Deaktiviere automatische Kategorieermittlung anhand des Titels',
            },
            disable_buy_now: {
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
    let imageboxes = document.querySelectorAll(".ad-listitem .srpimagebox img, .itemtile-fullpic .itemtile-header img");
    GM_addStyle(`
    .enlarged-image
    {display: none; height: unset !important; position: absolute; top:0; left:0; z-index: 100 !important; min-width:200px; max-width: 400px !important; max-height: 400px !important; width: fit-content !important;}

     .itemtile-header:hover .enlarged-image
     {max-width:300px !important; max-height:300px !important}

    .aditem-image:hover .enlarged-image,
    .itemtile-header:hover .enlarged-image
    {display : block;}

    .ad-listitem .aditem-image
    {z-index: unset;}

    .ad-listitem .aditem-image .imagebox.srpimagebox,
    .itemtile-fullpic .itemtile-header
    {overflow: unset}

    .ad-listitem .aditem-image .imagebox.srpimagebox img,
    .itemtile-fullpic .itemtile-header img
    {z-index:2}
    `);

    imageboxes.forEach((element) => {
        let data_imgsrc = element.getAttribute("src");
        if(data_imgsrc) { // Check if an image exist
            let img_url = `${data_imgsrc.split("?")[0]}?rule=$_59.JPG`;
            let new_element = `<img src=${img_url} class='enlarged-image'>`;
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
    // Anzeige aufgeben "Verkaufschance erhöhen..."
    GM_addStyle(`#pvap-featrs #command,.manageaditem-featuretable,#postad-features {display : none;}`);
}

function hide_newletter_checkbox() {
    GM_addStyle(`#postad-publish .l-container-row .l-row.a-double-margin.l-container-row {display : none;}`);
}

let default_values_were_added = false;

async function anzeige_aufgeben_seite() {
    let disable_auto_categorize = GM_config.get("disable_auto_categorize");
    let disable_buy_now = GM_config.get("disable_buy_now");
    let default_price = GM_config.get("default_price");
    let default_price_type = GM_config.get("default_price_type");
    let default_only_pickup = GM_config.get("default_only_pickup");
    let default_description = GM_config.get("default_description");

    // Disable auto categorize with title
    if (disable_auto_categorize) {
        await sleep_s(1); // Delay is required because code that adds the events start after page loaded
        document.querySelector("#postad-title").replaceWith(document.querySelector("#postad-title").cloneNode(true)); // Clone element to remove the event
    }

    // Disable buy now
    if (disable_buy_now) {
        wait_for_element('#radio-buy-now-no').then(async () => {
            document.querySelector("#radio-buy-now-no").click();
        });
    }

    // Field Price
    let field_price = document.querySelector("#pstad-price");
    if (!default_values_were_added && field_price)
        field_price.value = default_price;

    // Field Price Type
    let field_pricetype = document.querySelector("#priceType");
    if (!default_values_were_added && default_price_type) {
        let value;
        switch(default_price_type) {
            case "Festpreis":
                value = "FIXED";
                break;
            case "VB":
                value = "NEGOTIABLE";
                break;
            case "Zu verschenken":
                value = "GIVE_AWAY";
                break;
            default:
                value = "FIXED";
        }
        if(field_pricetype)
            field_pricetype.value = value;
    }

    // Field Shipping
    if(default_only_pickup) {
        wait_for_element("#shipping-pickup-selector #radio-pickup").then(async () => {
            document.querySelector("#shipping-pickup-selector #radio-pickup")?.click();
        });
    }

    // Field Description
    let field_description = document.querySelector("#pstad-descrptn");
    if (!default_values_were_added && field_description)
        field_description.value = default_description;

    default_values_were_added = true;
}

function meins_to_nachrichten() {
    GM_addStyle(`#site-mainnav-my {width: 70px;}`);
    wait_for_element('#site-mainnav-my').then(async () => {
        document.querySelector("#site-mainnav-my-link .ka-site-mainnav--item--text").innerHTML = document.querySelector("#site-subnav-msgbox").innerHTML;
        document.querySelector("#site-mainnav-my-link").href = document.querySelector("#site-subnav-msgbox").href;
    });
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

function setup_html_observer() {
    // Monitor changes to the <html> tag
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                // Check if the <html> tag was removed
                const was_html_removed = Array.from(mutation.removedNodes).some(node => node.nodeName === 'HTML');
                if (was_html_removed) {
                    // Wait until the new <html> tag is available
                    const wait_for_html = setInterval(() => {
                        if (document.documentElement) {
                            clearInterval(wait_for_html);
                            main(true)
                        }
                    }, 100);
                }
            }
        }
    });

    // Start the observer to monitor changes to the <html> tag
    observer.observe(document.documentElement.parentNode, { childList: true });
}