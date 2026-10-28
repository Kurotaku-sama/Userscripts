// ==UserScript==
// @name            ChatGPT Bulk & Quick Delete
// @namespace       https://kurotaku.de
// @version         1.0.3
// @description     Easily delete multiple chats in bulk or quickly remove individual chats with Shift + Hover. You can also export a single chat as a TXT file.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://chatgpt.com/*
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/ChatGPT_Bulk_and_Quick_Delete/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/ChatGPT_Bulk_and_Quick_Delete/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==

// ==========================================================
// Globals
// ==========================================================
let shift_pressed      = false;
let selection_mode     = false;
let selection_observer = null;
let auth_token         = null;
// Selected chats as conversation id -> title; keyed by id because one chat can appear several times (e.g. in Recents and in its project)
let selected_chats     = new Map();
let quick_delete_locks = new Set();

// Scrollable sidebar container that holds the navigation entries and all chat lists (pinned, recents)
const chat_list_selector = '[data-app-action-sidebar-scroll]';
// Anchor of a single chat entry; chats inside projects use /g/<project_id>/c/<chat_id>, so the match is not anchored at the start
const chat_link_selector = 'a[href*="/c/"]';
// Row element that wraps the chat link together with its hover buttons
const chat_row_selector  = 'div[role="group"][data-sidebar-cycle-item]';
// List item that wraps a whole row inside the sidebar list
const chat_item_selector = 'div[role="listitem"]';
// Navigation entry list (e.g. Plugins, Codex, Discover) used as anchor for the bulk delete controls
const nav_list_selector  = 'div[data-appearance="plain"]';
// Pause in seconds after a failed delete request in a bulk run, to avoid hammering the API while it is erroring
const failed_request_pause_s = 3;

(async function() {
    await init_gm_config();

    GM_registerMenuCommand("Export current Chat as TXT", export_current_chat_as_txt);

    if (GM_config.get("enable_bulk_deletion"))
        ensure_bulk_delete_panel();

    if (GM_config.get("enable_quick_deletion"))
        init_quick_delete_listeners();
})();

