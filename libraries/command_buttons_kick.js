async function main() {
    await init_gm_config();

    const custom_css = (GM_config.fields["custom_css_styles"] ? GM_config.get("custom_css_styles") : "")?.trim();
    if (custom_css)
        GM_addStyle(custom_css);

    wait_for_element("#chatroom-footer").then(async () => {
        insert_command_buttons();
        watch_for_panel_removal();
        start_chat_message_observer();

        if (GM_config.fields["voucher_buttons"] && GM_config.get("voucher_buttons") && typeof setup_voucher_buttons === "function")
            setup_voucher_buttons();
    });
}

// Re-insert the panel whenever Kick re-renders the chat and wipes it out
async function watch_for_panel_removal() {
    while (true) {
        await wait_for_element_to_disappear("#k-main-container");
        await wait_for_element("#chatroom-footer");

        insert_command_buttons();
    }
}

// ========================
// Kick Chat Interaction
// ========================

function send_message_with_event(message) {
    const input = document.querySelector('div[data-testid="chat-input"][data-lexical-editor="true"]');
    if (!input) {
        console.error("Chat input not found.");
        return;
    }

    input.focus();

    // Clear whatever might already be in the input field
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);

    // Insert the text via execCommand, Kick's Lexical editor doesn't pick up plain value assignment
    document.execCommand("insertText", false, message);

    // Give Lexical a moment to process the input before sending
    setTimeout(() => {
        const send_button = document.querySelector("#send-message-button");
        send_button?.click();
    }, 80);
}

// ========================
// UI and Button Handling
// ========================

function insert_command_buttons() {
    document.querySelectorAll("#k-main-container").forEach(el => el.remove());

    let buttongroups = "";
    if (typeof generate_button_groups === "function")
        buttongroups = generate_button_groups()

    const html_buttongroups = buttongroups ? `<div id="k-actions" class="k-buttongroups">${buttongroups}</div>` : "";

    let html = `
        <div id="k-main-container" class="k-main-container">
            <div id="k-panel-buttons">
                <div id="k-make-draggable-button" title="Detach from chat">👆</div>
                <div id="k-grab-handle" class="k-hidden">🖐️</div>
                <div id="k-pin-button" class="k-hidden" title="Reattach to chat">📌</div>
                <div id="k-open-settings" title="Userscript settings">⚙️</div>
            </div>
            ${html_buttongroups}
        </div>
    `;
    document.querySelector("#chatroom-footer").insertAdjacentHTML("afterbegin", html);

    // Add event listeners for buttons
    document.querySelector("#k-targets #k-closebutton")?.addEventListener("click", () => switch_panel(null), false);
    document.querySelectorAll(".k-buttongroup .k-actionbutton")?.forEach(el => el.addEventListener("click", generate_command, false));
    document.querySelectorAll(".k-buttongroup .k-targetbutton")?.forEach(el => el.addEventListener("click", switch_panel, false));
    document.querySelectorAll(".k-selection-label")?.forEach(el => el.addEventListener("click", show_btn_menu, false));

    // Draggable buttons
    document.querySelector("#k-make-draggable-button")?.addEventListener("mousedown", () => make_draggable());
    document.querySelector("#k-pin-button")?.addEventListener("click", () => disable_draggable());
    document.querySelector("#k-open-settings")?.addEventListener("click", () => GM_config.open());
}

function switch_panel(event) {
    document.querySelector("#k-actions").classList.toggle("k-hidden");
    document.querySelector("#k-targets").classList.toggle("k-hidden");

    if (event) {
        const target_count = parseInt(event.target.getAttribute("data-targets"));
        const action = event.target.getAttribute("cmd");
        const target_buttons_container = document.getElementById("k-targetbuttons");

        // Set the data-action attribute for the targets panel
        document.querySelector("#k-targets").setAttribute("data-action", action);

        // Check if the number of existing buttons matches the target count
        const existing_buttons = target_buttons_container.querySelectorAll(".k-actionbutton");
        if (existing_buttons.length !== target_count) {
            // Clear existing buttons if the count doesn't match
            existing_buttons.forEach(button => button.remove());

            // Generate new buttons
            let target_buttons_html = "";
            for (let i = 1; i <= target_count; i++)
                target_buttons_html += btngrp_button(i, i);

            // Insert new buttons before the close button
            target_buttons_container.insertAdjacentHTML("afterbegin", target_buttons_html);

            // Add event listeners to the new buttons
            target_buttons_container.querySelectorAll(".k-actionbutton").forEach(el => {
                el.addEventListener("click", generate_command, false);
            });
        }

        // Adjust CSS for grid layout
        target_buttons_container.classList.remove("k-grid-1", "k-grid-2", "k-grid-3", "k-grid-4", "k-grid-5", "k-grid-6", "k-grid-7", "k-grid-8");

        // Calculate the number of buttons per row
        let buttons_per_row;
        if (target_count <= 6)
            buttons_per_row = target_count; // 1-6 Buttons: All in one row
        else if (target_count === 8)
            buttons_per_row = 4; // 8 Buttons: 4 per row
        else
            buttons_per_row = 6; // 7+ Buttons: 6 per row (except 8)

        target_buttons_container.classList.add(`k-grid-${buttons_per_row}`);
    }
}

