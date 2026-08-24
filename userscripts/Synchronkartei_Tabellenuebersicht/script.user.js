// ==UserScript==
// @name            Synchronkartei Tabellenübersicht
// @namespace       https://kurotaku.de
// @version         1.0
// @description     Konvertiert Listen in übersichtliche, sortierbare Tabellen mit konfigurierbarer Spaltenreihenfolge & Suchfunktion.
// @author          Kurotaku
// @match           https://www.synchronkartei.de/*
// @icon            https://www.synchronkartei.de/favicon.ico
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Synchronkartei_Tabellenuebersicht/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Synchronkartei_Tabellenuebersicht/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==

let current_sort_col = -1;
let current_sort_asc = true;
let int_audio_slot_counter = 0;

// Ordered list of every column this script can render, used as the fallback
// whenever no valid stored state exists yet
const array_column_order_default = ["icon", "project", "character", "actor", "year", "audio", "info"];

// Every sk- prefixed class this script uses anywhere, listed here in the same
// order they get introduced further down in the script, so the default
// custom CSS value shows the user exactly what hooks exist and in what order
const array_customizable_selectors = [
    ".sk-settings-block",
    ".sk-settings-heading",
    ".sk-drag-list",
    ".sk-sort-select",
    ".sk-font-size-select",
    ".sk-custom-css-textarea",
    ".sk-drag-item",
    ".sk-drag-handle",
    ".sk-dragging",
    ".sk-search-wrapper",
    ".sk-search-input",
    ".sk-custom-table",
    ".sk-center",
    ".sk-info-icon",
    ".sk-audio-cell",
    ".sk-extra-info",
    ".sk-sort-arrow"
];

const int_font_size_default = 15;
const str_custom_css_default = array_customizable_selectors.map(str_selector => `${str_selector} {}`).join('\n');

// Central metadata for every column, header_text and settings_label are the
// German strings shown on the page and inside our own settings dialog
const object_column_meta = {
    icon: { header_text: "", settings_label: "Info Symbol", header_class: "sk-center", cell_class: "sk-center", width: "25px", sortable: false },
    project: { header_text: "Projekt", settings_label: "Projekt", sortable: true },
    character: { header_text: "Charakter", settings_label: "Charakter", sortable: true },
    actor: { header_text: "Darsteller", settings_label: "Darsteller", sortable: true },
    year: { header_text: "Jahr", settings_label: "Jahr", header_class: "sk-center", cell_class: "sk-center", sortable: true },
    audio: { header_text: "Audio", settings_label: "Audio", width: "80px", cell_class: "sk-audio-cell", sortable: false },
    info: { header_text: "Info", settings_label: "Info", cell_class: "sk-extra-info", sortable: false }
};

// Every selectable default sort combination, value format is field_direction
const array_sort_options = [
    { value: "none", label: "Keine Standardsortierung" },
    { value: "project_asc", label: "Projekt aufsteigend" },
    { value: "project_desc", label: "Projekt absteigend" },
    { value: "character_asc", label: "Charakter aufsteigend" },
    { value: "character_desc", label: "Charakter absteigend" },
    { value: "actor_asc", label: "Darsteller aufsteigend" },
    { value: "actor_desc", label: "Darsteller absteigend" },
    { value: "year_asc", label: "Jahr aufsteigend" },
    { value: "year_desc", label: "Jahr absteigend" }
];

// Every selectable font size, 10px through 20px
const array_font_size_options = [];
for (let int_value = 10; int_value <= 20; int_value++) array_font_size_options.push(int_value);

// The three columns the live search box is allowed to filter on
const array_search_target_keys = ["project", "character", "actor"];

(async function() {
    console.log("%c[SK-Table] Script gestartet (Configurable Columns & Default Sort)", "font-weight: bold;");
    GM_registerMenuCommand("Einstellungen", () => open_settings_dialog());
    inject_custom_css();
    await wait_for_element('div > h3');
    if (window.location.pathname.startsWith("/person/")) {
        insert_search_bar();
        convert_all_lists();
    }
})();

