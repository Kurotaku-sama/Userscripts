// ==UserScript==
// @name            ChatGPT Bulk & Quick Delete
// @namespace       https://kurotaku.de
// @version         1.0.2
// @description     Easily delete multiple chats in bulk or quickly remove individual chats with Shift + Hover. You can also export a single chat as a TXT file.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://chatgpt.com/*
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/ChatGPT_Bulk_and_Quick_Delete/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/ChatGPT_Bulk_and_Quick_Delete/script.user.js
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

// --------------------------
// Globals
// --------------------------
let shift_pressed      = false;
let selection_mode     = false;
let selection_observer = null;
let auth_token         = null;
let selected_chats     = new Set();
let quick_delete_locks = new Set();

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
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

// --------------------------
// Quick Delete Logic
// --------------------------
async function init_quick_delete_listeners() {
    const history_container = await wait_for_element("#history");
    if (!history_container) return;

    // Track the hovered chat element
    let hovered_chat = null;

    // Mouseenter / leave für alle a[href^="/c/"]
    history_container.addEventListener('mouseover', e => {
        const target = e.target.closest('a[href^="/c/"]');
        if (target) hovered_chat = target;
    });

    history_container.addEventListener('mouseout', e => {
        const target = e.target.closest('a[href^="/c/"]');
        if (target && target === hovered_chat) hovered_chat = null;
    });

    // Shift Listener only active if hovered_chat exists
    document.addEventListener('keydown', e => {
        if (e.key === 'Shift' && !shift_pressed && hovered_chat) {
            shift_pressed = true;
            toggle_quick_delete(true);
        }
    });

    document.addEventListener('keyup', e => {
        if (e.key === 'Shift' && shift_pressed) {
            shift_pressed = false;
            toggle_quick_delete(false);
        }
    });
}

function toggle_quick_delete(enable) {
    const chat_container = document.querySelector('#history');
    if (!chat_container) return;

    chat_container.querySelectorAll('a[href^="/c/"]').forEach(chat => {
        chat.onmouseenter = null;
        chat.onmouseleave = null;

        const show_trash = () => {
            if (!shift_pressed) return;
            const menu_btn = chat.querySelector('button.__menu-item-trailing-btn');
            if (menu_btn) menu_btn.style.display = 'none';

            let trash_btn = chat.querySelector('.quick-delete-btn');
            if (!trash_btn) {
                const trash_html = `
                      <button tabindex="0" class="__menu-item-trailing-btn quick-delete-btn" aria-label="Delete chat" style="margin-left:8px;cursor:pointer;background:transparent;border:none;color:red;">
                          <div>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon" aria-hidden="true">
                                  <path d="M10.6299 1.33496C12.0335 1.33496 13.2695 2.25996 13.666 3.60645L13.8809 4.33496H17L17.1338 4.34863C17.4369 4.41057 17.665 4.67858 17.665 5C17.665 5.32142 17.4369 5.58943 17.1338 5.65137L17 5.66504H16.6543L15.8574 14.9912C15.7177 16.629 14.3478 17.8877 12.7041 17.8877H7.2959C5.75502 17.8877 4.45439 16.7815 4.18262 15.2939L4.14258 14.9912L3.34668 5.66504H3C2.63273 5.66504 2.33496 5.36727 2.33496 5C2.33496 4.63273 2.63273 4.33496 3 4.33496H6.11914L6.33398 3.60645L6.41797 3.3584C6.88565 2.14747 8.05427 1.33496 9.37012 1.33496H10.6299ZM5.46777 14.8779L5.49121 15.0537C5.64881 15.9161 6.40256 16.5576 7.2959 16.5576H12.7041C13.6571 16.5576 14.4512 15.8275 14.5322 14.8779L15.3193 5.66504H4.68164L5.46777 14.8779ZM7.66797 12.8271V8.66016C7.66797 8.29299 7.96588 7.99528 8.33301 7.99512C8.70028 7.99512 8.99805 8.29289 8.99805 8.66016V12.8271C8.99779 13.1942 8.70012 13.4912 8.33301 13.4912C7.96604 13.491 7.66823 13.1941 7.66797 12.8271ZM11.002 12.8271V8.66016C11.002 8.29289 11.2997 7.99512 11.667 7.99512C12.0341 7.9953 12.332 8.293 12.332 8.66016V12.8271C12.3318 13.1941 12.0339 13.491 11.667 13.4912C11.2999 13.4912 11.0022 13.1942 11.002 12.8271ZM9.37012 2.66504C8.60726 2.66504 7.92938 3.13589 7.6582 3.83789L7.60938 3.98145L7.50586 4.33496H12.4941L12.3906 3.98145C12.1607 3.20084 11.4437 2.66504 10.6299 2.66504H9.37012Z"></path>
                              </svg>
                          </div>
                      </button>`;
                chat.insertAdjacentHTML('beforeend', trash_html);
                trash_btn = chat.querySelector('.quick-delete-btn');

                trash_btn.addEventListener('click', async e => {
                    e.stopPropagation();
                    e.preventDefault();

                    const href = chat.getAttribute('href');
                    if (quick_delete_locks.has(href)) return; // Already deleting
                    quick_delete_locks.add(href); // Lock

                    try {
                        await delete_chat(chat);
                        chat.remove();
                    } catch (err) {
                        await show_error_message({ title: "Failed to delete chat", text: err.error?.message || "Unknown error", chat_element: chat });
                    } finally {
                        quick_delete_locks.delete(href); // Unlock
                    }
                });
            }
            trash_btn.style.display = 'inline-block';
        };

        const hide_trash = () => {
            const menu_btn = chat.querySelector('button.__menu-item-trailing-btn');
            if (menu_btn) menu_btn.style.display = 'inline-block';
            const trash_btn = chat.querySelector('.quick-delete-btn');
            if (trash_btn) trash_btn.style.display = 'none';
        };

        chat.onmouseenter = show_trash;
        chat.onmouseleave = hide_trash;

        if (enable && chat.matches(':hover')) show_trash();
        if (!enable) hide_trash();
    });
}

