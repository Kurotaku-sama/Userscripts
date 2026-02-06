// ==UserScript==
// @name            Twitch staggerrilla command buttons
// @namespace       https://kurotaku.de
// @version         2.0.9
// @description     Adds buttons to send commands in the Twitch chat
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.twitch.tv/staggerrilla*
// @match           https://www.twitch.tv/*/staggerrilla/chat*
// @icon            https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Twitch_Command_Buttons/script_staggerilla.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Twitch_Command_Buttons/script_staggerilla.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/twitch_command_buttons
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


let twitch_channel = "staggerrilla";
let streamelements_store = "staggerrilla";

(async function() {
    await main();
})();

async function init_gm_config() {
    const config_id = "configuration_ttv_stagger_cmd_btn";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'Twitch Staggerrilla Command Buttons',
        fields: {
            script_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable/Disable the script',
            },
            buttons_general: {
                section: ['Buttons'],
                type: 'checkbox',
                default: true,
                label: 'General buttons',
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
            hide_powerups: {
                type: 'checkbox',
                default: true,
                label: 'Hide Power-Ups in Store',
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
                ${btngrp_button("bleep", "Bleep")}
                ${btngrp_button("bloop", "Bloop")}
                ${btngrp_button("bleep !bloop", "Bleep & Bloop")}
                ${btngrp_button("champ", "Champ")}
                ${btngrp_button("heal", "Heal")}
                ${btngrp_button("join", "Join")}
                </div>`;

    return(buttongroups);
}

async function generate_voucher_buttons() {
    insert_voucher_buttons(
        generate_voucher_button("50k Bubbers", "+50k") +
        generate_voucher_button("100k Bubbers", "+100k") +
        generate_voucher_button("500k Bubbers", "+500k")
    );
}