// Builds and opens the settings dialog, lets the user drag columns between
// the visible and hidden list, reorder them, pick a default sort field plus
// direction, adjust the font size, edit custom CSS, or reset everything
function open_settings_dialog() {
    const object_state = get_column_state();
    const str_current_sort = get_default_sort();
    const int_current_font_size = get_font_size();
    const str_current_custom_css = get_custom_css();

    let html_visible_items = "";
    object_state.visible.forEach(str_key => html_visible_items += build_drag_item_html(str_key));

    let html_hidden_items = "";
    object_state.hidden.forEach(str_key => html_hidden_items += build_drag_item_html(str_key));

    let html_sort_options = "";
    array_sort_options.forEach(obj_option => {
        const str_selected = obj_option.value === str_current_sort ? " selected" : "";
        html_sort_options += `<option value="${obj_option.value}"${str_selected}>${obj_option.label}</option>`;
    });

    let html_font_size_options = "";
    array_font_size_options.forEach(int_value => {
        const str_selected = int_value === int_current_font_size ? " selected" : "";
        html_font_size_options += `<option value="${int_value}"${str_selected}>${int_value}px</option>`;
    });

    const html_dialog = `
        <div class="sk-settings-block">
            <p class="sk-settings-heading">Spaltenreihenfolge</p>
            <ul id="sk-column-order-list" class="sk-drag-list">${html_visible_items}</ul>
        </div>
        <div class="sk-settings-block">
            <p class="sk-settings-heading">Verborgene Spalten</p>
            <ul id="sk-hidden-columns-list" class="sk-drag-list">${html_hidden_items}</ul>
        </div>
        <div class="sk-settings-block">
            <p class="sk-settings-heading">Standardsortierung</p>
            <select id="sk-default-sort-select" class="sk-sort-select">${html_sort_options}</select>
        </div>
        <div class="sk-settings-block">
            <p class="sk-settings-heading">Schriftgröße</p>
            <select id="sk-font-size-select" class="sk-font-size-select">${html_font_size_options}</select>
        </div>
        <div class="sk-settings-block">
            <p class="sk-settings-heading">Custom CSS</p>
            <textarea id="sk-custom-css-textarea" class="sk-custom-css-textarea" rows="6">${str_current_custom_css}</textarea>
        </div>`;

    Swal.fire({
        title: "Tabelleneinstellungen",
        html: html_dialog,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Speichern",
        cancelButtonText: "Abbrechen",
        denyButtonText: "Zurücksetzen",
        focusConfirm: false,
        backdrop: true,
        didOpen: () => attach_drag_events(),
        preConfirm: () => {
            const node_visible_list = document.getElementById('sk-column-order-list');
            const node_hidden_list = document.getElementById('sk-hidden-columns-list');
            const array_visible_order = Array.from(node_visible_list.querySelectorAll('.sk-drag-item')).map(node_item => node_item.getAttribute('data-key'));
            const array_hidden_order = Array.from(node_hidden_list.querySelectorAll('.sk-drag-item')).map(node_item => node_item.getAttribute('data-key'));
            const str_new_sort = document.getElementById('sk-default-sort-select').value;
            const int_new_font_size = parseInt(document.getElementById('sk-font-size-select').value, 10);
            const str_new_custom_css = document.getElementById('sk-custom-css-textarea').value;
            return { visible: array_visible_order, hidden: array_hidden_order, sort: str_new_sort, font_size: int_new_font_size, custom_css: str_new_custom_css };
        }
    }).then(obj_result => {
        if (obj_result.isDenied) return reset_settings();
        if (!obj_result.isConfirmed) return;

        GM_setValue("sk_column_order", JSON.stringify(obj_result.value.visible));
        GM_setValue("sk_hidden_columns", JSON.stringify(obj_result.value.hidden));
        GM_setValue("sk_default_sort", obj_result.value.sort);
        GM_setValue("sk_font_size", obj_result.value.font_size);
        GM_setValue("sk_custom_css", obj_result.value.custom_css);
        location.reload();
    });
}

