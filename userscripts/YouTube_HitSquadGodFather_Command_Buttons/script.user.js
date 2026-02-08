// ==UserScript==
// @name            YouTube HitSquadGodFather Command Buttons
// @namespace       https://kurotaku.de
// @version         1.2.11
// @description     Adds buttons to send commands for the onstream games in the YouTube chat
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.youtube.com/live_chat?*
// @icon            https://www.youtube.com/s/desktop/6ee70b2c/img/favicon_32x32.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/YouTube_HitSquadGodFather_Command_Buttons/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/YouTube_HitSquadGodFather_Command_Buttons/script.user.js
// @require         https://cdn.jsdelivr.net/gh/Kurotaku-sama/Userscripts@main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==


(async function() {
    if(document.querySelector("html").innerHTML.toLowerCase().includes("hitsquadgodfather")) { // Check if the page contains the word hitsquadgodfather to make sure its only appearing on GF Stream
        await init_gm_config();

        wait_for_element('#input-container #input.yt-live-chat-text-input-field-renderer').then(async () => {
            let buttongroups = "";
            if(GM_config.get("buttons_general"))
                buttongroups += `<label class="k-buttongroup-label">General</label>
                <div class="k-buttongroup">
                <button cmd="hitsquad" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Hitsquad</button>
                <button cmd="strikes" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Strikes</button>
                <button cmd="points" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Points</button>
                </div></div>`;
            if(GM_config.get("buttons_trivia"))
                buttongroups += `<label class="k-buttongroup-label">Trivia</label>
                <div class="k-buttongroup">
                <button cmd="answer1" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">1</button>
                <button cmd="answer2" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">2</button>
                <button cmd="answer3" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">3</button>
                <button cmd="answer4" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">4</button>
                </div>`;
            if(GM_config.get("showdown_buttons")) {
                buttongroups += ``;
                // Selection
                buttongroups += `<label class="k-buttongroup-label">Showdown</label>
                <div class="k-buttongroup">
                <button cmd="wizard" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Wizard</button>
                <button cmd="knight" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Knight</button>
                <button cmd="cleric" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Cleric</button>
                <button cmd="experience" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Experience</button>
                </div>`;
                // Labels to show roles
                buttongroups += `<div class="k-labelgroup">
                <label class="k-selection-label" data-role="wizard">Wizard</label>
                <label class="k-selection-label" data-role="knight">Knight</label>
                <label class="k-selection-label" data-role="cleric">Cleric</label>
                <label class="k-selection-label" data-role="close">Close</label>
                </div>`;
                // Wizard
                buttongroups += `<div class="k-buttongroup k-role k-hidden" data-role="wizard">
                <button cmd="attack" class="targetbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Attack</button>
                <button cmd="flames" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Flames</button>
                <button cmd="shield" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Shield</button>
                <button cmd="moan" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Moan</button>
                </div>`;
                // Knight
                buttongroups += `<div class="k-buttongroup k-role k-hidden" data-role="knight">
                <button cmd="attack" class="targetbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Attack</button>
                <button cmd="frenzy" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Frenzy</button>
                <button cmd="rally" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Rally</button>
                <button cmd="moan" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Moan</button>
                </div>`;
                // Cleric
                buttongroups += `<div class="k-buttongroup k-role k-hidden" data-role="cleric">
                <button cmd="attack" class="targetbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Attack</button>
                <button cmd="divine" class="targetbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Divine</button>
                <button cmd="heal" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Heal</button>
                <button cmd="moan" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Moan</button>
                </div>`;
            }

            let html = `<div id="actions" class="k-buttongroups">${buttongroups}</div>`;
            html += `<div id="targets" class="k-buttongroups k-hidden" data-action="">
            <label class="k-buttongroup-label targets">Targets</label>
            <div class="k-buttongroup">
            <button cmd="1" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">1</button>
            <button cmd="2" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">2</button>
            <button cmd="3" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">3</button>
            <button cmd="4" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">4</button>
            <button cmd="5" class="actionbutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">5</button>
            <button class="closebutton yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m">Close</button>
            </div>`;

            document.querySelector("#contents #panel-pages").insertAdjacentHTML('beforebegin', html);

            if(document.querySelector(".k-buttongroup .closebutton"))
                document.querySelector(".k-buttongroup .closebutton").addEventListener("click", close_target, false);

            let actionbuttons = document.querySelectorAll(".k-buttongroup .actionbutton");
            actionbuttons.forEach(el => {el.addEventListener("click", send_command, false)});
            let targetbuttons = document.querySelectorAll(".k-buttongroup .targetbutton");
            targetbuttons.forEach(el => {el.addEventListener("click", switch_panel, false)});
            let selection_labels = document.querySelectorAll(".k-selection-label");
            selection_labels.forEach(el => {el.addEventListener("click", show_role, false)});
        });
    }
})();