// --------------------------
// Selection / Bulk Delete Logic
// --------------------------
function toggle_selection_mode() {
    selection_mode = !selection_mode;
    const toggle_btn = document.getElementById('btn-bulk-delete');
    const delete_btn = document.getElementById('btn-delete-number');
    const cancel_btn = document.getElementById('btn-cancel-bulk');
    const panel = document.getElementById('panel-bulk-delete');
    const chat_container = document.querySelector('#history');

    if (!chat_container) return;

    const add_listeners_to_chats = () => {
        const chat_items = chat_container.querySelectorAll('a[href^="/c/"]');
        chat_items.forEach(chat => {
            if (!chat.classList.contains('chat-selectable')) {
                chat.classList.add('chat-selectable');
                chat.addEventListener('click', handle_chat_click, true);
            }
        });
    }

    if (selection_mode) {
        toggle_btn.style.display = 'none';
        panel.style.display = 'flex';

        // bereits existierende Chats markieren
        add_listeners_to_chats();

        // Observer für nachgeladene Chats starten
        selection_observer = new MutationObserver(() => add_listeners_to_chats());
        selection_observer.observe(chat_container, { childList: true });
    } else {
        panel.style.display = 'none';
        toggle_btn.style.display = 'inline-block';

        // EventListener entfernen und Klassen aufräumen
        const chat_items = chat_container.querySelectorAll('a[href^="/c/"]');
        chat_items.forEach(chat => {
            chat.classList.remove('chat-selectable', 'chat-selected');
            chat.removeEventListener('click', handle_chat_click, true);
        });

        selected_chats.clear();
        update_delete_button();

        // Observer stoppen
        if (selection_observer) {
            selection_observer.disconnect();
            selection_observer = null;
        }
    }
}

function handle_chat_click(event) {
    event.preventDefault();
    event.stopPropagation();
    const chat_element = event.currentTarget;
    if (selected_chats.has(chat_element)) {
        selected_chats.delete(chat_element);
        chat_element.classList.remove('chat-selected');
    } else {
        selected_chats.add(chat_element);
        chat_element.classList.add('chat-selected');
    }
    update_delete_button();
}

function update_delete_button() {
    const delete_btn = document.getElementById('btn-delete-number');
    if (delete_btn) {
        delete_btn.textContent = `Delete ${selected_chats.size}`;
        delete_btn.disabled = selected_chats.size === 0;
    }
}

