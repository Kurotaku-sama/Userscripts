// ==UserScript==
// @name            Steam Inventory Enhancer
// @namespace       https://kurotaku.de
// @version         1.2.2
// @description     Adds mass stacking/unstacking tools, a customizable sidebar with favorites, advanced inventory filtering/sorting, and ASF IPC integration for seamless 2FA confirmations.
// @description:de  Fügt Tools zum Massen-Stapeln/Entstapeln, eine anpassbare Seitenleiste mit Favoriten, erweiterte Filter- und Sortierfunktionen für Inventare sowie eine ASF-IPC-Integration für 2FA-Bestätigungen hinzu.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://steamcommunity.com/profiles/*/inventory*
// @match           https://steamcommunity.com/id/*/inventory*
// @match           https://steamcommunity.com/market
// @match           https://steamcommunity.com/market/*
// @icon            https://steamcommunity.com/favicon.ico
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_Inventory_Enhancer/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_Inventory_Enhancer/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
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

    const current_url = window.location.href;
    const is_inventory = /steamcommunity\.com\/(id|profiles)\/.*\/inventory/.test(current_url);
    const is_market = /steamcommunity\.com\/market(\/|\?|$)/.test(current_url);
    if (!is_inventory && !is_market) return;

    if (is_inventory) {
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
    }
    if (GM_config.get("owned_count_enabled"))
        Itemcounter.init();
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
            filter_search_by_appid: {
                type: 'checkbox',
                default: false,
                label: 'Search by AppID'
            },
            filter_show_only_missing: {
                type: 'checkbox',
                default: true,
                label: 'Enable "Hide Owned" Filter Button'
            },
            filter_search_ctrl_f_hotkey: {
                type: 'checkbox',
                default: true,
                label: 'Override CTRL + F to focus searchbox'
            },
            owned_count_enabled: {
                section: ['Item amount owned Display'],
                type: 'checkbox',
                default: true,
                label: 'Enable Amount Counter',
            },
            owned_count_show_market_listing: {
                type: 'checkbox',
                default: true,
                label: 'Show on Market Listings',
            },
            owned_count_show_market_search: {
                type: 'checkbox',
                default: true,
                label: 'Show in Market Search Results',
            },
            owned_count_show_inventory: {
                type: 'checkbox',
                default: true,
                label: 'Show on Inventory Pages',
            },
            owned_count_cache: {
                label: 'Inventory Cache Duration (Minutes):<br><small>Set how long inventory data is stored locally for each inventory before a fresh update from Steam is required. High values improve performance and prevent rate-limiting.</small>',
                type: 'int',
                default: 30,
            },
            owned_count_contexts: {
                label: 'Scanable Context-IDs <small>(Default: 1, 2, 6)<br>(Modification not recommended)</small>',
                type: 'input',
                default: '1, 2, 6',
            },
            owned_count_blacklist: {
                label: 'Blacklisted AppIDs <small>(Comma separated)</small>',
                type: 'input',
                default: '',
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
                type: 'int',
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
            save: () => { location.reload(); },
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
                    width: max-content !important;
                    max-width: unset !important;
                }

                #mainContents {
                    display: grid !important;
                    grid-template-columns: auto 1fr;
                }

                #mainContents > * {
                    grid-column: 1 / span 2;
                }

                #mainContents > .tabitems_ctn {
                    grid-column: 1;
                }

                #mainContents > #tabcontent_inventory {
                    grid-column: 2;
                    margin-top: unset;
                }

                #tabcontent_inventory {
                    margin-top: unset;
                }

                .games_list_tabs {
                    display: grid !important;
                    grid-template-columns: repeat(${rows}, 1fr);
                    overflow-y: scroll;
                    overflow-x: hidden;
                    max-height: min(100vh, 600px);
                }

                #game_list_favorites {
                    margin-top: unset;
                }

                .app_tags_container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
    // 440 TF2 | 570 Dota 2 | 730 Steam | 753 CS2 | 238460 BattleBlock Theater | 252490 Rust | 304930 Unturned | 1269260 Artifact Foundry
    static ITEM_STACKER_IGNORED_INVENTORIES = [440, 570, 730, 753, 238460, 252490, 304930, 1269260];

    static init() {
        // Attempt to retrieve the required WebAPI token from the page source
        this.inject_styles();

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

    static inject_styles() {
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

            #sie_favorites_list .sie_hidden_by_search {
                display: flex !important;
            }
        `);
    }

    // Waits for the Steam inventory sidebar and injects the "Favorites" section header and list container
    static async add_favorites_container() {
        const tab_container = await wait_for_element(".tabitems_ctn");
        const favorites_html = `
            <div id="game_list_favorites" class="games_list_separator responsive_hidden">
                Favorites
            </div>
            <div class="games_list_tabs_ctn">
                <div id="sie_favorites_list" class="games_list_tabs"></div>
            </div>`;
        tab_container.insertAdjacentHTML('afterbegin', favorites_html);
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
    static owned_app_ids = null; // Stores the user's owned app ids after fetch
    static hide_owned_active = false; // Toggle state for the "Hide Owned" filter

    static async init() {
        const container = await wait_for_element("#games_list_public");

        // initial cache before UI injection to get the total count for the placeholder
        this.cache_elements();

        this.inject_controls(container);

        // Load initial sort state or default to amount_desc
        const current_sort = GM_getValue("sie_filter_sort", "amount_desc");
        this.sort_list(current_sort);

        if (GM_config.get("filter_search_ctrl_f_hotkey"))
            this.override_hotkey();
    }

    static inject_controls(container) {
        const active_sort = GM_getValue("sie_filter_sort", "amount_desc");
        const total_count = this.app_data_cache.length;

        // Define placeholder text based on config setting
        const search_by_appid = GM_config.get("filter_search_by_appid");
        const placeholder_text = search_by_appid
        ? `Search ${total_count} inventories (Name or ID)...`
        : `Search ${total_count} inventories...`;

        // Check if the "Hide Owned" feature is enabled in config
        const show_missing_enabled = GM_config.get("filter_show_only_missing");

        // Check if the viewed inventory belongs to the logged-in user
        // Using UserYou.strSteamId to compare the owner of the page with the own g_steamID
        const is_own_profile = (typeof UserYou !== 'undefined' && UserYou.strSteamId === g_steamID);

        const filter_html = `
            <div id="sie_filter_controls">
                <div class="sie_filter_top_row">
                    <div class="sie_filter_buttons">
                        <button id="sie_sort_amount_desc" class="btn_grey_black btn_small ${active_sort === 'amount_desc' ? 'active' : ''}" title="Amount: High to Low"><span>Amount ▾</span></button>
                        <button id="sie_sort_amount_asc" class="btn_grey_black btn_small ${active_sort === 'amount_asc' ? 'active' : ''}" title="Amount: Low to High"><span>Amount ▴</span></button>
                        <button id="sie_sort_name_asc" class="btn_grey_black btn_small ${active_sort === 'name_asc' ? 'active' : ''}" title="Name: A to Z"><span>Name ▴</span></button>
                        <button id="sie_sort_name_desc" class="btn_grey_black btn_small ${active_sort === 'name_desc' ? 'active' : ''}" title="Name: Z to A"><span>Name ▾</span></button>
                    </div>
                    ${(show_missing_enabled && !is_own_profile) ? `<button id="sie_filter_hide_owned" class="btn_grey_black btn_small" title="Hide inventories you already own"><span>Hide Owned</span></button>` : ''}
                    <button id="sie_filter_reset_all" class="btn_grey_black" title="Reset all filters"><span>✕</span></button>
                </div>

                <div class="sie_input_wrapper">
                    <input type="text" id="sie_filter_search" placeholder="${placeholder_text}" autocomplete="off">
                    <span class="sie_clear_input" data-target="sie_filter_search">✕</span>
                </div>

                <div class="sie_filter_range">
                    <div class="sie_input_wrapper">
                        <input type="text" id="sie_filter_min" placeholder="Min Items" autocomplete="off">
                        <span class="sie_clear_input" data-target="sie_filter_min">✕</span>
                    </div>
                    <div class="sie_input_wrapper">
                        <input type="text" id="sie_filter_max" placeholder="Max Items" autocomplete="off">
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

        // Toggle Owned Filter Event Listener
        const btn_owned = document.getElementById("sie_filter_hide_owned");
        if (btn_owned) {
            btn_owned.onclick = () => this.toggle_hide_owned();
        }

        // Combined Input Event Listeners
        const inputs = ["sie_filter_search", "sie_filter_min", "sie_filter_max"];
        inputs.forEach(id => document.getElementById(id).oninput = () => this.apply_filters());

        // Apply number restriction helper
        restrict_input_to_numbers(document.getElementById("sie_filter_min"));
        restrict_input_to_numbers(document.getElementById("sie_filter_max"));

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
            this.hide_owned_active = false;
            if (btn_owned) {
                btn_owned.classList.remove("active");
                btn_owned.querySelector("span").innerText = "Hide Owned";
            }
            this.apply_filters();
        };
    }

    static cache_elements() {
        this.app_data_cache = [];
        // Selector expanded to include public, private and failed inventory sections
        const selectors = [
            "#games_list_public a.games_list_tab",
            "#games_list_private a.games_list_tab",
            "#games_list_failed a.games_list_tab"
        ];

        const tabs = document.querySelectorAll(selectors.join(", "));

        tabs.forEach(tab => {
            const name_el = tab.querySelector(".games_list_tab_name");
            const count_el = tab.querySelector(".games_list_tab_number");

            // Extract AppID from the href attribute
            const href_attr = tab.getAttribute("href") || "";
            const app_id = href_attr.replace('#', '');

            const name = name_el ? name_el.innerText.trim() : "";
            const text_amount = count_el ? count_el.innerText : "0";
            // Extract numbers only for accurate integer sorting
            const amount = parseInt(text_amount.replace(/\D/g, '')) || 0;

            this.app_data_cache.push({
                node: tab,
                name: name,
                app_id: app_id,
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
        // Note: sorting remains primarily visual for the public container as per legacy logic
        sorted.forEach(item => {
            if (item.node.parentElement) {
                item.node.parentElement.appendChild(item.node);
            }
        });
    }

    static async toggle_hide_owned() {
        // Fetch user's own inventory app ids if not already cached
        if (this.owned_app_ids === null) {
            Swal.fire({
                title: "Detecting owned inventories...",
                allowOutsideClick: false,
                showConfirmButton: false,
                theme: "dark",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                // Fetch the current user's own profile inventory using the own g_steamID
                const response = await fetch(`https://steamcommunity.com/profiles/${g_steamID}/inventory/`);
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');

                // Extract all appids from the sidebar tabs of the user's own inventory
                const own_tabs = doc.querySelectorAll(".games_list_tab");
                this.owned_app_ids = Array.from(own_tabs).map(tab => {
                    const href = tab.getAttribute("href") || "";
                    return href.replace('#', '');
                }).filter(id => id !== "");

                Swal.close();
            } catch (err) {
                Swal.fire({
                    title: "Error",
                    text: "Failed to load your owned inventory list.",
                    icon: "error",
                    theme: "dark"
                });
                return;
            }
        }

        // Toggle state and update UI
        this.hide_owned_active = !this.hide_owned_active;
        const btn = document.getElementById("sie_filter_hide_owned");

        if (this.hide_owned_active) {
            btn.classList.add("active");
            btn.querySelector("span").innerText = "Show Owned";
        } else {
            btn.classList.remove("active");
            btn.querySelector("span").innerText = "Hide Owned";
        }

        this.apply_filters();
    }

    static apply_filters() {
        const query = document.getElementById("sie_filter_search").value.toLowerCase();
        const min = parseInt(document.getElementById("sie_filter_min").value) || 0;
        const max = parseInt(document.getElementById("sie_filter_max").value) || Infinity;

        // Retrieve config setting for appid search
        const search_by_appid = GM_config.get("filter_search_by_appid");

        this.app_data_cache.forEach(item => {
            // Check if search matches name
            const matches_name = item.name.toLowerCase().includes(query);

            // Check if search matches app_id only if enabled in config
            const matches_id = search_by_appid ? item.app_id.includes(query) : false;

            const matches_text = matches_name || matches_id;
            const matches_range = item.amount >= min && item.amount <= max;

            // Check if the item should be hidden based on "Hide Owned" toggle
            let matches_owned = true;
            if (this.hide_owned_active && this.owned_app_ids) {
                // Hide if the app_id is in our owned list
                matches_owned = !this.owned_app_ids.includes(item.app_id);
            }

            // Hide element if it doesn't match all criteria
            if (matches_text && matches_range && matches_owned) return item.node.classList.remove("sie_hidden_by_search");
            item.node.classList.add("sie_hidden_by_search");
        });
    }

    static override_hotkey() {
        window.addEventListener('keydown', (e) => {
            // Check for CTRL+F (Windows/Linux) or CMD+F (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                const search_input = document.getElementById("sie_filter_search");

                if (search_input) {
                    e.preventDefault(); // Prevent Browser Search
                    search_input.focus();

                    // Select Text
                    search_input.select();
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
// Itemcounter Module
// ==========================================================
class Itemcounter {
    static cache_key = 'sie_inventory_cache_storage';
    static app_itemcache = new Map();
    static last_app_id = null;

    // Owned amounts keyed by market hash name (language independent), which is what the old layout and the inventory pages use
    // The additional map holds the same amounts keyed by the localized item name, which is what the new market layout displays
    static OwnedInventory = class extends Map {
        local_counts = new Map();
    };

    // Matches a trailing parenthesis group such as the wear of a skin, e.g. " (Field-Tested)"
    static group_suffix_regex = /\s\([^()]+\)$/;

    // Memoized grouped amounts per counts map (base name without suffix mapped to the summed amount)
    static group_cache = new WeakMap();

    // Version of the persistent cache layout, entries of other versions are discarded
    static cache_version = 2;

    // Parsed server rendered state of the new market layout and the data derived from it
    static ssr_data = null;
    static bucket_names = null;
    static listing_data = null;

    // Path the embedded page data belongs to, because it is not refreshed when the route changes without a reload
    static ssr_path = null;

    // Profile path of the logged in user (e.g. "profiles/7656..." or "id/name"), resolved once
    static profile_path = null;

    // 64 bit id of the logged in user, which the inventory endpoint of the Steam web client needs
    static steam_id64 = null;

    // Time an expired cache entry is still shown while a fresh copy is loaded in the background
    static stale_ms = 24 * 60 * 60 * 1000;

    // AppIDs whose cache entry is currently being refreshed in the background
    static refreshing = new Set();

    // Maps the language code of the page to the language names that Steam uses in its URLs
    static language_names = {
        'ar': 'arabic', 'bg': 'bulgarian', 'cs': 'czech', 'da': 'danish', 'de': 'german', 'el': 'greek', 'en': 'english',
        'es': 'spanish', 'es-419': 'latam', 'fi': 'finnish', 'fr': 'french', 'hu': 'hungarian', 'id': 'indonesian',
        'it': 'italian', 'ja': 'japanese', 'ko': 'koreana', 'nb': 'norwegian', 'no': 'norwegian', 'nl': 'dutch',
        'pl': 'polish', 'pt': 'portuguese', 'pt-br': 'brazilian', 'ro': 'romanian', 'ru': 'russian', 'sv': 'swedish',
        'th': 'thai', 'tr': 'turkish', 'uk': 'ukrainian', 'vi': 'vietnamese', 'zh': 'schinese', 'zh-cn': 'schinese', 'zh-tw': 'tchinese'
    };

    // Chain that loads the inventories of a search one after the other
    static inventory_queue = Promise.resolve();

    static async init() {
        // Apply the visual styles and perform an initial cleanup of the persistent storage
        this.inject_styles();
        this.clean_expired_cache();

        const url = window.location.href;

        // Route the logic based on the current Steam URL to initialize page-specific observers
        if (url.includes('/inventory')) {
            this.insert_cache_delete_button();
            if (GM_config.get('owned_count_show_inventory'))
                this.init_inventory_page();
        }
        else if (window.location.pathname.startsWith('/market'))
            this.init_market();
    }

    static inject_styles() {
        // Register custom CSS rules for the ownership badges using Greasemonkey's style injection
        GM_addStyle(`
            .sie-owned-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: #2e4e37;
                color: #a4d007;
                border: 1px solid #4c7c43;
                padding: 2px 5px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                z-index: 100;
                user-select: none;
                -ms-user-select: none;
                -webkit-user-select: none;
            }

            .market_listing_row .sie-owned-badge {
                position: absolute;
                top: unset;
                bottom: 5px;
                right: 5px;
            }

            /* Positioning context for badges inside the market layout that uses generated class names */
            .sie_owned_anchor {
                position: relative;
            }
        `);
    }

    static async insert_cache_delete_button() {
        // Locate the 'More' dropdown list in the inventory and append a custom clear-cache option
        const dropdown_menu = await wait_for_element("#inventory_more_droplist");
        const sie_cache_html = `
            <li>
                <a role="option" class="inactive_selection" tabindex="99999" id="sie_clear_cache_btn" href="javascript:void(0);" style="white-space: normal;"
                    onmouseover="this.className = 'highlighted_selection';" onmouseout="this.className = 'inactive_selection';" onclick="DSelectHide('inventory_more');">
                    <span style="color: #a4d007;">SIE:</span> Delete inventory cache
                </a>
            </li>
        `;

        // Inject the HTML string and attach an event listener to trigger the clearing process
        // The inline handlers of the entry only highlight it and close the dropdown like the native entries do
        dropdown_menu.insertAdjacentHTML('beforeend', sie_cache_html);

        document.getElementById('sie_clear_cache_btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.clear_cache();
        });
    }

    static clear_cache() {
        // Reset the Greasemonkey storage and clear the local runtime cache map
        GM_setValue(this.cache_key, {});
        this.app_itemcache = new Map();
        this.last_app_id = null;

        // Clean up the UI by removing all currently visible badges from the DOM
        document.querySelectorAll('.sie-owned-badge').forEach(b => b.remove());

        // Notify the user of the successful operation via a toast notification
        Swal.fire({
            title: 'Item cache deleted',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            theme: 'dark'
        });
    }

    static get_cache_ms() {
        // A missing or invalid setting falls back to the default, while 0 explicitly disables the cache
        const minutes = Number(GM_config.get('owned_count_cache'));
        return (Number.isNaN(minutes) ? 30 : minutes) * 60 * 1000;
    }

    static clean_expired_cache() {
        try {
            // Entries are kept for a while after they expire, because they are still shown while a fresh copy loads
            const storage = GM_getValue(this.cache_key, {});
            const max_age_ms = this.get_cache_ms() + this.stale_ms;
            const now = Date.now();
            let changed = false;

            // Iterate through all AppIDs in the cache and delete those that are too old or have an outdated layout
            for (const id in storage) {
                if (storage[id].version !== this.cache_version || now - storage[id].cache_creation >= max_age_ms) {
                    delete storage[id];
                    changed = true;
                }
            }

            // Synchronize the modified object back to Greasemonkey storage if entries were removed
            if (changed)
                GM_setValue(this.cache_key, storage);
        } catch (e) {
            console.error("[SIE] Cache clearing error:", e);
        }
    }

    static read_ssr_data() {
        // The new market layout embeds its server rendered state as JSON, which is parsed once it is complete
        if (this.ssr_data) return this.ssr_data;

        const ssr_el = document.querySelector('#valve-ssr-data');
        if (!ssr_el) return null;

        try {
            this.ssr_data = JSON.parse(ssr_el.textContent);
            this.ssr_path = window.location.pathname;
        } catch (e) {
            // The element can still be streaming in, the next call tries again
            return null;
        }
        return this.ssr_data;
    }

    static async get_profile_path() {
        if (this.profile_path) return this.profile_path;

        // Inventory pages and the old market layout expose the id as a page global
        if (typeof g_steamID !== 'undefined' && g_steamID)
            return this.profile_path = `profiles/${g_steamID}`;

        // The new market layout provides the id in its embedded user config, the value is "0" while logged out
        // The embedded data is part of the document head, so it is either already available or missing
        const ssr_id = this.read_ssr_data()?.UserConfig?.steamid;
        if (ssr_id && ssr_id !== '0')
            return this.profile_path = `profiles/${ssr_id}`;

        // Without embedded data the redirect of /my reveals the profile of the logged in user (id or custom name)
        try {
            const controller = new AbortController();
            const response = await fetch('https://steamcommunity.com/my/?xml=1', { credentials: 'include', signal: controller.signal });
            const match = new URL(response.url).pathname.match(/^\/(profiles\/\d+|id\/[^/]+)/);

            // The XML variant of a profile contains the 64 bit id, which is needed for custom profile names
            // Any other response is aborted so the profile page itself is not downloaded
            if (/xml/.test(response.headers.get('content-type') || ''))
                this.steam_id64 = (await response.text()).match(/<steamID64>(\d+)<\/steamID64>/)?.[1] || null;
            else
                controller.abort();

            if (match)
                return this.profile_path = match[1];
        } catch (e) {
            console.error("[SIE] Profile lookup failed:", e);
        }

        return null;
    }

    static get_steam_id64() {
        // The id is part of the profile path unless the profile uses a custom name
        return this.profile_path?.match(/^profiles\/(\d+)$/)?.[1] || this.steam_id64;
    }

    static async get_language() {
        // Inventory pages and the old market layout expose the language name as a page global
        if (typeof g_strLanguage !== 'undefined' && g_strLanguage)
            return g_strLanguage;

        // The embedded config of the new market layout is the most reliable source, followed by the language cookie
        // The language code of the page is the last resort
        const html_language = document.documentElement.lang.toLowerCase();

        return this.read_ssr_data()?.Config?.LANGUAGE
            || document.cookie.match(/(?:^|;\s*)Steam_Language=([^;]+)/)?.[1]
            || this.language_names[html_language] || this.language_names[html_language.split('-')[0]]
            || 'english';
    }

    static inventory_from_cache(entry) {
        // Rebuilds the amounts from a persistent cache entry
        const inventory = new this.OwnedInventory(Object.entries(entry.items));
        Object.entries(entry.local_items || {}).forEach(([local_name, amount]) => inventory.local_counts.set(local_name, amount));
        return inventory;
    }

    static store_inventory(app_id, counts) {
        const cache_ms = this.get_cache_ms();
        if (cache_ms <= 0) return;

        // The storage is read again right before writing, so entries that other tabs stored in the meantime are kept
        const storage = GM_getValue(this.cache_key, {});
        storage[app_id] = { version: this.cache_version, cache_creation: Date.now(), items: Object.fromEntries(counts), local_items: Object.fromEntries(counts.local_counts) };
        GM_setValue(this.cache_key, storage);
    }

    static async get_inventory(app_id, on_refresh = null) {
        // Validate the AppID and check if it is part of the user's defined blacklist
        if (!app_id) return new this.OwnedInventory();

        const blacklist = (GM_config.get('owned_count_blacklist') || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '' && !isNaN(s));

        if (blacklist.includes(app_id.toString()))
            return new this.OwnedInventory();

        const cache_ms = this.get_cache_ms();
        const entry = GM_getValue(this.cache_key, {})[app_id];
        const age = Date.now() - (entry?.cache_creation ?? 0);
        const is_usable = cache_ms > 0 && entry?.version === this.cache_version;

        // Perform a cache-first lookup to minimize API requests to Steam's servers
        if (is_usable && age < cache_ms)
            return this.inventory_from_cache(entry);

        // An expired entry is shown right away while a fresh copy is loaded in the background
        if (is_usable && age < cache_ms + this.stale_ms) {
            if (!this.refreshing.has(app_id)) {
                this.refreshing.add(app_id);
                this.queue_inventory(app_id, `cache expired (age: ${Math.round(age / 60000)} min), refreshing in background`)
                    .then(fresh => fresh && on_refresh?.(fresh))
                    .finally(() => this.refreshing.delete(app_id));
            }
            return this.inventory_from_cache(entry);
        }

        let miss_reason = 'no cache entry';
        if (cache_ms <= 0)
            miss_reason = `cache disabled (duration setting: ${GM_config.get('owned_count_cache')})`;
        else if (entry)
            miss_reason = 'cache outdated';

        return await this.queue_inventory(app_id, miss_reason) ?? new this.OwnedInventory();
    }

    static to_entry(desc, amount) {
        // Normalizes an item of either inventory endpoint to its names and its amount
        return {
            name: desc?.market_hash_name || desc?.name,
            local_name: desc?.market_name || desc?.name,
            amount: parseInt(amount || 1, 10)
        };
    }

    static async request_json(url) {
        // Resolves with the HTTP status (0 for network errors) and the parsed body, which is undefined if the request failed
        try {
            const response = await fetch(url, { credentials: 'include' });
            const data = response.ok ? await response.json().catch(() => undefined) : undefined;
            return { status: response.status, data };
        } catch (e) {
            return { status: 0, data: undefined };
        }
    }

    static async fetch_context_new(steam_id, app_id, ctx, language) {
        // Entries of one context from the endpoint of the Steam web client, which delivers the items in pages
        // A failed page marks the whole context as failed, because partial data would silently hide items
        const entries = [];
        let last_assetid = null;
        let status = 200;

        do {
            const start = last_assetid ? `&start_assetid=${last_assetid}` : '';
            const response = await this.request_json(`https://steamcommunity.com/inventory/${steam_id}/${app_id}/${ctx}?l=${language}&count=1000${start}`);
            status = response.status;
            if (response.data === undefined) return { status, entries: null };

            // The item names are listed separately and are linked to the assets by class and instance id
            const descriptions = new Map((response.data?.descriptions || []).map(desc => [`${desc.classid}_${desc.instanceid}`, desc]));
            (response.data?.assets || []).forEach(asset => entries.push(this.to_entry(descriptions.get(`${asset.classid}_${asset.instanceid}`), asset.amount)));

            last_assetid = response.data?.more_items ? response.data.last_assetid : null;
            if (last_assetid)
                await sleep(1000);
        } while (last_assetid);

        return { status, entries };
    }

    static async fetch_context_old(profile_path, app_id, ctx, language) {
        // Entries of one context from the older profile endpoint, which delivers all items at once
        const { status, data } = await this.request_json(`https://steamcommunity.com/${profile_path}/inventory/json/${app_id}/${ctx}/?l=${language}`);
        if (data === undefined) return { status, entries: null };

        // A response without the success flag (e.g. a context that does not exist) simply has no items
        const items = data?.success ? Object.values(data.rgInventory || {}) : [];
        return { status, entries: items.map(item => this.to_entry((data.rgDescriptions || {})[`${item.classid}_${item.instanceid}`], item.amount)) };
    }

    static async fetch_all_contexts(app_id, profile_path, language) {
        const contexts = (GM_config.get('owned_count_contexts') || '1, 2, 6').split(',').map(s => s.trim());
        const steam_id = this.get_steam_id64();
        let results = [];

        // The endpoint of the Steam web client is used first, the older profile endpoint is the fallback if it delivers nothing usable
        if (steam_id)
            results = await Promise.all(contexts.map(ctx => this.fetch_context_new(steam_id, app_id, ctx, language)));

        if (!results.some(result => result.entries)) {
            if (steam_id)
                console.warn(`[SIE] The inventory endpoint of the web client failed for app ${app_id}, using the profile endpoint instead.`);
            results = await Promise.all(contexts.map(ctx => this.fetch_context_old(profile_path, app_id, ctx, language)));
        }

        return results;
    }

    static async load_inventory(app_id, reason) {
        try {
            const profile_path = await this.get_profile_path();
            if (!profile_path) {
                console.error("[SIE] Steam profile not found, make sure you are logged in.");
                return null;
            }

            // The market pages display names in the language selected on Steam, so the inventory is requested in that language too
            const language = await this.get_language();
            console.log(`[SIE] Fetching inventory of app ${app_id} (reason: ${reason}, profile: ${profile_path}, language: ${language})`);

            let results = await this.fetch_all_contexts(app_id, profile_path, language);

            // A second attempt is only worth it if Steam is rate limiting or the network failed
            if (!results.some(result => result.entries) && results.some(result => result.status === 0 || result.status === 429)) {
                console.warn(`[SIE] All inventory requests of app ${app_id} failed, retrying shortly.`);
                await sleep(3000);
                results = await this.fetch_all_contexts(app_id, profile_path, language);
            }

            if (!results.some(result => result.entries)) {
                console.warn(`[SIE] The inventory of app ${app_id} could not be loaded (HTTP ${results.map(result => result.status).join(', ')}).`);
                return null;
            }

            // Aggregate the item amounts by their market hash names and by their localized names
            const counts = new this.OwnedInventory();
            results.flatMap(result => result.entries || []).forEach(entry => {
                if (entry.name) counts.set(entry.name, (counts.get(entry.name) || 0) + entry.amount);
                if (entry.local_name) counts.local_counts.set(entry.local_name, (counts.local_counts.get(entry.local_name) || 0) + entry.amount);
            });

            // Empty inventories are cached as well, because a successful answer without items is a valid result
            this.store_inventory(app_id, counts);
            return counts;
        } catch (e) {
            console.error("[SIE] API fetch error:", e);
            return null;
        }
    }

    static get_owned_count(counts, names) {
        const name_list = [names].flat().filter(Boolean);
        if (!counts || name_list.length === 0) return 0;

        // All candidates and both maps describe the same items, so the largest total is used to avoid counting an item twice
        // This also covers identical hash and localized names (e.g. an English market page)
        return Math.max(0, ...name_list.flatMap(name => [this.sum_by_name(counts, name), this.sum_by_name(counts.local_counts, name)]));
    }

    static sum_by_name(counts, name) {
        if (!counts) return 0;

        // The new market layout groups all variants of an item (e.g. every wear of a skin) into one entry
        // Build the summed amounts per grouped name once for each counts map
        let group_counts = this.group_cache.get(counts);
        if (!group_counts) {
            group_counts = new Map();
            counts.forEach((amount, item_name) => {
                const base_name = item_name.replace(this.group_suffix_regex, '');
                if (base_name !== item_name)
                    group_counts.set(base_name, (group_counts.get(base_name) || 0) + amount);
            });
            this.group_cache.set(counts, group_counts);
        }

        // Exact matches cover single variants, grouped matches cover all variants behind a grouped name
        return (counts.get(name) || 0) + (group_counts.get(name) || 0);
    }

    static observe_dom(callback) {
        let is_scheduled = false;

        // Batch bursts of DOM mutations into a single callback run per animation frame
        const schedule = () => {
            if (is_scheduled) return;
            is_scheduled = true;
            requestAnimationFrame(() => {
                is_scheduled = false;
                callback();
            });
        };

        // The callback must be idempotent because its own DOM changes trigger the observer again
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
        schedule();
        return schedule;
    }

    static queue_inventory(app_id, reason) {
        // Network loads run one after the other with a pause in between to stay clear of rate limits
        // Cache hits never enter this queue
        const result = this.inventory_queue.then(() => this.load_inventory(app_id, reason));
        this.inventory_queue = result.then(() => sleep(500), () => sleep(500));
        return result;
    }

    static sync_badge(target, count, prefix) {
        const badge = target.querySelector(':scope > .sie-owned-badge');
        const text = `${prefix}${count}`;

        // Nothing owned: remove a stale badge left over from a previous render
        if (count === 0)
            return badge?.remove();

        // Badge already shows the correct amount
        if (badge?.textContent === text)
            return;

        badge?.remove();
        target.insertAdjacentHTML('beforeend', `<div class="sie-owned-badge">${text}</div>`);
    }

    static async init_inventory_page() {
        // Define a local helper to detect game changes in the inventory tabs
        const check_app_id = async () => {
            const active = document.querySelector('.games_list_tab.active');
            const id = active ? active.getAttribute('href').replace('#', '') : window.location.hash.replace('#', '').split('_')[0];
            if (id && id !== this.last_app_id) {
                this.last_app_id = id;
                this.app_itemcache = await this.get_inventory(id, fresh => {
                    if (this.last_app_id === id)
                        this.app_itemcache = fresh;
                });
                return true;
            }
            return false;
        };

        await check_app_id();

        // Enter a monitoring loop to handle Steam's dynamic loading of item description panels
        while (true) {
            try {
                // Wait for an item's header to appear, update the badge, then wait for it to be removed
                const h1 = await wait_for_element('.inventory_page_right h1');
                await check_app_id();
                this.update_badge(h1);
                await wait_for_element_to_disappear(h1);
            } catch (e) {
                console.error("[SIE] Error in monitoring loop:", e);
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    static update_badge(h1_element) {
        // Clean up any existing badges in the right-side container to prevent duplicate overlays
        const main_container = document.querySelector('.inventory_page_right');
        if (main_container)
            main_container.querySelectorAll('.sie-owned-badge').forEach(old => old.remove());

        // Find the active item description box and ensure it is properly positioned for badge overlay
        const info_box = h1_element.closest('div[id^="iteminfo"]');
        if (!info_box) return;

        if (getComputedStyle(info_box).position === 'static')
            info_box.style.position = 'relative';

        let name = null;
        // Determine the item's identity via its market link for better reliability than simple text
        const market_link = info_box.querySelector('a[href*="/market/listings/"]');
        if (market_link) {
            const parts = market_link.href.split('/');
            name = decodeURIComponent(parts[parts.length - 1]);
        }
        if (!name) name = h1_element.innerText.trim();

        const count = this.app_itemcache.get(name) || 0;

        // If the item is owned, insert the badge at the top of the information panel
        if (count > 0) {
            const txt = `💼 You Own: ${count}`;
            info_box.insertAdjacentHTML('afterbegin', `<div class="sie-owned-badge">${txt}</div>`);
        }
    }

    static get_bucket_names() {
        if (this.bucket_names) return this.bucket_names;

        const ssr = this.read_ssr_data();
        if (!ssr) return new Map();

        const bucket_names = new Map();
        try {
            // The results of the first page are part of the dehydrated query state of the page
            const query_data = JSON.parse(ssr.renderContext.queryData);
            const results = query_data.queries.flatMap(query => (query.state?.data?.pages || []).flatMap(page => page.results || []));

            // Maps the bucket id used in the result links to language independent names (hash name, its grouped base name and the group name)
            results.forEach(result => {
                const desc = result.asset_description;
                const hash_name = desc?.market_hash_name || result.strHash;
                if (desc?.market_bucket_group_id && hash_name)
                    bucket_names.set(desc.market_bucket_group_id, [...new Set([hash_name, hash_name.replace(this.group_suffix_regex, ''), desc.market_bucket_group_name].filter(Boolean))]);
            });
        } catch (e) {
            console.error("[SIE] Failed to read the search results data:", e);
        }

        this.bucket_names = bucket_names;
        return bucket_names;
    }

    static get_listing_data() {
        if (this.listing_data) return this.listing_data;

        const ssr = this.read_ssr_data();
        if (!ssr) return {};

        // Each loader entry is a JSON string, the one of the listing route contains the list of buckets
        // A bucket id is the language independent hash name, the localized name is what the page displays
        const entries = (ssr.loaderData || []).map(entry => {
            try {
                return JSON.parse(entry);
            } catch (e) {
                return null;
            }
        });

        this.listing_data = entries.find(entry => Array.isArray(entry?.buckets)) || {};
        return this.listing_data;
    }

    static find_listing_hero(title_el) {
        // The hero box is the closest ancestor that reaches far to the left or above the title, which means it also holds the item image
        const title_rect = title_el.getBoundingClientRect();
        const is_hero = (el) => {
            const rect = el.getBoundingClientRect();
            return rect.left < title_rect.left - 150 || rect.top < title_rect.top - 150;
        };

        let node = title_el.parentElement;
        while (node && node !== document.body && !is_hero(node))
            node = node.parentElement;

        return node && node !== document.body ? node : title_el.parentElement;
    }

    static init_market() {
        // The market is a single page app, so the route can change without a page reload
        // One observer therefore decides on every run which kind of page is currently shown
        // The inventory of a game is loaded as soon as an item of that game shows up
        const inventories = new Map();

        const get_counts = (app_id) => {
            if (!app_id) return null;

            // The placeholder marks the inventory as requested, so it is only loaded once while it is still loading
            if (!inventories.has(app_id)) {
                inventories.set(app_id, null);
                this.get_inventory(app_id, fresh => {
                    inventories.set(app_id, fresh);
                    refresh();
                }).then(counts => {
                    inventories.set(app_id, counts);
                    refresh();
                });
            }
            return inventories.get(app_id);
        };

        // The observer also catches cards that are appended by the endless scrolling
        const refresh = this.observe_dom(() => {
            const is_search = window.location.pathname.startsWith('/market/search');
            const is_listing = window.location.pathname.startsWith('/market/listings/');

            if (is_search && GM_config.get('owned_count_show_market_search'))
                this.update_search_badges(get_counts);
            else if (is_listing && GM_config.get('owned_count_show_market_listing'))
                this.update_listing_badge(get_counts);
        });
    }

    static update_search_badges(get_counts) {
        const url_app_id = new URLSearchParams(window.location.search).get('appid');

        // Old layout: every row carries the market hash name as an attribute
        document.querySelectorAll('.market_listing_row').forEach(row => {
            const target = row.querySelector('.market_listing_item_name_block');
            const counts = get_counts(row.getAttribute('data-appid') || url_app_id);
            if (target && counts)
                this.sync_badge(target, this.get_owned_count(counts, row.getAttribute('data-hash-name')), '💼 ');
        });

        // New layout: every result is a link to a listing whose first child is the card
        // The class names are generated, so the title is found via its inline style variables instead
        document.querySelectorAll('a[href*="/market/listings/"]').forEach(link => {
            const card = link.firstElementChild;
            const name_el = card?.querySelector('span[style*="--line-clamp"], span[style*="body-title"]');
            const link_match = link.href.match(/\/market\/listings\/(\d+)\/(G[0-9A-F]+)/i);
            if (!name_el || !link_match) return;

            const counts = get_counts(link_match[1]);
            if (!counts) return;

            // The bucket id in the link resolves to language independent names
            // The displayed name is the fallback for results that are not part of the initial page data
            const bucket_id = link_match[2];
            const names = [...(this.get_bucket_names().get(bucket_id) || []), name_el.textContent.trim()];

            card.classList.add('sie_owned_anchor');
            this.sync_badge(card, this.get_owned_count(counts, names), '💼 ');
        });
    }

    static update_listing_badge(get_counts) {
        // Extract AppID and the identifier from the listing's URL path
        const path_parts = window.location.pathname.split('/');
        const url_name = decodeURIComponent(path_parts[4] || '');
        const counts = get_counts(path_parts[3]);
        if (!counts) return;

        // Old layout: the item name is part of the URL and the badge goes into the React-rendered description
        if (!/^G[0-9A-F]+$/i.test(url_name)) {
            const target = document.querySelector('.market_listing_iteminfo > .largeiteminfo_react_placeholder > div > div:first-child');
            if (!target) return;

            target.classList.add('sie_owned_anchor');
            this.sync_badge(target, this.get_owned_count(counts, url_name), '💼 Owned: ');
            return;
        }

        // New layout: the URL only contains a bucket id, so the item name is read from the title
        // The first h2 is the item title
        const title_el = document.querySelector('h2');
        if (!title_el?.parentElement) return;

        // Resolve the displayed (localized) title to the language independent bucket id
        // The bucket selected on page load is only a valid fallback while the route is still the one of the embedded data
        const title = title_el.textContent.trim();
        const { buckets = [], initialSelectedBucketID: selected_id } = this.get_listing_data();
        const is_initial_route = this.ssr_path === window.location.pathname;
        const bucket = buckets.find(entry => entry.localized_name === title)
            || (is_initial_route ? buckets.find(entry => entry.bucket_id === selected_id) : null)
            || (is_initial_route && buckets.length === 1 ? buckets[0] : null);
        const names = [title, bucket?.bucket_id, bucket?.bucket_id?.replace(this.group_suffix_regex, '')];

        // The badge sits in the top right corner of the hero box, stale badges from other containers are removed
        const container = this.find_listing_hero(title_el);
        document.querySelectorAll('.sie-owned-badge').forEach(badge => {
            if (badge.parentElement !== container)
                badge.remove();
        });

        container.classList.add('sie_owned_anchor');
        this.sync_badge(container, this.get_owned_count(counts, names), '💼 Owned: ');
    }
}

// ==========================================================
// ASF Integration
// ==========================================================
class ASF {
    // Initializes the ASF integration by injecting menu items into the Steam inventory "More" dropdown
    static async init() {
        this.insert_asf_buttons();
    }

    static async insert_asf_buttons() {
        // Wait for the 'More' dropdown list of the Steam inventory to exist in the DOM before modification
        const dropdown_menu = await wait_for_element("#inventory_more_droplist");

        // Retrieve the configured bot name from script settings (defaults to 'ASF')
        const bot = GM_config.get("asf_botname") || 'ASF';

        // HTML template for the 2FA confirmation controls
        // The inline handlers of the entries only highlight them and close the dropdown like the native entries do
        const asf_html = `
            <li>
                <a role="option" class="inactive_selection" tabindex="99999" id="sie_asf_2faok" href="javascript:void(0);" style="white-space: normal;"
                    onmouseover="this.className = 'highlighted_selection';" onmouseout="this.className = 'inactive_selection';" onclick="DSelectHide('inventory_more');">
                    <span style="color: #67c1f5;">SIE ASF:</span> Accepts all 2FA confirmations (2faok)
                </a>
            </li>
            <li>
                <a role="option" class="inactive_selection" tabindex="99999" id="sie_asf_2fano" href="javascript:void(0);" style="white-space: normal;"
                    onmouseover="this.className = 'highlighted_selection';" onmouseout="this.className = 'inactive_selection';" onclick="DSelectHide('inventory_more');">
                    <span style="color: #67c1f5;">SIE ASF:</span> Denies all 2FA confirmations (2fano)
                </a>
            </li>
        `;

        // Insert the new menu items at the end of the existing dropdown list
        dropdown_menu.insertAdjacentHTML('beforeend', asf_html);

        // Click handler for accepting all pending 2FA mobile confirmations
        document.getElementById("sie_asf_2faok").addEventListener('click', (e) => {
            e.preventDefault();
            this.send_command(`2faok ${bot}`, "Confirmations accepted!");
        });

        // Click handler for denying/cancelling all pending 2FA mobile confirmations
        document.getElementById("sie_asf_2fano").addEventListener('click', (e) => {
            e.preventDefault();
            this.send_command(`2fano ${bot}`, "Confirmations denied.", "warning");
        });
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
                    let result_text = null;
                    try {
                        result_text = JSON.parse(res.responseText).Result;
                    } catch (e) {
                        Swal.fire({
                            title: "Error: Invalid response from ASF",
                            icon: "error",
                            theme: "dark"
                        });
                        return;
                    }

                    Swal.fire({
                        title: "ASF Result",
                        text: result_text || success_msg, // Display the actual response text from ASF
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

    .games_list_separator {
        border-bottom: unset !important;
    }

    .games_list_separator,
    .games_list_tabs_ctn{
        border: 1px solid #2c3235;
    }

    .games_list_tabs_ctn {
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
        line-height: 2;
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