// Builds a single draggable list item for the settings dialog
function build_drag_item_html(str_key) {
    const str_label = object_column_meta[str_key].settings_label;
    return `<li class="sk-drag-item" draggable="true" data-key="${str_key}"><span class="sk-drag-handle">⋮⋮</span>${str_label}</li>`;
}

// Native HTML5 drag and drop reordering across both the visible and the
// hidden column list, dragging an item into the other list moves it there
function attach_drag_events() {
    const array_lists = [document.getElementById('sk-column-order-list'), document.getElementById('sk-hidden-columns-list')];
    let node_dragged = null;

    array_lists.forEach(node_list => {
        node_list.querySelectorAll('.sk-drag-item').forEach(node_item => bind_drag_item_events(node_item));

        // dropping on empty list space below every item appends it at the end
        node_list.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (node_dragged && e.target === node_list) node_list.appendChild(node_dragged);
        });
    });

    function bind_drag_item_events(node_item) {
        node_item.addEventListener('dragstart', (e) => {
            node_dragged = node_item;
            node_item.classList.add('sk-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        node_item.addEventListener('dragend', () => {
            node_item.classList.remove('sk-dragging');
            node_dragged = null;
        });

        node_item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const node_target = e.currentTarget;
            if (node_target === node_dragged) return;
            const rect_target = node_target.getBoundingClientRect();
            const bool_after = (e.clientY - rect_target.top) > (rect_target.height / 2);
            node_target.parentNode.insertBefore(node_dragged, bool_after ? node_target.nextSibling : node_target);
        });
    }
}

// Wipes every stored setting back to its default and reloads the page so
// the table immediately reflects the reset state
function reset_settings() {
    GM_setValue("sk_column_order", JSON.stringify(array_column_order_default));
    GM_setValue("sk_hidden_columns", JSON.stringify([]));
    GM_setValue("sk_default_sort", "none");
    GM_setValue("sk_font_size", int_font_size_default);
    GM_setValue("sk_custom_css", str_custom_css_default);
    location.reload();
}

// Injects the user's custom CSS as its own style tag, called once on script
// startup so it applies before any table gets built
function inject_custom_css() {
    GM_addStyle(get_custom_css());
}

function get_custom_css() {
    return GM_getValue("sk_custom_css", str_custom_css_default);
}

// Inserts the live search field directly above the very first list section
// on the page, once, so every table on the page can be filtered from one spot
function insert_search_bar() {
    const node_first_h3 = document.querySelector('div > h3');
    if (!node_first_h3) return;
    node_first_h3.insertAdjacentHTML('beforebegin', build_search_bar_html());
    attach_search_events();
}

function build_search_bar_html() {
    return `<div class="sk-search-wrapper"><input type="text" id="sk-search-input" class="sk-search-input" placeholder="Suche nach Projekt, Charakter oder Darsteller"></div>`;
}

// Wires up the live filtering, every keystroke re-evaluates every table
function attach_search_events() {
    const node_input = document.getElementById('sk-search-input');
    if (!node_input) return;
    node_input.addEventListener('input', (e) => filter_all_tables(e.target.value));
}