async function init_gm_config() {
    const config_id = "configuration_yt_hsgf_cmd_btn";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Settings", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: 'YouTube HitSquadGodFather Command Buttons',
        fields: {
            buttons_general: {
                section: ['Buttons'],
                type: 'checkbox',
                default: true,
                label: 'General buttons',
            },
            buttons_trivia: {
                type: 'checkbox',
                default: true,
                label: 'Trivia buttons',
            },
            showdown_buttons: {
                type: 'checkbox',
                default: true,
                label: 'Showdown buttons',
            },
            showdown_experience: {
                type: 'checkbox',
                default: true,
                label: 'Showdown Experience button',
            },
        },
        events: {
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}


function close_target() {
    switch_panel(null);
}

function switch_panel(event) {
    document.querySelector("#actions").classList.toggle("k-hidden");
    document.querySelector("#targets").classList.toggle("k-hidden");
    if(event)
        document.querySelector("#targets").setAttribute("data-action", event.target.getAttribute("cmd"));
}

function show_role(event) {
    let roles = document.querySelectorAll(".k-role");
    roles.forEach(el => {
        if(el.getAttribute("data-role") === event.target.getAttribute("data-role"))
            el.classList.remove("k-hidden")
        else
            el.classList.add("k-hidden")
    });
}

function send_command(event) {
    let cmd = "";
    if(event.target.parentNode.parentNode.getAttribute("data-action")) {
        cmd = event.target.parentNode.parentNode.getAttribute("data-action"); // Add action attack or devine in case its from the switched panel
        // Remove the data and go back to main panel
        event.target.parentNode.parentNode.setAttribute("data-action", "");
        switch_panel(null);
    }
    cmd += event.target.getAttribute("cmd");

    let suffix = "!";
    if(cmd.trim() !== "" && cmd !== null)
        send_message_to_youtube_chat(suffix + cmd + ' - ' + makeid(5));
    else
        alert("Please contact script creator, this button doesn't seem to work correctly");
}


function send_message_to_youtube_chat(message) {
    // Without this solution I probably would have hang myself :D
    // https://stackoverflow.com/questions/75962593/sending-message-on-youtube-live-chat-with-chrome-extension

    console.log('Sending message:', message);
    //const live_chat_frame = document.querySelector('iframe.style-scope.ytd-live-chat-frame');
    //const chat_input_box = live_chat_frame.contentDocument.querySelector('#input.yt-live-chat-text-input-field-renderer');
    const chat_input_box = document.querySelector('#input.yt-live-chat-text-input-field-renderer');
    console.log('Chat input box:', chat_input_box);
    chat_input_box.focus();
    chat_input_box.innerText = message;
    chat_input_box.dispatchEvent(new Event('input', { bubbles: true }));
    //setTimeout(() => {
    //const send_button = live_chat_frame.contentDocument.querySelector('#button.yt-icon-button[aria-label="Send"]');
    const send_button = document.querySelector('#send-button button');
    console.log('Send button:', send_button);
    if (send_button) {
        console.log('Clicking send button');
        try {
            send_button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        } catch (error) {
            console.error('Error sending message:', error);
        }
    } else {
        console.error('Could not find send button');
    }
    //}, 1000);
}

GM_addStyle(`
.k-buttongroups {
    padding-left: 20px;
    padding-right: 20px;
}

.k-buttongroup {
    display: flex;
    flex-wrap: wrap;
    grid-column-gap: 10px;
}

.k-buttongroup-label {}

.k-buttongroup > button {
    min-width:50px;
    margin-bottom:5px;
}

.k-labelgroup {
    margin-top: 10px;
    font-size: 20px;
    justify-content: space-between;
    display: flex;
}
.k-k-hidden {
    display:none;
}
`);