function generate_command(event) {
    let cmd = "";
    if (event.target.parentNode.parentNode.getAttribute("data-action")) {
        cmd = event.target.parentNode.parentNode.getAttribute("data-action"); // Add action attack or divine in case its from the switched panel
        // Remove the data and go back to main panel
        event.target.parentNode.parentNode.setAttribute("data-action", "");
        switch_panel(null);
    }
    cmd += event.target.getAttribute("cmd");

    // Check if the button has random min and max attributes and append a random number if they exist
    if (event.target.hasAttribute("data-random-min") && event.target.hasAttribute("data-random-max"))
        cmd += `${random_number(parseInt(event.target.getAttribute("data-random-min")), parseInt(event.target.getAttribute("data-random-max")))}`;

    let suffix = "!";
    cmd = (GM_config.get("prevent_shadowban") ? `${suffix}${randomize_case(cmd)}` : `${suffix}${cmd}`).trim();

    if (cmd.trim() !== "" && cmd !== null)
        send_message_with_event(cmd);
    else
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Please contact script creator, this button doesn't seem to work correctly!",
            theme: "dark",
            backdrop: true,
        });
}

let voucher_watch_started = false;

// Static html around the generate-button placeholder, split out once and reused on every render
let voucher_before_html = "";
let voucher_after_html = "";
let voucher_template_captured = false;

function capture_voucher_template(html) {
    if (voucher_template_captured)
        return;

    const marker = generate_voucher_buttons();
    const marker_index = html.indexOf(marker);

    if (marker_index === -1) {
        voucher_before_html = html;
        voucher_after_html = "";
    } else {
        voucher_before_html = html.slice(0, marker_index);
        voucher_after_html = html.slice(marker_index + marker.length);
    }

    voucher_template_captured = true;
}

function render_voucher_html() {
    const dynamic_part = cached_voucher_html !== null ? cached_voucher_html : "";
    return voucher_before_html + dynamic_part + voucher_after_html;
}

function insert_voucher_buttons(html) {
    capture_voucher_template(html);
    render_and_insert_voucher_panel();
}

function render_and_insert_voucher_panel() {
    const rendered_html = render_voucher_html();

    wait_for_element("#chat-input-wrapper").then(async () => {
        document.querySelectorAll("#k-voucher-container").forEach(el => el.remove());

        const wrapped_html = `<div id="k-voucher-container" class="k-store-buttongroups"><div class="k-buttongroup">${rendered_html}</div></div>`;
        document.querySelector("#chat-input-wrapper")?.insertAdjacentHTML("afterend", wrapped_html);

        document.querySelectorAll(".k-get_voucher_button").forEach(button => {
            button.addEventListener("click", async event => {
                await purchase_voucher(event);
            }, false);
        });

        if (!voucher_watch_started) {
            voucher_watch_started = true;
            watch_for_voucher_panel_removal();
        }
    });
}

// #chat-input-wrapper re-renders separately from the rest of the chat
async function watch_for_voucher_panel_removal() {
    while (true) {
        await wait_for_element_to_disappear("#k-voucher-container");
        await wait_for_element("#chat-input-wrapper");

        if (typeof setup_voucher_buttons === "function")
            setup_voucher_buttons();
    }
}

// ========================
// Auto-generated Voucher Buttons
// ========================

let cached_voucher_html = null;
let auto_generate_attempted = false;

// Position marker for insert_voucher_buttons(), also kicks off the background scrape once
function generate_voucher_buttons() {
    if (!auto_generate_attempted) {
        auto_generate_attempted = true;

        (async () => {
            await wait_for_element('[data-testid="channel-points-button"]');
            await generate_and_cache_voucher_buttons();

            // First attempt sometimes runs before the rewards grid finished loading, retry once
            if (cached_voucher_html === null) {
                await sleep_s(2);
                await generate_and_cache_voucher_buttons();
            }
        })();
    }

    return `<div class="k-voucher-placeholder"></div>`;
}