async function init_gm_config() {
    const config_id = "configuration_chatgpt_baqd";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'ChatGPT Bulk and Quick Delete',
        fields: {
            enable_bulk_deletion: {
                section: ['Deletion Options'],
                type: 'checkbox',
                default: true,
                label: 'Enable Bulk Deletion',
            },
            enable_quick_deletion: {
                type: 'checkbox',
                default: true,
                label: 'Enable Quick Deletion (Shift + Hover)',
            },
        },
        events: {
            save: () => { location.reload(); },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

// ==========================================================
// Chat Element Helpers
// ==========================================================
// Returns the closest element matching the selector for the target of an event, or null.
function closest_from_event(event, selector) {
    return event.target instanceof Element ? event.target.closest(selector) : null;
}

// Returns the conversation id of a chat link.
function get_chat_id(chat) {
    return chat.getAttribute('href').split('?')[0].split('/').pop();
}

// Returns every sidebar link that points to the given conversation.
function get_chats_by_id(chat_id) {
    return Array.from(document.querySelectorAll(chat_link_selector)).filter(chat => get_chat_id(chat) === chat_id);
}

// Returns the row of a chat link, which is the element carrying the hover state and the hover buttons.
function get_chat_row(chat) {
    return chat.closest(chat_row_selector);
}

// Returns the outermost sidebar element of a chat so removing it leaves no empty list slot behind.
function get_chat_item(chat) {
    return chat.closest(chat_item_selector) || get_chat_row(chat) || chat;
}

// ==========================================================
// Quick Delete Logic
// ==========================================================
function init_quick_delete_listeners() {
    // Create the trash button lazily when a chat row is hovered so it is ready once Shift is pressed
    document.addEventListener('mouseover', e => {
        const row = closest_from_event(e, chat_row_selector);
        if (row) ensure_trash_button(row);
    });

    // Capture phase click handler so the page never receives clicks meant for the trash button
    document.addEventListener('click', handle_trash_click, true);

    document.addEventListener('keydown', e => {
        if (e.key === 'Shift' && !shift_pressed) set_quick_delete_mode(true);
    });

    document.addEventListener('keyup', e => {
        if (e.key === 'Shift' && shift_pressed) set_quick_delete_mode(false);
    });

    // A missed keyup (e.g. window loses focus while Shift is held) would leave the mode stuck
    window.addEventListener('blur', () => {
        if (shift_pressed) set_quick_delete_mode(false);
    });
}

// Toggles the body class that swaps the hover buttons of the hovered chat row for the trash button.
function set_quick_delete_mode(enable) {
    shift_pressed = enable;
    document.body.classList.toggle('quick-delete-active', enable);
}

// Adds the trash button to the hover button area of a chat row unless it already exists.
function ensure_trash_button(row) {
    if (row.querySelector('.quick-delete-btn')) return;
    if (!row.querySelector(chat_link_selector)) return;

    const html = `
        <button type="button" class="quick-delete-btn" aria-label="Delete chat">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon" aria-hidden="true">
                <path d="M10.6299 1.33496C12.0335 1.33496 13.2695 2.25996 13.666 3.60645L13.8809 4.33496H17L17.1338 4.34863C17.4369 4.41057 17.665 4.67858 17.665 5C17.665 5.32142 17.4369 5.58943 17.1338 5.65137L17 5.66504H16.6543L15.8574 14.9912C15.7177 16.629 14.3478 17.8877 12.7041 17.8877H7.2959C5.75502 17.8877 4.45439 16.7815 4.18262 15.2939L4.14258 14.9912L3.34668 5.66504H3C2.63273 5.66504 2.33496 5.36727 2.33496 5C2.33496 4.63273 2.63273 4.33496 3 4.33496H6.11914L6.33398 3.60645L6.41797 3.3584C6.88565 2.14747 8.05427 1.33496 9.37012 1.33496H10.6299ZM5.46777 14.8779L5.49121 15.0537C5.64881 15.9161 6.40256 16.5576 7.2959 16.5576H12.7041C13.6571 16.5576 14.4512 15.8275 14.5322 14.8779L15.3193 5.66504H4.68164L5.46777 14.8779ZM7.66797 12.8271V8.66016C7.66797 8.29299 7.96588 7.99528 8.33301 7.99512C8.70028 7.99512 8.99805 8.29289 8.99805 8.66016V12.8271C8.99779 13.1942 8.70012 13.4912 8.33301 13.4912C7.96604 13.491 7.66823 13.1941 7.66797 12.8271ZM11.002 12.8271V8.66016C11.002 8.29289 11.2997 7.99512 11.667 7.99512C12.0341 7.9953 12.332 8.293 12.332 8.66016V12.8271C12.3318 13.1941 12.0339 13.491 11.667 13.4912C11.2999 13.4912 11.0022 13.1942 11.002 12.8271ZM9.37012 2.66504C8.60726 2.66504 7.92938 3.13589 7.6582 3.83789L7.60938 3.98145L7.50586 4.33496H12.4941L12.3906 3.98145C12.1607 3.20084 11.4437 2.66504 10.6299 2.66504H9.37012Z"></path>
            </svg>
        </button>`;

    // The hover button area is the first child of the wrapper; it fades in on hover. Fall back to the row itself.
    const button_area = row.querySelector('[data-hover-card-open-immediately] > div') || row;
    button_area.insertAdjacentHTML('beforeend', html);
}

async function handle_trash_click(e) {
    const trash_btn = closest_from_event(e, '.quick-delete-btn');
    if (!trash_btn) return;

    e.stopPropagation();
    e.preventDefault();

    const chat = get_chat_row(trash_btn)?.querySelector(chat_link_selector);
    if (!chat) return;

    const chat_id = get_chat_id(chat);
    // Ignore repeated clicks while this chat is already being deleted
    if (quick_delete_locks.has(chat_id)) return;
    quick_delete_locks.add(chat_id);

    // Hide every entry of this chat immediately so it cannot be clicked twice; they are restored if the deletion fails
    const chat_items = get_chats_by_id(chat_id).map(entry => get_chat_item(entry));
    chat_items.forEach(item => item.setAttribute('data-quick-delete-pending', ''));

    try {
        await delete_chat(chat_id, chat.textContent.trim());
        chat_items.forEach(item => item.remove());
    } catch (err) {
        chat_items.forEach(item => item.removeAttribute('data-quick-delete-pending'));
        await show_error_message({ title: "Failed to delete chat", text: err.error?.message || "Unknown error" });
    } finally {
        quick_delete_locks.delete(chat_id);
    }
}

// ==========================================================
// Selection / Bulk Delete Logic
// ==========================================================
function toggle_selection_mode() {
    const toggle_btn = document.getElementById('btn-bulk-delete');
    const panel = document.getElementById('panel-bulk-delete');
    const chat_container = document.querySelector(chat_list_selector);
    if (!toggle_btn || !panel || !chat_container) return;

    selection_mode = !selection_mode;
    document.body.classList.toggle('bulk-selection-active', selection_mode);

    // Marks every currently rendered chat so clicks select it instead of opening it
    const add_listeners_to_chats = () => {
        chat_container.querySelectorAll(chat_link_selector).forEach(chat => {
            if (!chat.classList.contains('chat-selectable')) {
                chat.classList.add('chat-selectable');
                chat.addEventListener('click', handle_chat_click, true);
            }
            // Entries rendered later (e.g. lazy loaded) inherit the selection of their chat
            if (selected_chats.has(get_chat_id(chat)))
                get_chat_row(chat)?.classList.add('chat-selected');
        });
    };

    if (selection_mode) {
        toggle_btn.style.display = 'none';
        panel.style.display = 'flex';

        add_listeners_to_chats();

        // Double clicks would otherwise start the rename mode of the chat
        document.addEventListener('dblclick', block_chat_dblclick, true);

        // Chats are rendered lazily and nested deeply, so the whole subtree is observed
        selection_observer = new MutationObserver(add_listeners_to_chats);
        selection_observer.observe(chat_container, { childList: true, subtree: true });
    } else {
        panel.style.display = 'none';
        toggle_btn.style.display = 'inline-block';

        chat_container.querySelectorAll(chat_link_selector).forEach(chat => {
            chat.classList.remove('chat-selectable');
            chat.removeEventListener('click', handle_chat_click, true);
            get_chat_row(chat)?.classList.remove('chat-selected');
        });

        selected_chats.clear();
        update_delete_button();
        document.removeEventListener('dblclick', block_chat_dblclick, true);

        if (selection_observer) {
            selection_observer.disconnect();
            selection_observer = null;
        }
    }
}

function handle_chat_click(event) {
    event.preventDefault();
    event.stopPropagation();

    const chat = event.currentTarget;
    const chat_id = get_chat_id(chat);
    const is_selected = !selected_chats.has(chat_id);

    if (is_selected)
        selected_chats.set(chat_id, chat.textContent.trim());
    else
        selected_chats.delete(chat_id);

    // Mirror the state on every entry of the same chat (e.g. in Recents and in its project)
    get_chats_by_id(chat_id).forEach(entry => get_chat_row(entry)?.classList.toggle('chat-selected', is_selected));
    update_delete_button();
}

// Swallows double clicks on chat rows while the selection mode is active.
function block_chat_dblclick(event) {
    if (!closest_from_event(event, chat_row_selector)) return;
    event.preventDefault();
    event.stopPropagation();
}

function update_delete_button() {
    const delete_btn = document.getElementById('btn-delete-number');
    if (!delete_btn) return;

    delete_btn.textContent = `Delete ${selected_chats.size}`;
    delete_btn.disabled = selected_chats.size === 0;
}

// ==========================================================
// Bulk Delete Actions
// ==========================================================
// Escapes text so chat titles can be placed safely inside HTML.
function escape_html(text) {
    const html_entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, character => html_entities[character]);
}

// Builds the content of the progress dialog: progress bar, counter and the chat that is currently being deleted.
function build_progress_html(done, total, chat_title) {
    return `
        <progress value="${done}" max="${total}" style="width:100%"></progress><br>
        ${done}/${total}
        <div style="margin-top:8px;word-break:break-word;">Deleting: ${escape_html(chat_title)}</div>
    `;
}

async function delete_selected_chats() {
    if (selected_chats.size === 0) return;

    const { isConfirmed } = await Swal.fire({
        title: `Delete ${selected_chats.size} chats?`,
        text: "This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        backdrop: true,
        theme: "dark",
    });
    if (!isConfirmed) return;

    const chats_to_delete = Array.from(selected_chats);
    const total = chats_to_delete.length;

    const delete_btn = document.getElementById("btn-delete-number");
    const cancel_btn = document.getElementById("btn-cancel-bulk");
    delete_btn.disabled = true;
    cancel_btn.disabled = true;

    let cancel_requested = false;

    // The confirm button acts as cancel button; returning false from preConfirm keeps the dialog open
    // until the request that is currently running has finished
    Swal.fire({
        title: "Deleting chats...",
        html: build_progress_html(0, total, chats_to_delete[0][1]),
        confirmButtonText: "Cancel",
        allowOutsideClick: false,
        allowEscapeKey: false,
        backdrop: true,
        theme: "dark",
        preConfirm: () => {
            if (cancel_requested) return false;
            cancel_requested = true;
            Swal.getHtmlContainer().insertAdjacentHTML('beforeend', '<div style="margin-top:8px;">Cancelling after the current request...</div>');
            return false;
        },
    });

    let success_count = 0;
    let error_count = 0;
    let aborted = false;

    for (let i = 0; i < total; i++) {
        if (cancel_requested) break;

        const [chat_id, chat_title] = chats_to_delete[i];
        Swal.update({ html: build_progress_html(i, total, chat_title) });

        try {
            await delete_chat(chat_id, chat_title);

            // Remove every entry of this chat from the sidebar
            get_chats_by_id(chat_id).forEach(entry => get_chat_item(entry).remove());
            success_count++;
        } catch (err) {
            // A missing auth token affects every remaining chat, so the whole run is aborted
            if (err.error?.message?.includes("No auth token")) {
                await show_error_message({ title: "Auth Error", text: err.error.message });
                aborted = true;
                break;
            }

            // Any other error only fails this chat; the run continues with the next one
            console.error(`[Delete Error] ${err.chat_title}: ${err.error?.message || "Unknown error"}`);
            error_count++;

            // Only failed requests are followed by a pause
            await sleep_s(failed_request_pause_s);
        }
    }

    if (!aborted) {
        Swal.close();

        let final_icon = "success";
        if (success_count === 0 && error_count > 0) final_icon = "error";
        else if (success_count > 0 && error_count > 0) final_icon = "warning";
        else if (cancel_requested) final_icon = "info";

        // Only list the counters that are relevant
        const html_parts = [];
        if (success_count > 0) html_parts.push(`Successfully deleted: ${success_count}`);
        if (error_count > 0) html_parts.push(`Failed: ${error_count}`);
        if (cancel_requested) html_parts.push(`Cancelled, not deleted: ${total - success_count - error_count}`);

        Swal.fire({
            title: cancel_requested ? "Deletion cancelled" : "Deletion finished",
            html: html_parts.join('<br>'),
            icon: final_icon,
            backdrop: true,
            theme: "dark",
        });
    }

    delete_btn.disabled = false;
    cancel_btn.disabled = false;

    if (selection_mode) toggle_selection_mode();
}

// ==========================================================
// Delete Function
// ==========================================================
async function delete_chat(conversation_id, chat_title) {
    // Ensure we have an auth token
    if (!auth_token) {
        const token_ok = await get_auth_token();
        if (!token_ok)
            throw { chat_title, error: new Error("No auth token") };
    }

    try {
        // The conversation is hidden instead of hard deleted, which is what the official delete action does
        const response = await fetch(`https://chatgpt.com/backend-api/conversation/${conversation_id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${auth_token}`
            },
            body: JSON.stringify({ is_visible: false })
        });

        if (!response.ok)
            throw new Error(`Status ${response.status}`);

    } catch (error) {
        throw { chat_title, error };
    }
}