function convert_all_lists() {
    const array_order = get_column_state().visible;
    const int_font_size = get_font_size();

    document.querySelectorAll('div > h3').forEach((node_h3) => {
        const is_audio_sample_section = node_h3.textContent.includes("Hörproben");
        let node_ul;

        if (is_audio_sample_section) {
            const node_panel = node_h3.parentNode.querySelector('.panel-collapse');
            if (!node_panel) return;
            node_ul = node_panel.querySelector('ul');
        } else {
            node_ul = node_h3.parentNode.querySelector('ul');
        }

        if (!node_ul || node_ul.classList.contains('sk-converted') || node_ul.classList.contains('nav')) return;
        node_ul.classList.add('sk-converted');

        // audio only makes sense for the Hörproben section, every other
        // section never has a player to show so the column gets dropped
        let array_table_order = is_audio_sample_section ? array_order : array_order.filter(str_key => str_key !== "audio");

        // dialogbuch and dialogregie entries have no character or actor at
        // all, showing those columns there would just be empty every time
        if (is_dialog_page()) array_table_order = array_table_order.filter(str_key => str_key !== "character" && str_key !== "actor");

        const html_table_shell = `
            <table class="sk-custom-table" data-columns="${array_table_order.join(',')}" style="font-size: ${int_font_size}px;">
                <thead>
                    <tr>${build_header_html(array_table_order)}</tr>
                </thead>
                <tbody></tbody>
            </table>`;

        node_ul.style.display = 'none';
        node_ul.insertAdjacentHTML('afterend', html_table_shell);
        const node_new_table = node_ul.nextElementSibling;
        const node_tbody = node_new_table.querySelector('tbody');

        node_ul.querySelectorAll('li').forEach((node_li) => {
            const obj_parsed = parse_li_element(node_li);
            if (!obj_parsed) return;

            const str_audio_slot_id = `sk-audio-slot-${int_audio_slot_counter++}`;
            node_tbody.insertAdjacentHTML('beforeend', build_row_html(obj_parsed, array_table_order, str_audio_slot_id));

            // Move the real audio player node into its slot instead of
            // cloning it, appendChild relocates the existing node and
            // keeps every listener that was already attached to it
            if (obj_parsed.element_audio_node) {
                const node_slot = document.getElementById(str_audio_slot_id);
                if (node_slot) node_slot.appendChild(obj_parsed.element_audio_node);
            }
        });

        node_new_table.querySelector('thead').addEventListener('click', (e) => {
            if (e.target.tagName === 'TH' && e.target.hasAttribute('data-col')) {
                sort_table(node_new_table, parseInt(e.target.getAttribute('data-col')));
            }
        });

        apply_default_sort(node_new_table, array_table_order);
    });
}

// Reads the stored visible order and hidden columns, falls back to every
// column being visible in the default order whenever the stored state is
// missing, corrupted, or no longer covers exactly the known keys
function get_column_state() {
    try {
        const array_visible = JSON.parse(GM_getValue("sk_column_order", JSON.stringify(array_column_order_default)));
        const array_hidden = JSON.parse(GM_getValue("sk_hidden_columns", JSON.stringify([])));
        const array_combined = array_visible.concat(array_hidden);
        const bool_valid = Array.isArray(array_visible) && Array.isArray(array_hidden) && array_combined.length === array_column_order_default.length && array_column_order_default.every(str_key => array_combined.includes(str_key));
        return bool_valid ? { visible: array_visible, hidden: array_hidden } : { visible: array_column_order_default, hidden: [] };
    } catch (e) {
        return { visible: array_column_order_default, hidden: [] };
    }
}

function get_font_size() {
    const int_stored = parseInt(GM_getValue("sk_font_size", int_font_size_default), 10);
    return array_font_size_options.includes(int_stored) ? int_stored : int_font_size_default;
}

// Builds the <th> markup for the whole header row, only sortable columns
// receive a data-col attribute matching their actual position in the row
function build_header_html(array_order) {
    let html_header_cells = "";
    array_order.forEach((str_key, int_index) => {
        const obj_meta = object_column_meta[str_key];
        const str_style = obj_meta.width ? ` style="width: ${obj_meta.width};"` : "";
        const str_class = obj_meta.header_class ? ` class="${obj_meta.header_class}"` : "";
        const str_data_col = obj_meta.sortable ? ` data-col="${int_index}"` : "";
        html_header_cells += `<th${str_style}${str_class}${str_data_col}>${obj_meta.header_text}</th>`;
    });
    return html_header_cells;
}