// --------------------------
// Bulk Delete Actions
// --------------------------
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

    Swal.fire({
        title: "Deleting chats...",
        html: `<progress value="0" max="${total}" style="width:100%"></progress><br>0/${total}`,
        showConfirmButton: false,
        allowOutsideClick: false,
        backdrop: true,
        theme: "dark",
        willOpen: () => Swal.showLoading(),
    });

    let success_count = 0;
    let error_count = 0;
    let aborted = false;

    for (let i = 0; i < chats_to_delete.length; i++) {
        try {
            await delete_chat(chats_to_delete[i]);
            chats_to_delete[i].style.transition = "opacity 0.5s";
            chats_to_delete[i].style.opacity = "0";
            await sleep_s(1);
            chats_to_delete[i].remove();
            success_count++;
        } catch (err) {
            // Only abort on "No auth token"
            if (err.error?.message?.includes("No auth token")) {
                await show_error_message({
                    title: "Auth Error",
                    text: err.error.message,
                    chat_element: err.chat_element
                });
                aborted = true;
                break;
            }

            // Other errors just count as failure and continue
            console.error(`[Delete Error] ${err.chat_title}: ${err.error?.message || "Unknown error"}`);
            error_count++;
            continue; // continue with next chat
        }

        Swal.update({
            html: `<progress value="${i+1}" max="${total}" style="width:100%"></progress><br>${i+1}/${total}`
        });
    }

    // Only show if not aborted
    if (!aborted) {
        Swal.close()
        let final_icon = "success";
        if (success_count === 0 && error_count > 0) final_icon = "error";
        else if (success_count > 0 && error_count > 0) final_icon = "warning";

        // Dynamisch HTML zusammenbauen
        let html_parts = [];
        if (success_count > 0)
            html_parts.push(`Successfully deleted: ${success_count}`);
        if (error_count > 0)
            html_parts.push(`Failed: ${error_count}`);

        const html_content = html_parts.join('<br>');

        Swal.fire({
            title: "Deletion finished",
            html: html_content,
            icon: final_icon,
            backdrop: true,
            theme: "dark",
        });
    }

    delete_btn.disabled = false;
    cancel_btn.disabled = false;

    if (selection_mode) toggle_selection_mode();
}

// --------------------------
// Delete Function
// --------------------------
async function delete_chat(chat_element) {
    // Ensure we have an auth token
    if (!auth_token) {
        const token_ok = await get_auth_token()
        if (!token_ok)
            throw {
                chat_element,
                chat_title: chat_element.textContent.trim(),
                error: new Error("No auth token")
            }
    }

    const href = chat_element.getAttribute('href')
    const conversation_id = href.split('/').pop()
    const chat_title = chat_element.textContent.trim()

    try {
        const response = await fetch(`https://chatgpt.com/backend-api/conversation/${conversation_id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${auth_token}`
            },
            body: JSON.stringify({ is_visible: false })
        })

        if (!response.ok)
            throw new Error(`Status ${response.status}`)

        return { chat_element }
    } catch (error) {
        throw { chat_element, chat_title, error }
    }
}

