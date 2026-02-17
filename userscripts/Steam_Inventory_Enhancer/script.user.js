// ==UserScript==
// @name            Steam Inventory Enhancer
// @namespace       https://kurotaku.de
// @version         1.1.1
// @description     Adds mass stacking/unstacking tools, a customizable sidebar with favorites, advanced inventory filtering/sorting, and ASF IPC integration for seamless 2FA confirmations.
// @description:de  Fügt Tools zum Massen-Stapeln/Entstapeln, eine anpassbare Seitenleiste mit Favoriten, erweiterte Filter- und Sortierfunktionen für Inventare sowie eine ASF-IPC-Integration für 2FA-Bestätigungen hinzu.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://steamcommunity.com/profiles/*/inventory*
// @match           https://steamcommunity.com/id/*/inventory*
// @icon            https://steamcommunity.com/favicon.ico
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_Inventory_Enhancer/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_Inventory_Enhancer/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @grant           GM_xmlhttpRequest
// @run-at          document-body
// ==/UserScript==

// ==========================================================
// Main
// ==========================================================
(async function() {
    await init_gm_config();

    if (GM_config.get("inv_sidebar_enabled"))
        Sidebar.init();

    if (GM_config.get("item_stacker_enabled")) {
        (async () => {
            await wait_for_element(".new_trade_offer_btn");
            Stacker.init();
        })();
    }

    if (GM_config.get("inv_favorites_enabled"))
        Favorites.init();

    if (GM_config.get("filter_search_enabled"))
        Filter.init();

    if (GM_config.get("asf_enabled"))
        ASF.init();
})();

async function init_gm_config() {
    const config_id = "configuration_sie";
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Steam Inventory Enhancer',
        fields: {
            inv_sidebar_enabled: {
                section: ['Sidebar Settings'],
                type: 'checkbox',
                default: true,
                label: 'Enable Inventories Sidebar',
            },
            inv_sidebar_hide_active_headline: {
                type: 'checkbox',
                default: false,
                label: 'Hide active inventory headline',
            },
            inv_sidebar_rows: {
                label: 'Sidebar Columns<br>Higher values require more screen space',
                type: 'select',
                options: ['1', '2', '3', '4'],
                default: '2',
            },
            item_stacker_enabled: {
                section: ['Item Stacker Settings'],
                type: 'checkbox',
                default: true,
                label: 'Enable Stacker Panel',
            },
            item_stacker_max_size_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable Max Stack Size Input<br>(if disabled, stacks will be infinite)',
            },
            item_stacker_single_row: {
                type: 'checkbox',
                default: true,
                label: 'Compact Stacker Layout<br>Toggle between single-row and multi-row display',
            },
            inv_favorites_enabled: {
                section: ['Favorites'],
                type: 'checkbox',
                default: true,
                label: 'Enable Favorites',
            },
            inv_favorites_order: {
                label: 'Order of the Favorites in the Favorites section',
                type: 'select',
                options: ['Name', 'Amount', 'Added to Favorites', 'Added to Favorites Reversed'],
                default: 'Amount',
            },
            filter_search_enabled: {
                section: ['Filter & Search'],
                type: 'checkbox',
                default: true,
                label: 'Enable Filter & Search'
            },
            filter_search_ctrl_f_hotkey: {
                type: 'checkbox',
                default: true,
                label: 'Override CTRL + F to focus searchbox'
            },
            asf_enabled: {
                section: ['ArchiSteamFarm (ASF) Integration'],
                type: 'checkbox',
                default: false,
                label: 'Enable ASF Integration<br>' +
                '<small style="color: red; display: block; line-height: 1.3; margin-top: 5px;">' +
                '<b>WARNING:</b> This feature connects to your ASF IPC interface.<br>' +
                'Ensure your IPC is secured with a password and you use SSL.<br>' +
                'The author is not responsible for accidental confirmations or account issues.<br>' +
                'Use at your own risk!</small>',
            },
            asf_ip: {
                label: 'IP/Hostname',
                type: 'input',
                default: '127.0.0.1',
            },
            asf_port: {
                label: 'Port',
                type: 'number',
                default: 1242,
            },
            asf_password: {
                label: 'IPC Password (if set)',
                type: 'input',
                default: '',
            },
            asf_botname: {
                label: 'Bot Name (Use ASF for all Bots)',
                type: 'text',
                default: 'ASF',
            },
            install_steam_economy_enhancer: {
                section: ['Third-Party Recommendations'],
                label: "Install Steam Economy Enhancer",
                type: "button",
                size: 100,
                click: () => window.open("https://raw.githubusercontent.com/Nuklon/Steam-Economy-Enhancer/master/code.user.js", "_blank"),
            },
            install_augmented_steam: {
                label: "Install Augmented Steam",
                type: "button",
                size: 100,
                click: () => window.open("https://augmentedsteam.com/", "_blank"),
            },
        },
        events: {
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
}

// ==========================================================
// Sidebar
// ==========================================================
class Sidebar {
    static init() {
        this.inject_styles();
    }