// Dialogbuch and dialogregie pages list entries without an actor or a
// character at all, only a project, a year, and an optional note, so their
// list items need a slightly different parsing strategy than actor pages
function url_is_dialog_page() {
    return /dialogbuch|dialogregie/i.test(window.location.pathname);
}

function parse_li_element(node_li) {
    try {
        const bool_is_dialog_page = url_is_dialog_page();
        const node_em = node_li.querySelector('em');
        const list_links = Array.from(node_li.querySelectorAll('a'));
        const text_tooltip = get_clean_tooltip(node_li);
        const text_full = node_li.textContent.trim().replace(/\s+/g, ' ');

        let html_actor = "";
        let html_project = "Unbekannt";
        let element_audio_node = null;

        // Grab the original player node itself, not a clone, so its
        // existing click listeners survive when it gets relocated later
        const node_player = node_li.querySelector('.seiyuu-player');
        if (node_player) element_audio_node = node_player;

        // dialogbuch and dialogregie entries never have an actor, the plain
        // text fallback below would otherwise swallow the whole entry
        if (!bool_is_dialog_page) {
            const node_actor_link = node_li.querySelector('a.person-highlight');
            if (node_actor_link) html_actor = node_actor_link.outerHTML;
            else html_actor = text_full.split(' (als')[0].split(' in ')[0].trim();
        }

        for (const node_a of list_links) {
            const text_a = node_a.textContent.trim();
            // only a full match like "1 Episode" or "3 Episoden" counts, a
            // project title that merely starts with a number must not match
            const is_episode = /^\d+\s*episoden?$/i.test(text_a);
            const is_person = node_a.classList.contains('person-highlight');
            const is_audio_link = node_a.href.includes('.mp3') || node_a.classList.contains('sr-only');

            if (!is_episode && !is_person && !is_audio_link && !node_a.querySelector('img')) {
                html_project = node_a.outerHTML;
                break;
            }
        }

        let text_character = "";
        if (!bool_is_dialog_page) {
            text_character = node_em ? node_em.textContent.trim() : "";
            text_character = text_character.replace(/^['"„]|['"“]$/g, '');
        }

        // matches a single year like (2010), a year range like (2023-2025),
        // and an open ended range like (2024-)
        const array_year_matches = text_full.match(/\(\d{4}(?:-\d{0,4})?\)/g);

        // dialogbuch/dialogregie entries can contain a second year inside a
        // trailing note, e.g. "[Synchro (2004)]", so the project's own year
        // is always the first match there, while actor pages still rely on
        // the last match since the year always trails after the character
        const str_selected_year_match = array_year_matches ? (bool_is_dialog_page ? array_year_matches[0] : array_year_matches[array_year_matches.length - 1]) : "";
        const text_year = str_selected_year_match.replace(/[()]/g, '');

        // extra info trails after the selected year, a bracket note before
        // that, like one inside the character name, belongs to
        // text_character already and must not leak into this field
        const int_match_index = str_selected_year_match ? (bool_is_dialog_page ? text_full.indexOf(str_selected_year_match) : text_full.lastIndexOf(str_selected_year_match)) : -1;
        const int_year_end_index = int_match_index !== -1 ? int_match_index + str_selected_year_match.length : -1;
        const str_trailing_text = int_year_end_index !== -1 ? text_full.slice(int_year_end_index) : "";

        // square brackets take priority, e.g. "[Synchro (2004)]", otherwise
        // fall back to plain parentheses, e.g. "| (Staffel 1)"
        const array_bracket_match = str_trailing_text.match(/\[(.+)\]/);
        const array_paren_match = str_trailing_text.match(/\(([^)]+)\)/);
        const text_extra = array_bracket_match ? array_bracket_match[1] : (array_paren_match ? array_paren_match[1] : "");

        return { html_project, text_character, html_actor, text_year, text_extra, text_tooltip, element_audio_node };
    } catch (e) {
        console.error("[SK-Table] Parse Error:", e);
        return null;
    }
}

// dialogbuch and dialogregie subpages never list a character or an actor,
// their entries are just project, year, and optional extra info
function is_dialog_page() {
    return /dialogbuch|dialogregie/i.test(window.location.pathname);
}

function get_clean_tooltip(node_li) {
    // clone is fine here since we only need the text content, no listeners involved
    let clone = node_li.cloneNode(true);
    clone.querySelectorAll('div, audio, noscript, .sr-only, img').forEach(el => el.remove());
    return clone.textContent.trim().replace(/\s+/g, ' ');
}

// Builds one <tr> for a parsed list item, the audio cell only gets an empty
// slot with an id here, the actual player node is moved in afterwards
function build_row_html(obj_parsed, array_order, str_audio_slot_id) {
    const obj_cell_content = {
        icon: `<span class="sk-info-icon" title="${obj_parsed.text_tooltip.replace(/"/g, '&quot;')}">ⓘ</span>`,
        project: obj_parsed.html_project,
        character: obj_parsed.text_character,
        actor: obj_parsed.html_actor,
        year: obj_parsed.text_year,
        audio: "",
        info: obj_parsed.text_extra
    };

    let html_row_cells = "";
    array_order.forEach(str_key => {
        const obj_meta = object_column_meta[str_key];
        const str_class = obj_meta.cell_class ? ` class="${obj_meta.cell_class}"` : "";
        const str_id = str_key === "audio" ? ` id="${str_audio_slot_id}"` : "";
        html_row_cells += `<td${str_class}${str_id}>${obj_cell_content[str_key]}</td>`;
    });

    return `<tr>${html_row_cells}</tr>`;
}

// Applies the stored default sort right after a table has been built
function apply_default_sort(node_table, array_order) {
    if (url_has_sort_param()) return;

    const str_default_sort = get_default_sort();
    if (str_default_sort === "none") return;

    const array_parts = str_default_sort.split('_');
    const str_direction = array_parts.pop();
    const str_field = array_parts.join('_');
    const int_col_index = array_order.indexOf(str_field);
    if (int_col_index === -1) return;

    current_sort_col = int_col_index;
    current_sort_asc = str_direction === "asc";

    sort_table_rows(node_table, int_col_index, str_field);
}

// The default sort must never override an explicit sortierung parameter that
// is already present in the current page URL
function url_has_sort_param() {
    return new URLSearchParams(window.location.search).has("sortierung");
}

function get_default_sort() {
    return GM_getValue("sk_default_sort", "none");
}

// Shared sorting logic used by both apply_default_sort and sort_table, reads
// the module level current_sort_col and current_sort_asc that the caller
// already set, sorts the rows in place, then refreshes the arrow indicator
function sort_table_rows(node_table, int_col_index, str_field) {
    const node_tbody = node_table.tBodies[0];
    const array_rows = Array.from(node_tbody.rows);

    array_rows.sort((node_a, node_b) => {
        let val_a = node_a.cells[int_col_index].textContent.trim();
        let val_b = node_b.cells[int_col_index].textContent.trim();
        if (str_field === "year") (val_a = parseInt(val_a) || 0, val_b = parseInt(val_b) || 0);
        return val_a < val_b ? (current_sort_asc ? -1 : 1) : (val_a > val_b ? (current_sort_asc ? 1 : -1) : 0);
    });

    array_rows.forEach(node_row => node_tbody.appendChild(node_row));
    update_sort_arrows(node_table, int_col_index);
}

function update_sort_arrows(node_table, int_idx) {
    // remove any arrow left over from a previous sort on this table
    node_table.querySelectorAll('.sk-sort-arrow').forEach(node_arrow => node_arrow.remove());

    const node_th_active = node_table.querySelector(`th[data-col="${int_idx}"]`);
    if (!node_th_active) return;

    const html_arrow = `<span class="sk-sort-arrow">${current_sort_asc ? ' ▲' : ' ▼'}</span>`;
    node_th_active.insertAdjacentHTML('beforeend', html_arrow);
}

function sort_table(node_table, int_idx) {
    const array_order = node_table.dataset.columns.split(',');
    const str_field = array_order[int_idx];

    if (current_sort_col === int_idx) current_sort_asc = !current_sort_asc;
    else (current_sort_col = int_idx, current_sort_asc = true);

    sort_table_rows(node_table, int_idx, str_field);
}

// Hides every row across every table that does not contain the search term
// in its project, character, or actor cell, called on every keystroke
function filter_all_tables(str_query) {
    const str_query_lower = str_query.trim().toLowerCase();

    document.querySelectorAll('.sk-custom-table').forEach(node_table => {
        const array_table_order = node_table.dataset.columns.split(',');
        const array_target_indexes = array_search_target_keys.map(str_key => array_table_order.indexOf(str_key)).filter(int_index => int_index !== -1);

        Array.from(node_table.tBodies[0].rows).forEach(node_row => {
            const bool_matches = str_query_lower === "" || array_target_indexes.some(int_index => node_row.cells[int_index].textContent.toLowerCase().includes(str_query_lower));
            node_row.style.display = bool_matches ? "" : "none";
        });
    });
}

GM_addStyle(`
    .sk-settings-block {
        text-align: left;
        margin-bottom: 16px;
    }

    .sk-settings-heading {
        font-weight: 600;
        margin: 0 0 6px 0;
    }

    .sk-drag-list {
        list-style: none;
        margin: 0;
        padding: 0;
        border: 1px solid;
        border-radius: 4px;
        min-height: 40px;
    }

    .sk-sort-select {
        width: 100%;
        padding: 6px;
    }

    .sk-font-size-select {
        width: 100%;
        padding: 6px;
    }

    .sk-custom-css-textarea {
        width: 100%;
        padding: 6px;
        font-family: monospace;
        resize: vertical;
    }

    .swal2-popup {
        font-size: 15px;
    }

    .sk-drag-item {
        padding: 8px 10px;
        border-bottom: 1px solid;
        cursor: grab;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .sk-drag-item:last-child {
        border-bottom: none;
    }

    .sk-drag-handle {
        opacity: 0.5;
    }

    .sk-dragging {
        opacity: 0.4;
    }

    .sk-search-wrapper {
        margin-bottom: 10px;
    }

    .sk-search-input {
        padding: 5px;
    }

    .sk-custom-table {
        width: 100%;
        border-collapse: collapse;
        margin: 5px 0 20px 0;
        border: 1px solid;
        line-height: 1.2;
    }

    .sk-custom-table th, .sk-custom-table td {
        padding: 4px 6px;
        border: 1px solid;
        text-align: left;
    }

    .sk-custom-table th {
        cursor: pointer;
        user-select: none;
        border-bottom-width: 2px;
    }

    .sk-custom-table a {
        text-decoration: none;
        font-weight: 500;
    }

    .sk-custom-table a:hover {
        text-decoration: underline;
    }

    .sk-center {
        text-align: center !important;
    }

    .sk-info-icon {
        cursor: help;
        font-weight: bold;
        opacity: 0.5;
    }

    .sk-info-icon:hover {
        opacity: 1;
    }

    .sk-audio-cell { }

    .sk-audio-cell .panel {
        display: flex;
        align-items: center;
    }

    .sk-audio-cell .panel .panel-body {
        padding: 5px;
    }

    .sk-extra-info {
        font-style: italic;
        opacity: 0.7;
    }

    .sk-sort-arrow {
        opacity: 0.7;
    }
`);