function extract_number_from_title(title) {
    const match = title.match(/\d[\d.,]*/);
    return match ? match[0] : null;
}

// "5,000" -> "5k", "5,000,000" -> "5kk", "120.000" -> "120k"
function format_thousands(raw_number) {
    let digits = raw_number.replace(/[.,]/g, "");
    let k_count = 0;

    while (digits.length > 3 && digits.endsWith("000")) {
        digits = digits.slice(0, -3);
        k_count++;
    }

    return digits + "k".repeat(k_count);
}

function build_voucher_button_text(title, pattern_config) {
    const raw_number = extract_number_from_title(title);
    if (!raw_number)
        return null;

    const formatted_number = pattern_config.convert_thousands ? format_thousands(raw_number) : raw_number.replace(/[.,]/g, "");
    return pattern_config.pattern.replace("<Number>", formatted_number);
}

function is_rewards_panel_visible() {
    const panel = document.querySelector("#rewards-panel");
    return !!panel && panel.getBoundingClientRect().height > 10;
}

// Stylesheet rule instead of an inline style, survives Kick re-rendering #rewards-panel
function set_rewards_panel_hidden(hidden) {
    const existing_style = document.getElementById("k-hide-rewards-panel-style");

    if (hidden) {
        if (!existing_style) {
            const html = `<style id="k-hide-rewards-panel-style">#rewards-panel { visibility: hidden !important; }</style>`;
            document.head.insertAdjacentHTML("beforeend", html);
        }
        document.querySelector("#rewards-panel")?.style.setProperty("visibility", "hidden", "important");
    } else {
        existing_style?.remove();
        document.querySelector("#rewards-panel")?.style.removeProperty("visibility");
    }
}

async function scrape_reward_titles() {
    const points_button = document.querySelector('[data-testid="channel-points-button"]');
    if (!points_button)
        return [];

    // Only open/close it ourselves if it wasn't already open
    const was_already_open = is_rewards_panel_visible();

    if (!was_already_open) {
        set_rewards_panel_hidden(true);
        points_button.click();
        await sleep_s(0.5); // let the open transition settle
    }

    await wait_for_element("#rewards-panel .grid.grid-cols-3");
    const rewards_container = document.querySelector("#rewards-panel .grid.grid-cols-3");
    const titles = Array.from(rewards_container.querySelectorAll("p[title]")).map(p => p.getAttribute("title"));

    if (!was_already_open) {
        points_button.click();
        await sleep_s(1); // let the close transition finish before revealing it again
        set_rewards_panel_hidden(false);
    }

    return titles;
}

let voucher_generation_in_progress = false;

async function generate_and_cache_voucher_buttons() {
    if (typeof voucher_patterns === "undefined" || !Array.isArray(voucher_patterns))
        return;

    if (voucher_generation_in_progress)
        return;
    voucher_generation_in_progress = true;

    const titles = await scrape_reward_titles();
    let buttons_html = "";

    titles.forEach(title => {
        const matching_pattern = voucher_patterns.find(pattern_config => pattern_config.match.test(title));
        if (!matching_pattern)
            return;

        const button_text = build_voucher_button_text(title, matching_pattern);
        if (!button_text)
            return;

        buttons_html += generate_voucher_button(title, button_text, { classes: "k-auto-generated-voucher-button" });
    });

    cached_voucher_html = buttons_html || null; // keep null (not "") so a later retry still has a chance
    render_and_insert_voucher_panel();

    voucher_generation_in_progress = false;
}

function generate_voucher_button(voucher, text, options = {}) {
    const { classes = "" } = options

    let base_class = "k-actionbutton k-get_voucher_button"
    let combined_classes = (base_class + ` ${classes ?? ""}`).trim()
    let attributes = `voucher="${voucher}" class="${combined_classes}"`

    return `<button ${attributes}>${text}</button>`
}

function btngrp_label(label) {
    return `<label class="k-buttongroup-label">${label}</label>`;
}

function lblgrp_label(btn_menu, name, classes="") {
    return `<label class="k-selection-label ${classes}" data-btn-menu="${btn_menu}">${name}</label>`;
}