// ==========================================================
// UI Initialization
// ==========================================================
async function ensure_bulk_delete_panel() {
    let bulk_panel_observer_started = false;

    while (true) {
        // Wait for at least one chat so the sidebar is fully rendered
        await wait_for_element(`${chat_list_selector} ${chat_link_selector}`);

        // The navigation entry list ends with "Discover"; the controls are placed directly below it
        const nav_entry = await wait_for_element(`${chat_list_selector} button[data-sidebar-destination]`);
        const nav_list = nav_entry.closest(nav_list_selector);
        if (!nav_list) {
            await sleep_s(1);
            continue;
        }

        const html = `
            <div id="bulk-delete-controls">
                <button type="button" id="btn-bulk-delete">Bulk Delete</button>
                <div id="panel-bulk-delete" style="display:none;">
                    <button type="button" id="btn-delete-number" disabled>Delete 0</button>
                    <button type="button" id="btn-cancel-bulk">Cancel</button>
                </div>
            </div>
        `;
        nav_list.insertAdjacentHTML('afterend', html);

        document.getElementById('btn-bulk-delete').onclick = toggle_selection_mode;
        document.getElementById('btn-cancel-bulk').onclick = toggle_selection_mode;
        document.getElementById('btn-delete-number').onclick = delete_selected_chats;

        if (!bulk_panel_observer_started) {
            bulk_panel_observer_started = true;
            observe_chat_list();
        }

        // The sidebar may be re-rendered by the page, in which case the controls are inserted again
        await wait_for_element_to_disappear("#bulk-delete-controls");
    }
}