    static inject_styles() {
        // Get rows and check if headline must be hidden (only own inventory)
        const rows = GM_config.get("inv_sidebar_rows") || '2';
        const hide_headline = GM_config.get("inv_sidebar_hide_active_headline");

        GM_addStyle(`
            ${hide_headline ? `
                .games_list_separator:not(.actionable) {
                    display: none;
                }
            ` : ''}

            @media (min-width: 1450px) {
                #BG_bottom, #mainContents {
                    width: unset !important;
                    max-width: unset !important;
                    display: grid !important;
                }

                #mainContents > *:not(.tabitems_ctn):not(#tabcontent_inventory) {
                    grid-column: 1 / span 2;
                }

                #tabcontent_inventory {
                    margin-top: unset;
                }

                .games_list_tabs {
                    display: grid !important;
                    grid-template-columns: repeat(${rows}, 1fr);
                    overflow-y: auto;
                    overflow-x: hidden;
                    max-height: min(100vh, 600px);
                }
            }
        `);
    }
}


// ==========================================================
// Stacker
// ==========================================================
class Stacker {
    // Global identifiers for the active Steam inventory session
    static g_app_id = 0;
    static g_context_id = 2;
    static g_token = "";
    static is_cancelled = false;
    // Delay to prevent rate limiting (429) from Steam API
    static DELAY_MS = 300;
    static INV_AMOUNT = 1000;
    // Inventories where stacking is not supported or handled differently by Steam
    static ITEM_STACKER_IGNORED_INVENTORIES = [753, 730, 440, 570, 238460, 252490, 304930];

    static init() {
        // Attempt to retrieve the required WebAPI token from the page source
        if (!this.fetch_api_token())
            console.error("[SIE Stacker] Failed to load Token.");

        // Locate the inventory action area to inject the UI
        const btn_area = document.querySelector("div.inventory_links");
        if (!btn_area) return;

        // Load user preferences for UI display
        const show_max_size = GM_config.get("item_stacker_max_size_enabled");
        const is_single_row = GM_config.get("item_stacker_single_row");

        // Build the HTML panel for Stack/Unstack controls
        const panel_html = `
            <div class="sie_item_stacker_container ${is_single_row ? 'sie_item_stacker_single_row' : 'sie_item_stacker_multi_row'}">
                <div class="sie_item_stacker_row">
                    <button id="sie_item_stacker_btn_stack" class="btn_grey_black btn_medium" title="Stack identical items"><span>Stack</span></button>
                    <button id="sie_item_stacker_btn_unstack" class="btn_grey_black btn_medium" title="Split stacks into single units"><span>Unstack</span></button>
                </div>
                <div class="sie_item_stacker_row" style="${show_max_size ? '' : 'display: none;'}">
                    <label for="sie_item_stacker_ipt_max">Max Stack size: </label>
                    <input id="sie_item_stacker_ipt_max" class="sie_item_stacker_inputbox" type="number" min="0" step="1" placeholder="0">
                </div>
            </div>
        `;

        btn_area.insertAdjacentHTML('afterbegin', panel_html);

        const input_max = document.getElementById("sie_item_stacker_ipt_max");
        input_max.value = GM_getValue("sie_item_stacker_limit", "0");

        // Input validation: Allow navigation keys and numbers, block everything else
        restrict_input_to_numbers(input_max);

        document.getElementById("sie_item_stacker_btn_stack").onclick = () => this.execute_action("stack");
        document.getElementById("sie_item_stacker_btn_unstack").onclick = () => this.execute_action("unstack");
    }