function btngrp_button(cmd, text, options = {}) {
    const { classes = "", targets = null, random_min = null, random_max = null } = options;

    let base_class = targets !== null ? "k-targetbutton" : "k-actionbutton";
    let combined_classes = (base_class + ` ${classes ?? ""}`).trim();
    let attributes = `cmd="${cmd}" class="${combined_classes}"`;
    if (targets !== null) attributes += ` data-targets="${targets}"`;
    if (random_min !== null && random_max !== null) attributes += ` data-random-min="${random_min}" data-random-max="${random_max}"`;
    return `<button ${attributes}>${text}</button>`;
}

function show_btn_menu(event) {
    let btn_menus = document.querySelectorAll(".k-btn-menu");
    let label_group = event.target.closest(".k-labelgroup");
    let close_button = label_group.querySelector(`label[data-btn-menu="close"]`);

    btn_menus.forEach(el => {
        el.getAttribute("data-btn-menu") === event.target.getAttribute("data-btn-menu") ? el.classList.remove("k-hidden") : el.classList.add("k-hidden");
    });

    let all_hidden = Array.from(btn_menus).every(el => el.classList.contains("k-hidden"));
    all_hidden ? close_button.classList.add("k-hidden") : close_button.classList.remove("k-hidden");
}

// ========================
// Draggable Container
// ========================

function make_draggable() {
    const container = document.querySelector("#k-main-container");
    const make_draggable_button = document.querySelector("#k-make-draggable-button");
    const grab_handle = document.querySelector("#k-grab-handle");
    const pin_button = document.querySelector("#k-pin-button");

    if (container && make_draggable_button && grab_handle && pin_button) {
        // Save the initial position of the container relative to the viewport
        const initial_rect = container.getBoundingClientRect();

        // Add the "draggable" class
        container.classList.add("k-draggable");

        // Hide the make-draggable button and show the k-grab-handle and pin button
        make_draggable_button.classList.add("k-hidden");
        grab_handle.classList.remove("k-hidden");
        pin_button.classList.remove("k-hidden");

        // Move the container to the body (to ensure it's above other elements)
        document.body.appendChild(container);

        // Set the initial position
        container.style.left = `${initial_rect.left}px`;
        container.style.top = `${initial_rect.top}px`;

        // Enable dragging only when the k-grab-handle is clicked
        interact(grab_handle).draggable({
            listeners: {
                move(event) {
                    const target = container;
                    const rect = target.getBoundingClientRect();
                    const window_width = window.innerWidth;
                    const window_height = window.innerHeight;

                    // Calculate new position based on mouse movement
                    let x = rect.left + event.dx;
                    let y = rect.top + event.dy;

                    // Round x and y to prevent jitter caused by subpixel values
                    x = Math.round(x);
                    y = Math.round(y);

                    // Constrain the position to keep the container within the window bounds
                    x = Math.max(0, Math.min(x, window_width - rect.width));
                    y = Math.max(0, Math.min(y, window_height - rect.height));

                    // Update the container's position
                    target.style.left = `${x}px`;
                    target.style.top = `${y}px`;
                }
            }
        });
    }
}

function disable_draggable() {
    const container = document.querySelector("#k-main-container");
    const make_draggable_button = document.querySelector("#k-make-draggable-button");
    const grab_handle = document.querySelector("#k-grab-handle");
    const pin_button = document.querySelector("#k-pin-button");

    if (container && make_draggable_button && grab_handle && pin_button) {
        // Remove the "draggable" class
        container.classList.remove("k-draggable");

        // Disable dragging
        interact(grab_handle).draggable(false);

        // Reset the container to its original position
        container.style.left = "";
        container.style.top = "";

        // Move the container back to the chatroom footer
        document.querySelector("#chatroom-footer")?.insertAdjacentElement("afterbegin", container);

        // Show the make-draggable button and hide the k-grab-handle and pin button
        make_draggable_button.classList.remove("k-hidden");
        grab_handle.classList.add("k-hidden");
        pin_button.classList.add("k-hidden");
    }
}

// ========================
// Notifications
// ========================

