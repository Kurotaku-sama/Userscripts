// ==UserScript==
// @name            Twitch hitsquadgodfather command buttons
// @namespace       https://kurotaku.de
// @version         2.1.6
// @description     Adds buttons to send commands in the Twitch chat
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.twitch.tv/*hitsquad*
// @icon            https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Twitch_Command_Buttons/script_hitsquad.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Twitch_Command_Buttons/script_hitsquad.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/twitch_command_buttons.js
// @require         https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_notification
// @grant           GM_registerMenuCommand
// ==/UserScript==


let twitch_channel = "hitsquadgodfather";
let streamelements_store = "hitsquadgodfather";

(async function() {
    const match = window.location.pathname.toLowerCase().match(/^\/(hitsquad[^\/]*)/);
    if (match)
        twitch_channel = match[1];

    await main();

    // Additional functionality for TheGodFather's version of the script
    if (GM_config.get("script_enabled")) {
        if (GM_config.get("bulk_purchase_panel") || GM_config.get("clickable_links_in_description"))
            twitch_store_observer();

        if (GM_config.get("restart_timer"))
            restart_timer(172800);
    }
})();

async function init_gm_config() {
    GM_registerMenuCommand('Settings', () => GM_config.open());
    GM_config.init({
        id: 'configuration',
        title: 'Twitch HitSquadGodFather Command Buttons',
        fields: {
            script_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable/Disable the script',
            },
            buttons_general: {
                type: 'checkbox',
                default: true,
                label: 'General buttons',
            },
            buttons_trivia: {
                type: 'checkbox',
                default: true,
                label: 'Trivia buttons',
            },
            buttons_loot: {
                section: ['Loot'],
                type: 'checkbox',
                default: false,
                label: 'Loot buttons',
            },
            buttons_loot_random: {
                type: 'checkbox',
                default: true,
                label: 'Random Loot Button in General Buttons',
            },
            buttons_loot_target: {
                type: 'checkbox',
                default: true,
                label: 'Loot buttons with Target Buttons',
            },
            buttons_chest: {
                section: ['Chest'],
                type: 'checkbox',
                default: false,
                label: 'Chest buttons',
            },
            buttons_chest_random: {
                type: 'checkbox',
                default: true,
                label: 'Random Chest Button in General Buttons',
            },
            buttons_chest_target: {
                type: 'checkbox',
                default: true,
                label: 'Chest buttons with Target Buttons',
            },
            showdown_buttons: {
                section: ['Showdown'],
                type: 'checkbox',
                default: true,
                label: 'Showdown buttons',
            },
            showdown_wizard: {
                type: 'checkbox',
                default: true,
                label: 'Showdown Wizard button',
            },
            showdown_knight: {
                type: 'checkbox',
                default: true,
                label: 'Showdown Knight button',
            },
            showdown_cleric: {
                type: 'checkbox',
                default: true,
                label: 'Showdown Cleric button',
            },
            showdown_experience: {
                type: 'checkbox',
                default: true,
                label: 'Showdown Experience button',
            },
            voucher_buttons: {
                section: ['Voucher'],
                type: 'checkbox',
                default: true,
                label: 'Enable Voucher redemption buttons',
            },
            irc: {
                section: ['IRC'],
                type: 'checkbox',
                default: false,
                label: 'Use IRC (Recommended! Requires Oauth)',
            },
            auth_username: {
                label: 'Username',
                type: 'textbox',
            },
            auth_oauth: {
                label: 'Oauth Token. Generate here: <a href="https://twitchtokengenerator.com" target="_blank">twitchtokengenerator.com</a>',
                type: 'textbox',
            },
            hide_powerups: {
                section: ['Twitch Store'],
                type: 'checkbox',
                default: true,
                label: 'Hide Power-Ups in Store',
            },
            bulk_purchase_panel: {
                type: 'checkbox',
                default: true,
                label: 'Bulk purchase panel',
            },
            clickable_links_in_description: {
                type: 'checkbox',
                default: true,
                label: 'Clickable links in descriptions',
            },
            show_streamelements_points: {
                section: ['Miscellaneous'],
                type: 'checkbox',
                default: true,
                label: 'Show StreamElement Points',
            },
            collect_point_bonus: {
                type: 'checkbox',
                default: true,
                label: 'Collect Point Bonus Automatically',
            },
            notifications: {
                type: 'checkbox',
                default: false,
                label: 'Desktop notification if message contains your name',
            },
            restart_timer: {
                type: 'checkbox',
                default: true,
                label: 'Show approx stream restart timer',
            },
            prevent_shadowban: {
                type: 'checkbox',
                default: true,
                label: 'Prevent Shadowban. Commands become random case.<br>Shadowban means your messages temporarily don\'t appear.<br>Without IRC, you can\'t see if you\'re shadowbanned',
            },
            custom_css_styles: {
                label: 'Custom CSS Styles:',
                type: 'textarea',
            },
        },
        events: {
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

function generate_button_groups() {
    let buttongroups = "";
    if(GM_config.get("buttons_general"))
        buttongroups += `${btngrp_label("General")}
                <div class="k-buttongroup">
                ${btngrp_button("hitsquad", "Hitsquad")}
                ${btngrp_button("strikes", "Strikes")}
                </div>`;

    if (GM_config.get("buttons_chest_random") || GM_config.get("buttons_chest_target") || GM_config.get("buttons_loot_random") || GM_config.get("buttons_loot_target")) {
        buttongroups += `${btngrp_label("Loot & Chest")}
                <div class="k-buttongroup">
                ${GM_config.get("buttons_loot_random") ? btngrp_button("loot", "RNG  Loot", { random_min: 1, random_max: 8 }) : ""}
                ${GM_config.get("buttons_loot_target") ? btngrp_button("loot", "Loot", { targets: 8 }) : ""}
                ${GM_config.get("buttons_chest_random") ? btngrp_button("chest", "RNG Chest", { random_min: 1, random_max: 8 }) : ""}
                ${GM_config.get("buttons_chest_target") ? btngrp_button("chest", "Chest", { targets: 8 }) : ""}
                </div>`;
    }

    if(GM_config.get("buttons_loot"))
        buttongroups += `${btngrp_label("Loot")}
                <div class="k-buttongroup k-grid-8">
                ${btngrp_button("loot1", "1")}
                ${btngrp_button("loot2", "2")}
                ${btngrp_button("loot3", "3")}
                ${btngrp_button("loot4", "4")}
                ${btngrp_button("loot5", "5")}
                ${btngrp_button("loot6", "6")}
                ${btngrp_button("loot7", "7")}
                ${btngrp_button("loot8", "8")}
                </div>`;

    if(GM_config.get("buttons_chest"))
        buttongroups += `${btngrp_label("Chest")}
                <div class="k-buttongroup k-grid-8">
                ${btngrp_button("chest1", "1")}
                ${btngrp_button("chest2", "2")}
                ${btngrp_button("chest3", "3")}
                ${btngrp_button("chest4", "4")}
                ${btngrp_button("chest5", "5")}
                ${btngrp_button("chest6", "6")}
                ${btngrp_button("chest7", "7")}
                ${btngrp_button("chest8", "8")}
                </div>`;

    if(GM_config.get("buttons_trivia"))
        buttongroups += `${btngrp_label("Trivia")}
                <div class="k-buttongroup">
                ${btngrp_button("answer1", "1")}
                ${btngrp_button("answer2", "2")}
                ${btngrp_button("answer3", "3")}
                ${btngrp_button("answer4", "4")}
                ${btngrp_button("triviapoints", "Points")}
                </div>`;

    if(GM_config.get("showdown_buttons") && (GM_config.get("showdown_wizard") || GM_config.get("showdown_knight") || GM_config.get("showdown_cleric"))) {
        // Selection
        buttongroups += `${btngrp_label("Showdown")}
                <div class="k-buttongroup">
                ${GM_config.get("showdown_wizard") ? btngrp_button("wizard", "Wizard") : ""}
                ${GM_config.get("showdown_knight") ? btngrp_button("knight", "Knight") : ""}
                ${GM_config.get("showdown_cleric") ? btngrp_button("cleric", "Cleric") : ""}
                ${GM_config.get("showdown_experience") ? btngrp_button("experience", "Experience") : ""}
                </div>`;
        // Labels to show roles
        buttongroups += `<div class="k-labelgroup">
                ${GM_config.get("showdown_wizard") ? lblgrp_label("wizard", "Wizard") : ""}
                ${GM_config.get("showdown_knight") ? lblgrp_label("knight", "Knight") : ""}
                ${GM_config.get("showdown_cleric") ? lblgrp_label("cleric", "Cleric") : ""}
                ${lblgrp_label("close", "Close", "k-hidden")}
                </div>`;
        // Wizard
        buttongroups += `<div class="k-buttongroup k-btn-menu k-hidden" data-btn-menu="wizard">
                ${btngrp_button("attack", "Attack", { targets: 5 })}
                ${btngrp_button("flames", "Flames")}
                ${btngrp_button("shield", "Shield")}
                ${btngrp_button("moan", "Moan")}
                </div>`;
        // Knight
        buttongroups += `<div class="k-buttongroup k-btn-menu k-hidden" data-btn-menu="knight">
                ${btngrp_button("attack", "Attack", { targets: 5 })}
                ${btngrp_button("frenzy", "Frenzy")}
                ${btngrp_button("rally", "Rally")}
                ${btngrp_button("moan", "Moan")}
                </div>`;
        // Cleric
        buttongroups += `<div class="k-buttongroup k-btn-menu k-hidden" data-btn-menu="cleric">
                ${btngrp_button("attack", "Attack", { targets: 5 })}
                ${btngrp_button("divine", "Divine", { targets: 5 })}
                ${btngrp_button("heal", "Heal")}
                ${btngrp_button("moan", "Moan")}
                </div>`;
    }

    buttongroups += `</div>
                       <div id="k-targets" class="k-buttongroups k-hidden" data-action="">
                         <label class="k-buttongroup-label k-targets">Targets</label>
                         <div id="k-targetbuttons" class="k-buttongroup">
                       </div>
                       <button id="k-closebutton">Close</button>
                     </div>`;

    return(buttongroups);
}

async function generate_voucher_buttons() {
    insert_voucher_buttons(
        (GM_config.get("voucher_buttons") ?
         generate_voucher_button("1000 Clams Voucher", "1k Clams Voucher") +
         generate_voucher_button("1000 Clams Voucher", "6x 1k Clams Voucher", { repeats: 6 }) : "")
    );
}