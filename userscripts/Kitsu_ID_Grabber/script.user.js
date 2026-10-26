// ==UserScript==
// @name            Kitsu ID Grabber
// @namespace       https://kurotaku.dev
// @version         1.0
// @description     Adds buttons to copy Kitsu IDs in search results and on detail pages
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://kitsu.app/*
// @icon            https://kitsu.app/favicon-32x32-3e0ecb6fc5a6ae681e65dcbc2bdf1f17.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kitsu_ID_Grabber/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kitsu_ID_Grabber/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @grant           GM_registerMenuCommand
// @grant           GM_setClipboard
// @grant           GM_addStyle
// @run-at          document-body
// ==/UserScript==

// Duration in milliseconds the green copy feedback stays visible on a button
const COPIED_FEEDBACK_MS = 2000;

// Minimum delay in milliseconds between two scans of the page
const SCAN_THROTTLE_MS = 200;

// Pending reset timeouts per button, so rapid repeated clicks do not end the feedback too early
const reset_timers = new WeakMap();

let scan_timer = null;

(function() {
    print("[Kitsu ID Grabber] Initialized.");

    // Capture phase is required, otherwise Kitsu's own link handling navigates away before the click is intercepted
    document.addEventListener("click", handle_copy_click, true);

    // Kitsu is a single page app, so new results and page changes are picked up via DOM mutations
    new MutationObserver(schedule_scan).observe(document.body, {childList: true, subtree: true});

    run_scan();
})();

// Runs at most one scan per throttle window, no matter how many mutations fire
function schedule_scan() {
    if (scan_timer) return;

    scan_timer = setTimeout(() => {
        scan_timer = null;
        run_scan();
    }, SCAN_THROTTLE_MS);
}

function run_scan() {
    process_search_results();
    process_detail_page();
}

// Extracts the ID from a poster image URL, returns null if the URL is not a poster URL
// Older entries use ".../poster_images/<id>/small.jpg", newer ones use ".../<anime|manga>/<id>/poster_image/small-<hash>.jpeg"
function extract_poster_id(url) {
    const match = url?.match(/\/(?:poster_images\/(\d+)|(?:anime|manga)\/(\d+)\/poster_image)\//);
    return match?.[1] ?? match?.[2] ?? null;
}

// Adds a copy button below the type label of every search result that does not have one yet
function process_search_results() {
    const entries = document.querySelectorAll("a.media[href*='/anime/'], a.media[href*='/manga/']");

    for (const entry of entries) {
        if (entry.querySelector(".kitsu_copy_btn")) continue;

        const img = entry.querySelector("img");
        if (!img) continue;

        // Lazy loaded images keep their URL in data-src until they are in view
        const media_id = extract_poster_id(img.getAttribute("src") || img.getAttribute("data-src"));
        if (!media_id) continue;

        const button_html = `<button type="button" class="kitsu_copy_btn kitsu_copy_btn_search" data-id="${media_id}">${media_id}</button>`;
        const tag = entry.querySelector(".tag");

        if (tag) wrap_tag_with_button(tag, button_html);
        else entry.insertAdjacentHTML("beforeend", button_html);
    }
}

// Stacks the type label and the copy button in a column that takes over the flex placement of the label
function wrap_tag_with_button(tag, button_html) {
    const tag_style = getComputedStyle(tag);

    tag.insertAdjacentHTML("beforebegin", `<div class="kitsu_tag_group"></div>`);
    const group = tag.previousElementSibling;

    // The placement values must be read before the label's margin is reset, as the computed style is live
    group.style.alignSelf = tag_style.alignSelf === "auto" ? "flex-start" : tag_style.alignSelf;
    group.style.order = tag_style.order;
    group.style.margin = tag_style.margin;
    tag.style.margin = "0";

    group.append(tag);
    group.insertAdjacentHTML("beforeend", button_html);
}

// Keeps exactly one copy button in the navbar while a detail page is open
function process_detail_page() {
    const existing_item = document.getElementById("kitsu_page_copy_item");

    if (!/^\/(?:anime|manga)\//.test(window.location.pathname)) {
        existing_item?.remove();
        return;
    }

    const media_id = extract_poster_id(document.querySelector('meta[property="og:image"]')?.content);
    const nav_buttons = document.querySelector(".navbar-buttons");
    if (!media_id || !nav_buttons) return;

    // A button left over from a previously viewed page has to be replaced
    if (existing_item?.dataset.id === media_id) return;
    existing_item?.remove();

    const label = `Copy Kitsu ID: ${media_id}`;
    const item_html = `
        <li class="nav-item" id="kitsu_page_copy_item" data-id="${media_id}">
            <button type="button" class="kitsu_copy_btn kitsu_copy_btn_page" data-id="${media_id}">${label}</button>
        </li>
    `;
    nav_buttons.insertAdjacentHTML("afterbegin", item_html);
}

function handle_copy_click(event) {
    const button = event.target.closest(".kitsu_copy_btn");
    if (!button) return;

    // Search result buttons sit inside a link, so the click must not open the page
    event.preventDefault();
    event.stopPropagation();

    GM_setClipboard(button.dataset.id);

    // Only the color changes, the text stays untouched so the layout does not rescale
    button.classList.add("kitsu_copied");

    clearTimeout(reset_timers.get(button));
    reset_timers.set(button, setTimeout(() => button.classList.remove("kitsu_copied"), COPIED_FEEDBACK_MS));
}

GM_addStyle(`
    .kitsu_copy_btn {
        background-color: #ffcc00;
        color: #000000;
        font-weight: bold;
        border: 1px solid #000000;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.2s ease;
    }

    /* The base styles of the site draw a dotted focus ring on "button:focus", which outranks a single class selector */
    .kitsu_copy_btn:focus,
    .kitsu_copy_btn:focus-visible,
    .kitsu_copy_btn:active {
        outline: none !important;
        box-shadow: none !important;
    }

    /* Firefox draws an additional dotted ring inside buttons that is not affected by the outline property */
    .kitsu_copy_btn::-moz-focus-inner {
        border: 0;
    }

    .kitsu_copy_btn.kitsu_copied {
        background-color: #28a745;
        color: #ffffff;
    }

    .kitsu_tag_group {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
        gap: 10px;
    }

    /* The label brings its own alignment from the site styles, which would otherwise keep it on the left */
    .kitsu_tag_group > * {
        align-self: flex-end !important;
    }

    .kitsu_copy_btn_search {
        padding: 1px 6px;
        font-size: 12px;
        line-height: 1.3;
        border-radius: 4px;
    }

    .kitsu_copy_btn_page {
        padding: 6px 14px;
        font-size: 14px;
        border-width: 2px;
        border-radius: 6px;
    }

    #kitsu_page_copy_item {
        display: flex;
        align-items: center;
        margin-right: 10px;
    }
`);