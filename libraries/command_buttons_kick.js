async function main() {
    await init_gm_config();

    const custom_css = (GM_config.fields["custom_css_styles"] ? GM_config.get("custom_css_styles") : "")?.trim();
    if (custom_css)
        GM_addStyle(custom_css);

    if (GM_config.fields["notifications"] && GM_config.get("notifications"))
        wait_for_element("nav img.rounded-full").then(async () => {
            username = get_kick_username();
        });

    wait_for_element("#chatroom-footer").then(async () => {
        if (GM_config.fields["notifications"] && GM_config.get("notifications"))
            observe_chat_for_username_mentions();

        insert_command_buttons();
        watch_for_panel_removal();

        if (GM_config.fields["voucher_buttons"] && GM_config.get("voucher_buttons") && typeof generate_voucher_buttons === "function")
            generate_voucher_buttons();
    });
}

// Kick occasionally re-renders the whole chat, which wipes out the injected panel along
// with it. This keeps watching for the panel to disappear and re-inserts it every time.
async function watch_for_panel_removal() {
    while (true) {
        await wait_for_element_to_disappear("#k-main-container");
        await wait_for_element("#chatroom-footer");

        insert_command_buttons();
    }
}

// ========================
// Username
// ========================

let username = null;

// The navbar shows the logged-in user's profile picture with their username in the alt attribute
function get_kick_username() {
    const profile_image = document.querySelector("nav img.rounded-full");
    return profile_image?.alt || null;
}

// ========================
// Kick Chat Interaction
// ========================

// Kick's chat input is a Lexical editor. Typing text via innerText or value assignment
// does not update Lexical's internal state, so the text has to be inserted through
// document.execCommand("insertText", ...) instead, which Lexical picks up as a real input event.
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

    // Insert the command text so Lexical registers it as a real input
    document.execCommand("insertText", false, message);

    // Give Lexical a moment to process the input before triggering the send button
    setTimeout(() => {
        const send_button = document.querySelector("#send-message-button");
        send_button?.click();
    }, 80);
}

// ========================
// UI and Button Handling
// ========================

function insert_command_buttons() {
    document.querySelectorAll("#k-main-container").forEach(el => el.remove()); // safety net in case this runs while the panel is already present

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

function insert_voucher_buttons(html) {
    wait_for_element("#rewards-panel").then(async () => {
        document.querySelectorAll("#k-voucher-container").forEach(el => el.remove()); // safety net against duplicates, nuke all matches

        const wrapped_html = `<div id="k-voucher-container" class="k-store-buttongroups"><div class="k-buttongroup">${html}</div></div>`;
        document.querySelector("#rewards-panel")?.insertAdjacentHTML("beforebegin", wrapped_html);

        document.querySelectorAll(".k-get_voucher_button").forEach(button => {
            button.addEventListener("click", async event => {
                await purchase_voucher(event);
            }, false);
        });

        // Only ever run one watch loop, generate_voucher_buttons() re-triggers this
        // function on every re-render, starting a second loop would stack duplicates
        if (!voucher_watch_started) {
            voucher_watch_started = true;
            watch_for_voucher_panel_removal();
        }
    });
}

// Kick re-renders the rewards panel independently from the chat panel, so this needs
// its own watch loop instead of piggybacking on watch_for_panel_removal().
async function watch_for_voucher_panel_removal() {
    while (true) {
        await wait_for_element_to_disappear("#k-voucher-container");
        await wait_for_element("#rewards-panel");

        if (typeof generate_voucher_buttons === "function")
            generate_voucher_buttons();
    }
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
        // Save the initial position of the container relative to the viewport, this has to
        // happen before the "k-draggable" class is applied, since that class switches the
        // container to fixed positioning and would otherwise already distort the reading
        const initial_rect = container.getBoundingClientRect();

        // Add the "draggable" class
        container.classList.add("k-draggable");

        // Hide the make-draggable button and show the k-grab-handle and pin button
        make_draggable_button.classList.add("k-hidden");
        grab_handle.classList.remove("k-hidden");
        pin_button.classList.remove("k-hidden");

        // Move the container to the body (to ensure it's above other elements)
        document.body.appendChild(container);

        // Position it exactly where it was before detaching, using fixed viewport coordinates
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
                    x = Math.max(0, Math.min(x, window_width - rect.width)); // Left and right edges
                    y = Math.max(0, Math.min(y, window_height - rect.height)); // Top and bottom edges

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

function observe_chat_for_username_mentions() {
    wait_for_element("#chatroom-messages").then(async () => {
        const chat_container = document.querySelector("#chatroom-messages");
        await sleep_s(5);

        if (username && username != "") {
            // Create a MutationObserver to watch for new messages
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        // Check if the added node is a chat message
                        let msg = node.innerText?.trim();
                        if (msg && msg.toLowerCase().includes(username.toLowerCase())) {
                            let author = node.querySelector('button[data-prevent-expand="true"]')?.textContent;
                            GM_notification({
                                title: `Channel: ${kick_channel} - ${author} mentioned you!`,
                                text: `${msg}`,
                                timeout: 15000,
                                silent: false
                            });
                        }
                    });
                });
            });

            // Start observing the chat container for new child nodes
            observer.observe(chat_container, {
                childList: true, // Watch for added or removed child nodes
                subtree: true, // Watch all descendants of the container
            });
        }
    });
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
}

.k-main-container.k-draggable {
    border: 2px solid var(--color-primary-base);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
 }

.k-store-buttongroups {
    padding: 0px 15px 15px;
}

.k-buttongroups {
    padding: 25px 15px 15px;
}

.k-buttongroup {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.k-buttongroup-label {
    user-select: none;
    font-size: 13px;
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