// Kick highlights any message that mentions the logged-in user (or replies to one of
// their messages) with a "border-green-500" class, that's more reliable than matching the
// username against the raw text ourselves
async function start_chat_message_observer() {
    if (!GM_config.fields["notifications"] || !GM_config.get("notifications"))
        return;

    // Dedupe by data-index, Kick recreates message nodes while scrolling
    const notified_indices = new Set();

    // Chat history keeps streaming in for a few seconds after (re)appearing, hold off notifying until that settles
    let warm_up_done = false;
    let chat_was_present = false;

    const start_warm_up = async () => {
        warm_up_done = false;
        await sleep_s(5);
        warm_up_done = true;
    };

    const process_messages = () => {
        const chat_container = document.querySelector("#chatroom-messages");

        if (!chat_container) {
            chat_was_present = false;
            return;
        }

        if (!chat_was_present) {
            chat_was_present = true;
            start_warm_up();
        }

        if (!warm_up_done)
            return;

        chat_container.querySelectorAll(".border-green-500").forEach(node => {
            const message_wrapper = node.closest("[data-index]");
            const message_id = message_wrapper?.getAttribute("data-index");

            if (!message_id || notified_indices.has(message_id))
                return;
            notified_indices.add(message_id);

            let msg = node.innerText?.trim();
            let author = node.querySelector('button[data-prevent-expand="true"]')?.textContent;

            GM_notification({
                title: `Channel: ${kick_channel} - ${author} mentioned you!`,
                text: `${msg}`,
                timeout: 15000,
                silent: false
            });
        });
    };

    // document.body never gets replaced during re-renders, unlike #chatroom-messages
    const observer = new MutationObserver(() => process_messages());
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
    });

    process_messages();
}

// ========================
// Purchase Functions
// ========================

async function purchase_voucher(trigger) {
    let voucher = trigger.target.getAttribute("voucher");
    let points_button = document.querySelector('[data-testid="channel-points-button"]');
    points_button.click();

    wait_for_element("#rewards-panel .grid.grid-cols-3").then(async () => { // Wait till the rewards grid is showing
        let rewards_container = document.querySelector("#rewards-panel .grid.grid-cols-3");
        let reward_button = Array.from(rewards_container.querySelectorAll("button")).find(btn => btn.querySelector(`p[title="${voucher}"]`));

        if (reward_button) { // Open the voucher redeem detail view
            reward_button.click();
            wait_for_element('#rewards-panel button[type="submit"]').then(async () => { // Wait till the redeem button is showing
                let redeem_button = document.querySelector('#rewards-panel button[type="submit"]');
                if (!redeem_button.disabled)
                    redeem_button.click();
                else {
                    points_button.click();
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Reward not available, you don't have enough channel points!",
                        theme: "dark",
                        backdrop: true,
                    });
                }
            });
        }
        else
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Reward not found, maybe it's disabled at the moment, if not than please contact script creator via Discord!",
                theme: "dark",
                backdrop: true,
            });
    });
}

// ========================
// CSS Styles
// ========================

GM_addStyle(`
.k-actionbutton,
.k-targetbutton {
    box-sizing: border-box;
    padding: 4px 10px;
    background-color: var(--color-primary-base);
    color: var(--color-primary-onPrimary);
    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    overflow: hidden;
    text-decoration: none;
    text-decoration-color: currentcolor;
    white-space: nowrap;
    user-select: none;
    font-weight: 600;
    font-size: 12px;
    height: 25px;
    border-radius: 6px;
}

.k-actionbutton:hover,
.k-targetbutton:hover {
    filter: brightness(1.15);
}

.k-main-container {
    min-height: 30px;
    min-width: 300px;
    position: relative;
    background: inherit;
    border-top: 2px solid var(--color-primary-base);
    padding: 10px 15px;
}

.k-main-container.k-draggable {
    border: 2px solid var(--color-primary-base);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
 }

.k-store-buttongroups {}

.k-buttongroups {
    padding: 0;
}

.k-buttongroup {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.k-buttongroup-label {
    font-size: 13px;
    user-select: none;
}

.k-labelgroup {
    margin-top: 5px;
    font-size: 17px;
    gap: 25px;
    display: flex;
}

.k-hidden {
    display: none;
}

#k-panel-buttons {
    position: absolute;
    top: 5px;
    right: 5px;
    user-select: none;
    font-size: 16px;
    display: grid;
    gap: 5px;
    grid-auto-flow: column;
}

#k-pin-button,
#k-make-draggable-button,
#k-open-settings {
    cursor: pointer;
}

#k-grab-handle {
    cursor: grab;
}

.k-grid-1 { display: grid; grid-template-columns: repeat(1, min-content); }
.k-grid-2 { display: grid; grid-template-columns: repeat(2, min-content); }
.k-grid-3 { display: grid; grid-template-columns: repeat(3, min-content); }
.k-grid-4 { display: grid; grid-template-columns: repeat(4, min-content); }
.k-grid-5 { display: grid; grid-template-columns: repeat(5, min-content); }
.k-grid-6 { display: grid; grid-template-columns: repeat(6, min-content); }
.k-grid-7 { display: grid; grid-template-columns: repeat(7, min-content); }
.k-grid-8 { display: grid; grid-template-columns: repeat(8, min-content); }
`);