// --------------------------
// UI Initialization
// --------------------------
async function ensure_bulk_delete_panel() {
    let bulk_panel_observer_started = false;

    while (true) {
        // Warte zuerst auf mindestens 1 Chat
        await wait_for_element('#history > a[href^="/c/"]');

        // Dann Sidebar Header abwarten
        const container = await wait_for_element("#sidebar-header div.flex");

        // Panel einfügen
        const html = `
            <div id="bulk-delete-controls">
                <button id="btn-bulk-delete">Bulk Delete</button>
                <div id="panel-bulk-delete" style="display:none;">
                    <button id="btn-delete-number">Delete 0</button>
                    <button id="btn-cancel-bulk">Cancel</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforebegin', html);

        // Event-Handler binden
        document.getElementById('btn-bulk-delete').onclick = handle_bulk_delete_click;
        document.getElementById('btn-cancel-bulk').onclick = handle_cancel_bulk_click;
        document.getElementById('btn-delete-number').onclick = delete_selected_chats;

        if(!bulk_panel_observer_started) {
            bulk_panel_observer_started = true;
            observe_chat_list();
        }

        await wait_for_element_to_disappear("#bulk-delete-controls");
    }
}

function observe_chat_list() {
    const chat_container = document.querySelector('#history');
    if (!chat_container) return;

    check_chats(chat_container);

    const observer = new MutationObserver(() => check_chats(chat_container));
    observer.observe(chat_container, { childList: true, subtree: true });
}

function check_chats(chat_container) {
    const has_chats = chat_container.querySelector('a[href^="/c/"]');
    const controls = document.getElementById('bulk-delete-controls');
    if (!controls) return;

    if (has_chats)
        controls.style.display = 'flex';
    else {
        controls.style.display = 'none';
        // ensure we leave selection mode if no chats remain
        if (selection_mode)
            toggle_selection_mode();
    }
}

// --------------------------
// Event-Handler-Funktionen
// --------------------------
function handle_bulk_delete_click() {
    toggle_selection_mode();
    document.getElementById('btn-bulk-delete').style.display = 'none';
    document.getElementById('panel-bulk-delete').style.display = 'flex';
}

function handle_cancel_bulk_click() {
    toggle_selection_mode();
    document.getElementById('panel-bulk-delete').style.display = 'none';
    document.getElementById('btn-bulk-delete').style.display = 'inline-block';
}

// --------------------------
// Export Current Chat as TXT
// --------------------------
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

        let chat_title = data.title || "Untitled Chat";
        chat_title = chat_title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();

        let output = `Chat Export — ${new Date().toLocaleString()}\nConversation ID: ${conversation_id}\nTitle: ${chat_title}\n\n`;

        for (const key in data.mapping) {
            const node = data.mapping[key];
            if (!node.message) continue;

            const role = node.message.author.role;
            if (role !== "user" && role !== "assistant") continue;

            const content = node.message.content;
            let text_content = "";
            let has_attachment = false;

            // Detect text
            if (Array.isArray(content?.parts)) {
                for (const part of content.parts) {
                    if (typeof part === "string" && part.trim() !== "")
                        text_content += `${part.trim()}\n`;
                    else if (typeof part === "object" && part !== null)
                        has_attachment = true;
                }
            }

            // Detect attachments via metadata or attachments field
            if (node.message.metadata?.attachments?.length > 0) has_attachment = true;
            if (node.message.metadata?.files?.length > 0) has_attachment = true;

            // Final output line
            text_content = text_content.trim();
            if (text_content === "" && has_attachment)
                text_content = "[Has Attachment(s)]";

            if (text_content)
                output += `${role === "user" ? "User" : "ChatGPT"}:\n${text_content}\n\n`;
        }

        const blob = new Blob([output], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${chat_title}_${conversation_id}.txt`;
        a.click();
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

// --------------------------
// Auth Helpers
// --------------------------
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

// --------------------------
// Error Handling
// --------------------------
async function show_error_message({ title = "Error", text = "An error occurred", chat_element = null }) {
    console.error(`[ERROR] ${title}: ${text}`);
    await Swal.fire({
        title,
        text,
        icon: "error",
        backdrop: true,
        theme: "dark",
    });
}

// --------------------------
// CSS Styles
// --------------------------
GM_addStyle(`
    .hidden { display: none; }

    #bulk-delete-controls {
        padding: 5px;
        display: flex;
        gap: 10px;
    }

    #panel-bulk-delete {
        display: flex;
        gap: 10px;
    }

    #btn-bulk-delete, #btn-delete-number, #btn-cancel-bulk {
        display: inline-block;
        padding: 5px;
        border-radius: 10px;
        text-align: center;
    }

    #btn-bulk-delete {
        background-color: transparent;
        border: 1px solid white;
    }
    #btn-bulk-delete:hover {
        background-color: rgba(255,255,255,0.125);
    }
    #btn-bulk-delete.selection-active {
        background-color: #FFD166;
    }

    #btn-delete-number {
        background-color: #990000;
    }
    #btn-delete-number:hover {
        background-color: #cc0000;
    }

    #btn-cancel-bulk {
        background-color: #333333;
    }
    #btn-cancel-bulk:hover {
        background-color: #555555;
    }

    .chat-selectable {
        cursor: pointer !important;
        user-select: none !important;
    }

    .chat-selectable button {
        display: none !important;
    }

    a.chat-selected {
        background-color: rgba(102,0,0,0.2);
        border: 2px solid #990000;
        border-radius: 8px;
        box-sizing: border-box;
    }
`);