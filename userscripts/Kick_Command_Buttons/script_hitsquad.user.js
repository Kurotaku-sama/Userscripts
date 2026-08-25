// ==UserScript==
// @name            Kick hitsquadgodfather command buttons
// @namespace       https://kurotaku.dev
// @version         1.0.1
// @description     Adds buttons to send commands in the Kick chat
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://kick.com/*hitsquad*
// @icon            https://kick.com/favicon.ico
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kick_Command_Buttons/script_hitsquad.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Kick_Command_Buttons/script_hitsquad.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/about.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/command_buttons_kick.js
// @require         https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_notification
// @grant           GM_registerMenuCommand
// ==/UserScript==


let kick_channel = "hitsquadgodfather";

(async function() {
    const match = window.location.pathname.toLowerCase().match(/^\/(hitsquad[^\/]*)/);
    if (match)
        kick_channel = match[1];

    await main();
})();

async function init_gm_config() {
    const config_id = "configuration_kick_hsgf_cmd_btn";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Kick HitSquadGodFather Command Buttons',
        fields: {
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
            notifications: {
                section: ['Miscellaneous'],
                type: 'checkbox',
                default: false,
                label: 'Desktop notification if message contains your name',
            },
            prevent_shadowban: {
                type: 'checkbox',
                default: true,
                label: 'Prevent Shadowban. Commands become random case.<br>Shadowban means your messages temporarily don\'t appear.',
            },
            custom_css_styles: {
                label: 'Custom CSS Styles:',
                type: 'textarea',
            },
        },
        events: {
            save: () => { location.reload(); },
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

// Every reward whose title matches "match" gets a button generated for it, "<Number>" in
// "pattern" gets replaced by the number found in the title (converted to "5k"/"5kk" style
// if convert_thousands is true). Add or remove entries here for other stores/streamers.
// Order matters here, the first matching entry wins, so more specific patterns (e.g. one
// particular reward type from a store) should come before more general ones from the same
// store, otherwise a broad match could label an unrelated reward with the wrong text.
const voucher_patterns = [
    { match: /itzagud.*clams/i, pattern: "+<Number> Clams", convert_thousands: true },
    { match: /itzagud.*points/i, pattern: "+<Number> Points", convert_thousands: true },
];

async function setup_voucher_buttons() {
    if (!GM_config.get("voucher_buttons"))
        return;

    // generate_voucher_buttons() here is a placeholder marker, not a real button: whatever
    // gets auto-generated (or nothing, while it's still loading) gets injected exactly
    // where this call sits, so any static buttons placed before or after it keep their
    // position relative to the generated ones.
    insert_voucher_buttons(generate_voucher_buttons());

    // Combine with static, manually defined buttons the same way, before or after the
    // placeholder determines where the generated ones end up relative to them:
    // insert_voucher_buttons(
    //     generate_voucher_button("Irgend ein Giveaway", "Join") +
    //     generate_voucher_buttons()
    // );
    // insert_voucher_buttons(
    //     generate_voucher_buttons() +
    //     generate_voucher_button("Irgend ein Giveaway", "Join")
    // );

    // Hardcoded example of a single manually defined voucher button, kept here for reference:
    // insert_voucher_buttons(
    //     (GM_config.get("voucher_buttons") ?
    //      generate_voucher_button("1000 Clams Voucher", "1k Clams Voucher") : "")
    // );
}