function observe_chat_list() {
    const chat_container = document.querySelector(chat_list_selector);
    if (!chat_container) return;

    check_chats(chat_container);

    const observer = new MutationObserver(() => check_chats(chat_container));
    observer.observe(chat_container, { childList: true, subtree: true });
}

// Shows the bulk delete controls only while at least one chat exists.
function check_chats(chat_container) {
    const controls = document.getElementById('bulk-delete-controls');
    if (!controls) return;

    if (chat_container.querySelector(chat_link_selector)) {
        controls.style.display = 'flex';
        return;
    }

    controls.style.display = 'none';
    // Leave selection mode if no chats remain
    if (selection_mode) toggle_selection_mode();
}

// ==========================================================
// Export Current Chat as TXT
// ==========================================================
async function export_current_chat_as_txt() {
    const path_parts = window.location.pathname.split('/');
    const conversation_id = path_parts.pop() || path_parts.pop();

    if (!conversation_id || !conversation_id.match(/^[0-9a-f-]{10,}$/)) {
        await show_error_message({ title: "Export Failed", text: "No active chat detected." });
        return;
    }

    if (!auth_token) {
        const token_ok = await get_auth_token();
        if (!token_ok) {
            await show_error_message({ title: "Auth Error", text: "No auth token found." });
            return;
        }
    }

    try {
        const response = await fetch(`https://chatgpt.com/backend-api/conversation/${conversation_id}`, {
            headers: { "Authorization": `Bearer ${auth_token}` }
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();

        // Strip characters that are invalid in file names
        const chat_title = (data.title || "Untitled Chat").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();

        let output = `Chat Export: ${new Date().toLocaleString()}\nConversation ID: ${conversation_id}\nTitle: ${chat_title}\n\n`;

        for (const key in data.mapping) {
            const node = data.mapping[key];
            if (!node.message) continue;

            const role = node.message.author.role;
            if (role !== "user" && role !== "assistant") continue;

            let text_content = "";
            let has_attachment = false;

            // String parts are message text, object parts are attachments such as images
            if (Array.isArray(node.message.content?.parts)) {
                for (const part of node.message.content.parts) {
                    if (typeof part === "string" && part.trim() !== "")
                        text_content += `${part.trim()}\n`;
                    else if (typeof part === "object" && part !== null)
                        has_attachment = true;
                }
            }

            // Attachments can also be listed in the message metadata
            if (node.message.metadata?.attachments?.length > 0) has_attachment = true;
            if (node.message.metadata?.files?.length > 0) has_attachment = true;

            text_content = text_content.trim();
            if (text_content === "" && has_attachment)
                text_content = "[Has Attachment(s)]";

            if (text_content)
                output += `${role === "user" ? "User" : "ChatGPT"}:\n${text_content}\n\n`;
        }

        // A temporary hidden anchor triggers the browser download
        const blob = new Blob([output], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        document.body.insertAdjacentHTML('beforeend', '<a id="chat-export-download" style="display:none;"></a>');
        const download_link = document.getElementById('chat-export-download');
        download_link.href = url;
        download_link.download = `${chat_title}_${conversation_id}.txt`;
        download_link.click();
        download_link.remove();
        URL.revokeObjectURL(url);

        Swal.fire({
            title: "Export Complete",
            text: `Chat "${chat_title}" saved as TXT file.`,
            icon: "success",
            theme: "dark",
            backdrop: true
        });
    } catch (error) {
        await show_error_message({ title: "Export Failed", text: error.message });
    }
}

// ==========================================================
// Auth Helpers
// ==========================================================
async function get_auth_token() {
    if (auth_token) return true;

    try {
        const response = await fetch("https://chatgpt.com/api/auth/session");
        if (!response.ok)
            throw new Error(`Status ${response.status}`);

        const data = await response.json();
        if (data && data.accessToken) {
            auth_token = data.accessToken;
            return true;
        }

        throw new Error("accessToken not found.");
    } catch (error) {
        return false;
    }
}

// ==========================================================
// Error Handling
// ==========================================================
async function show_error_message({ title = "Error", text = "An error occurred" }) {
    console.error(`[ERROR] ${title}: ${text}`);
    await Swal.fire({
        title,
        text,
        icon: "error",
        backdrop: true,
        theme: "dark",
    });
}

// ==========================================================
// CSS Styles
// ==========================================================
GM_addStyle(`
    #bulk-delete-controls {
        padding: 5px 12px;
        display: flex;
        gap: 10px;
    }

    #panel-bulk-delete {
        display: flex;
        gap: 10px;
    }

    #btn-bulk-delete, #btn-delete-number, #btn-cancel-bulk {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 10px;
        text-align: center;
        font-size: 14px;
    }

    #btn-bulk-delete {
        background-color: transparent;
        border: 1px solid currentColor;
    }
    #btn-bulk-delete:hover {
        background-color: rgba(255,255,255,0.125);
    }

    #btn-delete-number {
        background-color: #990000;
    }
    #btn-delete-number:hover:not(:disabled) {
        background-color: #cc0000;
    }
    #btn-delete-number:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    #btn-cancel-bulk {
        background-color: #333333;
    }
    #btn-cancel-bulk:hover {
        background-color: #555555;
    }

    /* Selection mode: chats act as selectable items and their hover buttons are hidden */
    .chat-selectable {
        cursor: pointer !important;
        user-select: none !important;
    }

    body.bulk-selection-active ${chat_row_selector} button {
        display: none !important;
    }

    ${chat_row_selector}.chat-selected {
        background-color: rgba(102,0,0,0.2);
        outline: 2px solid #990000;
        outline-offset: -2px;
        border-radius: 8px;
    }

    /* Entries whose deletion request is still running are hidden right away */
    [data-quick-delete-pending] {
        display: none !important;
    }

    /* Quick delete: the trash button replaces the regular hover buttons of the hovered row while Shift is held */
    .quick-delete-btn {
        display: none;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: transparent;
        color: red;
        cursor: pointer;
        pointer-events: auto;
    }

    body.quick-delete-active ${chat_row_selector}:hover [data-hover-card-open-immediately] button:not(.quick-delete-btn) {
        display: none !important;
    }

    body.quick-delete-active ${chat_row_selector}:hover .quick-delete-btn {
        display: inline-flex;
    }
`);