    static fetch_api_token() {
        // Steam stores the loyalty/webapi token in a JSON blob within this element
        let el = document.querySelector("#application_config");
        if (el) {
            this.g_token = el.getAttribute("data-loyalty_webapi_token")?.replace(/"/g, "");
            return !!this.g_token;
        }
        return false;
    }

    static get_game_name() {
        // Extracts the display name of the currently selected game from the inventory tabs
        const active_tab = document.querySelector(".games_list_tab.active .games_list_tab_name");
        return active_tab ? active_tab.innerText.trim() : "Game";
    }

    static update_inventory_context() {
        // Syncs global variables with Steam's internal g_ActiveInventory object
        if (typeof g_ActiveInventory !== 'undefined' && g_ActiveInventory.m_appid) {
            this.g_app_id = g_ActiveInventory.m_appid;
            this.g_context_id = g_ActiveInventory.m_contextid;
            return true;
        }
        return false;
    }

    static async execute_action(mode) {
        this.is_cancelled = false;

        if (!this.update_inventory_context()) {
            Swal.fire({
                title: "Error",
                text: "Could not detect active inventory. Please select a game first.",
                icon: "error",
                theme: "dark"
            });
            return;
        }

        // Prevent execution on inventories known to cause issues or errors
        if (this.ITEM_STACKER_IGNORED_INVENTORIES.includes(parseInt(this.g_app_id))) {
            Swal.fire({
                title: "Not Supported",
                text: `This inventory is not (un)stackable (AppID: ${this.g_app_id}).`,
                icon: "warning",
                theme: "dark"
            });
            return;
        }

        const input_el = document.getElementById("sie_item_stacker_ipt_max");
        let stack_max = GM_config.get("item_stacker_max_size_enabled") ? parseInt(input_el.value) : 0;
        if (isNaN(stack_max))
            stack_max = 0;

        const game_name = this.get_game_name();
        if (GM_config.get("item_stacker_max_size_enabled"))
            GM_setValue("sie_item_stacker_limit", stack_max.toString());

        Swal.fire({
            title: "Fetching inventory...",
            allowOutsideClick: false,
            showConfirmButton: false,
            theme: "dark",
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Fetch the full list of assets via the inventory Web API
            const inv = await this.load_inventory_with_retry(this.g_app_id, this.g_context_id, this.INV_AMOUNT);
            if (!inv || !inv.assets)
                throw new Error("Failed to load inventory (Steam API error).");

            const assets = inv.assets;
            let success = false;

            // Delegate task to specific handler based on user choice
            if (mode === "stack")
                success = await this.handle_stacking(assets, game_name, stack_max);
            else
                success = await this.handle_unstacking(assets, game_name);

            // Refresh page on success to show updated inventory layout
            if (success)
                location.reload();
            else
                Swal.close();
        } catch (err) {
            if (!this.is_cancelled)
                Swal.fire({
                    title: "Error",
                    text: err.message || err,
                    icon: "error",
                    theme: "dark"
                });
            else
                Swal.close();
        }
    }

    static async load_inventory_with_retry(app_id, context_id, count) {
        let all_assets = [];
        let last_assetid = null;
        let has_more = true;
        let retry_count = 0;

        // Loop through paginated inventory results
        while (has_more && !this.is_cancelled) {
            let url = `https://steamcommunity.com/inventory/${g_steamID}/${app_id}/${context_id}?l=english&count=${count}`;
            if (last_assetid)
                url += `&start_assetid=${last_assetid}`;

            try {
                const res = await fetch(url);
                if (!res.ok)
                    throw new Error(`Steam API error: ${res.status}`);

                const data = await res.json();

                if (data && data.assets) {
                    all_assets = all_assets.concat(data.assets);

                    // Handle pagination if Steam indicates more items are available
                    if (data.more_items && data.assets.length === count) {
                        last_assetid = data.last_assetid;
                        await new Promise(r => setTimeout(r, 1000));
                    } else
                        has_more = false;
                } else
                    throw new Error("No assets in response");
            } catch (e) {
                // Simple retry logic for network instability
                if (retry_count < 2) {
                    retry_count++;
                    await new Promise(r => setTimeout(r, 2000));
                } else
                    has_more = false;
            }
        }

        return { assets: all_assets };
    }

    static async handle_stacking(assets, game_name, stack_max) {
        const item_group = {};
        const descriptions = g_ActiveInventory.m_rgDescriptions || {};

        // Group items by classid and instanceid to identify identical items
        assets.forEach(item => {
            const { classid, instanceid } = item;
            const key = `${classid}_${instanceid}`;

            if (!item_group[key])
                item_group[key] = [];
            item.amount = parseInt(item.amount);

            // Attach display name for progress tracking UI
            const desc = descriptions[key] || descriptions[classid] || { name: "Unknown Item" };
            item.item_display_name = desc.name;

            item_group[key].push(item);
        });

        let total_req = 0;
        const todo_list = [];

        // Logic to determine which items need to be merged
        for (let key in item_group) {
            const items = item_group[key];
            // Case A: No limit - merge all identical items into the first one
            if (stack_max === 0) {
                if (items.length > 1) {
                    todo_list.push(items);
                    total_req += items.length - 1;
                }
            }
            // Case B: Max stack size limit active - requires bin-packing logic
            else {
                const stacks = [];
                const temp_items = [...items];
                while (temp_items.length > 0) {
                    const item = temp_items.pop();
                    if (item.amount > stack_max) continue; // Skip if item is already larger than limit

                    let added = false;
                    // Try to fit the item into an existing created stack
                    for (let stack of stacks) {
                        if (stack.amount + item.amount <= stack_max) {
                            stack.list.push(item);
                            stack.amount += item.amount;
                            added = true;
                            break;
                        }
                    }
                    // If it doesn't fit, start a new stack
                    if (!added)
                        stacks.push({ list: [item], amount: item.amount });
                }
                // Filter groups that actually need merging (more than 1 item)
                for (let stack of stacks) {
                    if (stack.list.length > 1) {
                        todo_list.push(stack.list);
                        total_req += stack.list.length - 1;
                    }
                }
            }
        }

        if (total_req === 0) return false;

        this.show_dual_progress_swal(`Stacking: ${game_name}`);

        let actions_done = 0;
        const total_types = todo_list.length;

        // Execute the CombineItemStacks API calls sequentially
        for (let j = 0; j < todo_list.length; j++) {
            if (this.is_cancelled) break;
            const items = todo_list[j];
            const current_item_name = items[0].item_display_name;

            for (let i = 1; i < items.length; i++) {
                if (this.is_cancelled) break;
                actions_done++;

                const overall_percent = Math.round((actions_done / total_req) * 100);

                this.update_dual_progress_swal(
                    current_item_name,
                    (j + 1),
                    total_types,
                    overall_percent,
                    actions_done,
                    total_req
                );

                // Merges fromitemid into destitemid
                await this.run_steam_api("CombineItemStacks", `fromitemid=${items[i].assetid}&destitemid=${items[0].assetid}&quantity=${items[i].amount}`);
                await new Promise(r => setTimeout(r, this.DELAY_MS));
            }
        }
        return true;
    }

    static async handle_unstacking(assets, game_name) {
        const descriptions = g_ActiveInventory.m_rgDescriptions || {};
        // Identify all items with an amount greater than 1
        const unstack_jobs = assets.filter(item => parseInt(item.amount) > 1);

        let total_actions = 0;
        unstack_jobs.forEach(item => {
            const { classid, instanceid } = item;
            const key = `${classid}_${instanceid}`;
            const desc = descriptions[key] || descriptions[classid] || { name: "Unknown Item" };
            item.item_display_name = desc.name;
            // Number of splits needed is amount - 1
            total_actions += (parseInt(item.amount) - 1);
        });

        if (total_actions === 0) return false;

        this.show_dual_progress_swal(`Unstacking: ${game_name}`);

        let actions_done = 0;
        const total_items = unstack_jobs.length;

        // Execute SplitItemStack API calls sequentially
        for (let j = 0; j < unstack_jobs.length; j++) {
            if (this.is_cancelled) break;
            const item = unstack_jobs[j];
            const amt = parseInt(item.amount);

            // Repeatedly split off 1 unit until the stack is empty
            for (let i = 1; i < amt; i++) {
                if (this.is_cancelled) break;
                actions_done++;

                const overall_percent = Math.round((actions_done / total_actions) * 100);

                this.update_dual_progress_swal(
                    item.item_display_name,
                    (j + 1),
                    total_items,
                    overall_percent,
                    actions_done,
                    total_actions
                );

                await this.run_steam_api("SplitItemStack", `itemid=${item.assetid}&quantity=1`);
                await new Promise(r => setTimeout(r, this.DELAY_MS));
            }
        }
        return true;
    }

    static show_dual_progress_swal(title) {
        // UI modal with two progress indicators (current item and overall total)
        Swal.fire({
            title: title,
            html: `
                <div style="text-align: center; margin-top: 10px;">
                    <div id="sie_item_name" style="font-size: 1.1em; font-weight: bold; color: #ececec; margin-bottom: 5px;">Initializing...</div>
                    <div id="sie_item_count" style="font-size: 0.9em; margin-bottom: 15px;">Item 0 / 0</div>

                    <div id="sie_item_stacker_overall_text" style="font-weight: bold; margin-bottom: 5px;">Overall Progress: 0%</div>
                    <progress id="sie_item_stacker_prog" value="0" max="100" style="width: 100%;"></progress><br>
                    <span id="sie_item_stacker_val">0 / 0</span>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: "Cancel",
            allowOutsideClick: false,
            showConfirmButton: false,
            theme: "dark",
            didOpen: () => {
                const btn_cancel = Swal.getCancelButton();
                btn_cancel.onclick = () => {
                    this.is_cancelled = true;
                    Swal.close();
                };
            }
        });
    }

    static update_dual_progress_swal(item_name, item_curr, item_total, overall_percent, total_done, total_all) {
        // Dynamically update the modal text and progress bar values
        if (Swal.isVisible() && !this.is_cancelled) {
            const el_name = document.getElementById('sie_item_name');
            const el_item_count = document.getElementById('sie_item_count');
            const el_overall_text = document.getElementById('sie_item_stacker_overall_text');
            const el_prog = document.getElementById('sie_item_stacker_prog');
            const el_prog_val = document.getElementById('sie_item_stacker_val');

            if (el_name)
                el_name.innerText = item_name;
            if (el_item_count)
                el_item_count.innerText = `Item ${item_curr} / ${item_total}`;
            if (el_overall_text)
                el_overall_text.innerText = `Overall Progress: ${overall_percent}%`;
            if (el_prog) {
                el_prog.max = total_all;
                el_prog.value = total_done;
            }
            if (el_prog_val) el_prog_val.innerText = `${total_done} / ${total_all}`;
        }
    }

    static async run_steam_api(method, params) {
        // General wrapper for IInventoryService POST requests
        const url = `https://api.steampowered.com/IInventoryService/${method}/v1/`;
        const body = `access_token=${this.g_token}&appid=${this.g_app_id}&steamid=${g_steamID}&${params}`;
        const res = await fetch(url, {
            method: "POST",
            body: body,
            headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" }
        });
        return res.json();
    }
}

GM_addStyle(`
    .sie_item_stacker_container {
        gap: 5px;
        display: inline-flex;
    }

    .sie_item_stacker_container.sie_item_stacker_multi_row {
        flex-direction: column;
        align-items: flex-start;
    }

    .sie_item_stacker_container.sie_item_stacker_single_row {
        flex-direction: row;
        align-items: center;
    }

    .sie_item_stacker_row {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .sie_item_stacker_inputbox {
        width: 50px;
        color: #fff;
        padding: 2px 4px;
    }
`);

// ==========================================================
// Favorites
// ==========================================================
class Favorites {
    // Entry point: initializes styles, creates the container, and adds stars to the game list
    static init() {
        this.inject_styles();
        this.add_favorites_container();
        this.add_stars_to_games();
    }

    // Injects custom CSS for the star icon, its animations, and the favorite list layout
    static inject_styles() {
        GM_addStyle(`
            a.games_list_tab {
                position: relative;
            }

            .sie_fav_star {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 14px;
                height: 14px;
                color: #555;
                cursor: pointer;
                transition: color 0.2s, transform 0.1s;
                line-height: 0;
                z-index: 5;
            }

            .sie_fav_star:hover {
                transform: scale(1.3);
            }

            .sie_fav_star.active {
                color: #ffde24;
                filter: drop-shadow(0 0 2px rgba(255, 222, 36, 0.5));
            }

            #sie_favorites_list .games_list_tab.active {
                background: rgba(255, 255, 255, 0.05);
                box-shadow: none;
            }
        `);
    }

    // Waits for the Steam inventory sidebar and injects the "Favorites" section header and list container
    static async add_favorites_container() {
        const tabcontainer = await wait_for_element(".tabitems_ctn");
        const favorites_html = `
            <div id="game_list_favorites" class="games_list_separator responsive_hidden">
                Favorites
            </div>
            <div class="games_list_tabs_ctn">
                <div id="sie_favorites_list" class="games_list_tabs"></div>
            </div>`;
        tabcontainer.insertAdjacentHTML('afterbegin', favorites_html);
    }

    // Scrapes the existing game list to map AppIDs to their names, item counts, and DOM elements
    static build_app_inventory_map() {
        const app_map = new Map();

        document.querySelectorAll("a.games_list_tab").forEach(tab => {
            const href = tab.getAttribute("href");
            if(!href) return;

            // Extract AppID from href (e.g., "#753" -> "753")
            const app_id = href.replace('#', '');
            if(!app_id) return;

            const name_el = tab.querySelector(".games_list_tab_name");
            const app_name = name_el ? name_el.innerText.trim() : "";

            // Parse item count from the tab, removing non-numeric characters (like brackets)
            const count_el = tab.querySelector(".games_list_tab_number");
            const text_amount = count_el ? count_el.innerText : "0";
            const item_count = parseInt(text_amount.replace(/\D/g, '')) || 0;

            app_map.set(app_id, {
                app_name: app_name,
                item_count: item_count,
                tab_element: tab
            });
        });

        return app_map;
    }

    // Injects the SVG star into every game tab in the original list
    static async add_stars_to_games() {
        await wait_for_element("a.games_list_tab");
        const fav_ids = GM_getValue("sie_fav_ids", []);
        const tabs = document.querySelectorAll("a.games_list_tab");

        tabs.forEach(tab => {
            // Prevent duplicate stars if the script runs multiple times
            if(tab.querySelector(".sie_fav_star")) return;

            const app_id = tab.getAttribute("href")?.replace('#', '');
            if(!app_id) return;

            const star = document.createElement("div");
            star.className = `sie_fav_star ${fav_ids.includes(app_id) ? 'active' : ''}`;
            star.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M7 0L4.88269 4.68067L0 5.348L3.5688 8.918L2.67216 14L7 11.536L11.3278 14L10.4268 8.918L14 5.348L9.11731 4.68067L7 0Z"></path>
                </svg>`;

            // Prevent the tab click from triggering when clicking the star itself
            star.onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle_favorite(app_id, star);
            };

            tab.appendChild(star);
        });

        this.update_favorites_list();
    }

    // Handles adding/removing AppIDs from the local storage and updates UI state
    static toggle_favorite(app_id, star_el) {
        let fav_ids = GM_getValue("sie_fav_ids", []);

        if(fav_ids.includes(app_id))
            fav_ids = fav_ids.filter(id => id !== app_id);
        else
            fav_ids.push(app_id);

        if(star_el.classList.contains("active"))
            star_el.classList.remove("active");
        else
            star_el.classList.add("active");

        GM_setValue("sie_fav_ids", fav_ids);
        this.update_favorites_list();
    }

    // Rebuilds the favorites section based on saved IDs and the chosen sorting method
    static update_favorites_list() {
        const fav_ids = GM_getValue("sie_fav_ids", []);
        const order_type = GM_config.get("inv_favorites_order") || 'Amount';
        const list_container = document.querySelector("#sie_favorites_list");
        const header = document.getElementById("game_list_favorites");
        const list_wrapper = list_container?.parentElement;

        if(!list_container || !header || !list_wrapper) return;

        // Clear existing items before rebuilding
        list_container.innerHTML = "";

        // Hide the section entirely if no favorites are selected
        if(!fav_ids || fav_ids.length === 0) {
            header.style.display = "none";
            list_wrapper.style.display = "none";
            return;
        }

        const app_map = this.build_app_inventory_map();
        let sorted_ids = [...fav_ids];

        // Apply sorting based on user configuration
        if(order_type === 'Name')
            sorted_ids.sort((a, b) => `${app_map.get(a)?.app_name || ''}`.toLowerCase().localeCompare(`${app_map.get(b)?.app_name || ''}`.toLowerCase()));
        else if(order_type === 'Amount')
            sorted_ids.sort((a, b) => (app_map.get(b)?.item_count || 0) - (app_map.get(a)?.item_count || 0));
        else if(order_type === 'Added to Favorites')
        {} // Default order is the order in which they were added to the array
        else if(order_type === 'Added to Favorites Reversed')
            sorted_ids.reverse();

        sorted_ids.forEach(id => {
            const original_tab = app_map.get(id)?.tab_element;
            if(!original_tab) return;

            // Deep clone the original tab to maintain Steam's native styling and icons
            const clone = original_tab.cloneNode(true);
            clone.removeAttribute("id");

            const clone_star = clone.querySelector(".sie_fav_star");
            if(clone_star) {
                clone_star.classList.add("active");
                clone_star.onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Clicking clone star affects the original star and re-triggers the logic
                    this.toggle_favorite(id, original_tab.querySelector(".sie_fav_star"));
                };
            }

            // Clicking the favorite clone triggers a click on the original tab to switch inventory view
            clone.onclick = e => {
                e.preventDefault();
                original_tab.click();
                document.querySelectorAll('.games_list_tab').forEach(t => t.classList.remove('active'));
                clone.classList.add('active');
            };

            list_container.appendChild(clone);
        });

        // Ensure proper layout visibility depending on item presence
        if(list_container.children.length === 0) {
            header.style.display = "none";
            list_wrapper.style.display = "none";
        } else {
            header.style.display = "block";
            list_wrapper.style.display = "grid";
        }
    }
}

// ==========================================================
// Filter
// ==========================================================
class Filter {
    static app_data_cache = [];

    static async init() {
        const container = await wait_for_element("#games_list_public");
        this.inject_controls(container);
        this.cache_elements();

        // Load initial sort state or default to amount_desc
        const current_sort = GM_getValue("sie_filter_sort", "amount_desc");
        this.sort_list(current_sort);

        if (GM_config.get("filter_search_ctrl_f_hotkey"))
            this.override_hotkey();
    }

    static inject_controls(container) {
        const active_sort = GM_getValue("sie_filter_sort", "amount_desc");

        const filter_html = `
            <div id="sie_filter_controls">
                <div class="sie_filter_top_row">
                    <div class="sie_filter_buttons">
                        <button id="sie_sort_amount_desc" class="btn_grey_black btn_small ${active_sort === 'amount_desc' ? 'active' : ''}" title="Amount: High to Low"><span>Amount ▾</span></button>
                        <button id="sie_sort_amount_asc" class="btn_grey_black btn_small ${active_sort === 'amount_asc' ? 'active' : ''}" title="Amount: Low to High"><span>Amount ▴</span></button>
                        <button id="sie_sort_name_asc" class="btn_grey_black btn_small ${active_sort === 'name_asc' ? 'active' : ''}" title="Name: A to Z"><span>Name ▴</span></button>
                        <button id="sie_sort_name_desc" class="btn_grey_black btn_small ${active_sort === 'name_desc' ? 'active' : ''}" title="Name: Z to A"><span>Name ▾</span></button>
                    </div>
                    <button id="sie_filter_reset_all" class="btn_grey_black" title="Reset all filters"><span>✕</span></button>
                </div>

                <div class="sie_input_wrapper">
                    <input type="text" id="sie_filter_search" placeholder="Search inventories..." autocomplete="off">
                    <span class="sie_clear_input" data-target="sie_filter_search">✕</span>
                </div>

                <div class="sie_filter_range">
                    <div class="sie_input_wrapper">
                        <input type="text" id="sie_filter_min" placeholder="Min" autocomplete="off">
                        <span class="sie_clear_input" data-target="sie_filter_min">✕</span>
                    </div>
                    <div class="sie_input_wrapper">
                        <input type="text" id="sie_filter_max" placeholder="Max" autocomplete="off">
                        <span class="sie_clear_input" data-target="sie_filter_max">✕</span>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('afterbegin', filter_html);

        // Sorting Event Listeners
        document.getElementById("sie_sort_amount_desc").onclick = () => this.sort_list("amount_desc");
        document.getElementById("sie_sort_amount_asc").onclick = () => this.sort_list("amount_asc");
        document.getElementById("sie_sort_name_asc").onclick = () => this.sort_list("name_asc");
        document.getElementById("sie_sort_name_desc").onclick = () => this.sort_list("name_desc");

        // Combined Input Event Listeners
        const inputs = ["sie_filter_search", "sie_filter_min", "sie_filter_max"];
        inputs.forEach(id => document.getElementById(id).oninput = () => this.apply_filters());

        // Apply number restriction helper
        this.restrict_to_numbers(document.getElementById("sie_filter_min"));
        this.restrict_to_numbers(document.getElementById("sie_filter_max"));

        // Individual Clear Buttons (X)
        document.querySelectorAll(".sie_clear_input").forEach(btn => {
            btn.onclick = () => {
                const target = document.getElementById(btn.dataset.target);
                target.value = "";
                this.apply_filters();
            };
        });

        // Global Reset Button
        document.getElementById("sie_filter_reset_all").onclick = () => {
            inputs.forEach(id => document.getElementById(id).value = "");
            this.apply_filters();
        };
    }

    static cache_elements() {
        this.app_data_cache = [];
        const tabs = document.querySelectorAll("#games_list_public a.games_list_tab");

        tabs.forEach(tab => {
            const name_el = tab.querySelector(".games_list_tab_name");
            const count_el = tab.querySelector(".games_list_tab_number");

            const name = name_el ? name_el.innerText.trim() : "";
            const text_amount = count_el ? count_el.innerText : "0";
            // Extract numbers only for accurate integer sorting
            const amount = parseInt(text_amount.replace(/\D/g, '')) || 0;

            this.app_data_cache.push({
                node: tab,
                name: name,
                amount: amount
            });
        });
    }

    static sort_list(type) {
        GM_setValue("sie_filter_sort", type);

        // Update active UI states
        document.querySelectorAll(".sie_filter_buttons button").forEach(btn => btn.classList.remove("active"));
        if (type === "amount_desc") document.getElementById("sie_sort_amount_desc").classList.add("active");
        if (type === "amount_asc") document.getElementById("sie_sort_amount_asc").classList.add("active");
        if (type === "name_asc") document.getElementById("sie_sort_name_asc").classList.add("active");
        if (type === "name_desc") document.getElementById("sie_sort_name_desc").classList.add("active");

        const container = document.querySelector("#games_list_public .games_list_tabs");
        if (!container) return;

        const sorted = [...this.app_data_cache].sort((a, b) => {
            if (type === "name_asc") return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            if (type === "name_desc") return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
            if (type === "amount_asc") return a.amount - b.amount;
            return b.amount - a.amount; // default: amount_desc
        });

        // Append nodes in new order (DOM automatically moves existing elements)
        sorted.forEach(item => container.appendChild(item.node));
    }

    static apply_filters() {
        const query = document.getElementById("sie_filter_search").value.toLowerCase();
        const min = parseInt(document.getElementById("sie_filter_min").value) || 0;
        const max = parseInt(document.getElementById("sie_filter_max").value) || Infinity;

        this.app_data_cache.forEach(item => {
            const matches_text = item.name.toLowerCase().includes(query);
            const matches_range = item.amount >= min && item.amount <= max;

            // Hide element if it doesn't match both text and amount criteria
            if (matches_text && matches_range) return item.node.classList.remove("sie_hidden_by_search");
            item.node.classList.add("sie_hidden_by_search");
        });
    }

    static restrict_to_numbers(element) {
        element.onkeydown = (e) => {
            // Allow control keys: backspace, delete, tab, escape, enter, ctrl, navigation
            if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
                (e.ctrlKey === true || e.metaKey === true) ||
                (e.keyCode >= 35 && e.keyCode <= 40)) return;

            // Block non-number keys (top row and numpad)
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105))
                e.preventDefault();
        };
    }

    static override_hotkey() {
        window.addEventListener('keydown', (e) => {
            // Check for CTRL+F (Windows/Linux) or CMD+F (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                const searchInput = document.getElementById("sie_filter_search");

                if (searchInput) {
                    e.preventDefault(); // Prevent Browser Search
                    searchInput.focus();

                    // Select Text
                    searchInput.select();
                }
            }
        });
    }
}

GM_addStyle(`
    #sie_filter_controls {
        padding: 10px;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        gap: 5px;
        border-bottom: 1px solid #2c3235;
        margin-bottom: 5px;
    }

    .sie_filter_top_row {
        display: flex;
        gap: 5px;
    }

    .sie_filter_buttons {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        flex: 1;
    }

    .sie_filter_buttons .btn_small {
        justify-content: center;
        padding: 4px 0;
    }

    .sie_filter_buttons .btn_small.active {
        background: #4e7297 !important;
        color: white !important;
    }

    #sie_filter_reset_all {
        width: 30px;
        justify-content: center;
        color: #ff5c5c;
    }

    .sie_filter_range {
        display: flex;
        gap: 5px;
    }

    .sie_input_wrapper {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
    }

    #sie_filter_search,
    #sie_filter_min,
    #sie_filter_max {
        width: 100%;
        background: #101214;
        border: 1px solid #2c3235;
        color: #fff;
        padding: 4px 22px 4px 8px;
        border-radius: 2px;
        font-size: 12px;
    }

    /* Remove arrows from number inputs */
    #sie_filter_min::-webkit-inner-spin-button,
    #sie_filter_max::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

    .sie_clear_input {
        position: absolute;
        right: 6px;
        cursor: pointer;
        color: #555;
        font-size: 10px;
        user-select: none;
    }

    .sie_clear_input:hover { color: #fff; }

    .sie_hidden_by_search {
        display: none !important;
    }
`);

// ==========================================================
// ASF Integration
// ==========================================================
class ASF {
    // Initializes the ASF integration by injecting menu items into the Steam inventory "More" dropdown
    static async init() {
        // Wait for the Steam inventory's popup menu to exist in the DOM before modification
        const dropdown_menu = await wait_for_element("#inventory_more_dropdown .popup_body.popup_menu");

        // Retrieve the configured bot name from script settings (defaults to 'ASF')
        const bot = GM_config.get("asf_botname") || 'ASF';

        // HTML template for the 2FA confirmation controls
        const asf_html = `
            <div class="popup_menu_separator"></div>
            <a class="popup_menu_item" id="sie_asf_2faok" href="javascript:void(0);">
                <span style="color: #67c1f5;">ASF:</span> Accepts all 2FA confirmations (2faok)
            </a>
            <a class="popup_menu_item" id="sie_asf_2fano" href="javascript:void(0);">
                <span style="color: #67c1f5;">ASF:</span> Denies all 2FA confirmations (2fano)
            </a>
        `;

        // Insert the new menu items at the end of the existing dropdown list
        dropdown_menu.insertAdjacentHTML('beforeend', asf_html);

        // Click handler for accepting all pending 2FA mobile confirmations
        document.getElementById("sie_asf_2faok").onclick = (e) => {
            e.preventDefault();
            this.send_command(`2faok ${bot}`, "Confirmations accepted!");
        };

        // Click handler for denying/cancelling all pending 2FA mobile confirmations
        document.getElementById("sie_asf_2fano").onclick = (e) => {
            e.preventDefault();
            this.send_command(`2fano ${bot}`, "Confirmations denied.", "warning");
        };
    }

    // Communicates with the ASF IPC (Inter-Process Communication) interface via HTTP POST
    static async send_command(cmd, success_msg = "Command send", icon = "success") {
        // Retrieve connection details from the script configuration
        const ip = GM_config.get("asf_ip");
        const port = GM_config.get("asf_port");
        const password = GM_config.get("asf_password");
        const url = `http://${ip}:${port}/Api/Command`;

        // Show a loading overlay while waiting for the network request
        Swal.fire({
            title: "ASF sending command...",
            theme: "dark",
            didOpen: () => Swal.showLoading()
        });

        // Use GM_xmlhttpRequest to bypass Cross-Origin (CORS) restrictions when talking to local/remote IPC
        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: {
                "Content-Type": "application/json",
                // ASF IPC requires the password in the Authentication header
                "Authentication": password
            },
            data: JSON.stringify({ Command: cmd }),
            onload: (res) => {
                // Success: ASF received and processed the command
                if (res.status === 200) {
                    const data = JSON.parse(res.responseText);
                    Swal.fire({
                        title: "ASF Result",
                        text: data.Result || success_msg, // Display the actual response text from ASF
                        icon: icon,
                        toast: true,
                        position: 'top-end',
                        timer: 5000,
                        showConfirmButton: false,
                        theme: "dark"
                    });
                }
                // Error 401: IPC password in settings does not match the ASF configuration
                else if (res.status === 401) {
                    Swal.fire({
                        title: "Error: Invalid IPC Password",
                        icon: "error",
                        theme: "dark"
                    });
                }
                // Generic error handler for other HTTP status codes
                else {
                    Swal.fire({
                        title: `Error: ${res.status}`,
                        icon: "error",
                        theme: "dark"
                    });
                }
            },
            // Triggered if the request fails completely (e.g. ASF not running or wrong IP/Port)
            onerror: () => {
                Swal.fire({
                    title: "Error: ASF is not reachable",
                    html: `Make sure:<br>
                    - IPC is enabled<br>
                    - Check if IP/Hostname and port are correct<br>
                    - ASF is accessible from this machine`,
                    icon: "error",
                    theme: "dark"
                });
            }
        });
    }
}

// ==========================================================
// General Styling
// ==========================================================
GM_addStyle(`
    .games_list_tabs {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr);
    }

    .games_list_tab_separator,
    .games_list_tab_row_separator {
        display: none;
    }

    .games_list_tabs_ctn {
        border: 1px solid #2c3235;
        padding: 0;
    }

    .games_list_tabs > div {
        display: none;
    }

    a.games_list_tab {
        width: 100%;
        display: flex;
        gap: 10px;
        align-items: center;
        background: unset;
        border: unset !important;
    }

    .games_list_tab > span {
        padding: 0;
        line-height: 1;
    }

    .games_list_tab_icon {
        margin: 8px 0;
    }

    .games_list_tab_number {
        margin-left: auto;
    }

    .games_list_tab.active {
        box-shadow: unset;
        border-radius: 10px;
        background: #2c4056 !important;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .games_list_tab:hover,
    a.games_list_tab:hover {
        background: #4e7297;
        border-radius: 10px;
    }

    .games_list_tab:hover .games_list_tab_name {
        text-decoration: none;
    }
`);