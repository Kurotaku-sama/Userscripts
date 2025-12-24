// ==UserScript==
// @name            ItzaGud.net improvements
// @name:de         ItzaGud.net Verbesserungen
// @namespace       https://kurotaku.de
// @version         0.7.1
// @description     Some improvements for ItzaGud.net, all of them can be disabled in the config (Topbar | Bottom of mobile navbar)
// @description:de  Einige Verbesserungen für ItzaGud.net, die alle in der Konfiguration deaktiviert werden können (Topbar | Unten in der Mobilen Navigationsleiste)
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://itzagud.net/*
// @icon            https://i0.wp.com/itzagud.net/wp-content/uploads/2022/12/cropped-512logo.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/ItzaGud_improvements/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/ItzaGud_improvements/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// ==/UserScript==

let daily_missions = []; // List with daily missions
let weekly_missions = []; // List with weekly missions
let one_time_missions = []; // List with one time missions

(async function() {
    await init_gm_config();
    insert_gm_config_button(); // Add the button to the filter container to open the configuration menu


    if(GM_config.get("script_enabled")) {

        // Shows instead GudCoinz the $ Value
        if(GM_config.get("enabled_convert_gudcoinz"))
            convert_gudcoinz();

        // Comments are collapsed by default with a button
        if(GM_config.get("enabled_collapsible_comments"))
            collapsible_comments();

        // 3 Buttons to do dailys, weekly and one time missions at once
        if(GM_config.get("enabled_open_all_missions"))
            open_all_missions();

        // Daily video rewards enable controlls and autoplay
        if(GM_config.get("enabled_daily_videos_controls_autoplay"))
            daily_videos_controls_autoplay();
    }
})();

async function init_gm_config() {
    GM_registerMenuCommand('Settings', () => GM_config.open());
    GM_config.init({
        id: 'configuration',
        title: 'ItzaGud.net improvements config',
        fields: {
            script_enabled: {
                type: 'checkbox',
                default: true,
                label: 'Enable/Disable the script',
            },
            enabled_convert_gudcoinz: {
                type: 'checkbox',
                default: true,
                label: 'Use point conversion',
            },
            enabled_collapsible_comments: {
                type: 'checkbox',
                default: true,
                label: 'Collapsed comments + comment box is on top of comment section',
            },
            enabled_open_all_missions: {
                type: 'checkbox',
                default: false,
                label: '[Currently useless due to new timewall]<br>Buttons on the mission page, that allows you to open all at once from a section (Daily, Weekly, One Time Missions)',
            },
            enabled_daily_videos_controls_autoplay: {
                type: 'checkbox',
                default: true,
                label: '[Currently useless due to new timewall]<br>Videomissions start automatic when opened, controls are enabled and video is muted',
            },
            gudcoinz_conversion: {
                type: 'int',
                default: 2500,
                label: 'Value of gudcoinz that are worth $0.01',
            },
        },
        events: {
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

function insert_gm_config_button() {
    let headerbar = document.querySelector(".header-top .header-right");
    let button = "<a id='gm_config_button'>itzagud improvement config</a>";
    headerbar.insertAdjacentHTML('afterbegin', button);
    document.querySelector("#gm_config_button").addEventListener("click",() => GM_config.open());

    // Mobile
    let mobilenavigation = document.querySelector("#menu-wd-header-navigation");
    let mobilebutton = "<a id='gm_config_button_mobile'>itzagud improvement config</a>";
    mobilenavigation.insertAdjacentHTML('afterend', mobilebutton);
    document.querySelector("#gm_config_button_mobile").addEventListener("click",() => GM_config.open());
}

function convert_gudcoinz() {
    // Get the 2 elements for value and label of wallet
    let el_value = document.querySelector(".gamipress-inline-points-wrapper .gamipress-inline-points-amount");
    let el_label = document.querySelector(".gamipress-inline-points-wrapper .gamipress-inline-points-label");

    if(el_value && el_label) { // Check if they exist
        // Calculation
        let value = el_value.innerHTML.replace(',', '');
        let rest = value%GM_config.get("gudcoinz_conversion");
        let value_dollars = (value-rest)/GM_config.get("gudcoinz_conversion")/100;

        // Output
        el_value.innerHTML = `You have: $${value_dollars.toFixed(2)}`; // Output value with 2 decimals
        // If you don't care about how much GudCoinz you have comment this out and in the line underneath remove the //
        el_label.innerHTML = `<br>${rest}/${GM_config.get("gudcoinz_conversion")}`;
        // el_label.innerHTML = ``;

        // Fix for collapsing points when clicking on cart
        if(document.querySelector("#gamipress_user_points_widget-5"))
            document.querySelector("#gamipress_user_points_widget-5").removeAttribute("class");
    }
}

// function rename_gudcoinz_menuitem() {
//     document.querySelectorAll(".menu-item-17319 > a").forEach(el => el.innerHTML = `Earn GudCoinz`); // Just rename the text of this menu item
// }

function collapsible_comments() {
    if(document.querySelector(".commentlist")) { // Only if a commentlist was found
        // Hide reviews (will be enabled through button)
        // Put comments/reviews on top of review bar
        GM_addStyle(`
            #reviews {
                display : grid;
            }
            #reviews > #review_form_wrapper {
                order: -1;
            }
            .commentlist {
                display: none;
            }
            `);
        // Add button above the comment list
        let button = `<button id="expand_comments_button" class="k-elementor-button">Show comments</button>`;
        document.querySelector(".commentlist").insertAdjacentHTML('beforebegin', button);

        // firstclick is required since the style for diplay : none is not on the element itself
        let first_click = false;
        document.querySelector("#expand_comments_button").addEventListener("click", function () {
            let button = document.querySelector("#expand_comments_button");

            let cl = document.querySelector(".commentlist");
            if (cl.style.display === "none" || !first_click) { // Show the comments and change button text
                cl.style.display = "block";
                button.innerHTML = "Hide comments";
                first_click = true;
            } else { // Hide the comments and change button text
                cl.style.display = "none";
                button.innerHTML = "Show comments";
            }
        });
    }
}

function open_all_missions() {
    if(document.querySelector(".post-230")) { // Only if you are on missions page
        // Fill the arrays with the missions
        fill_array_missions();

        // Creating container and buttons
        let missionbutton_container = `<div id="k-missionbutton-container" class="k-missionbutton-container"></div>`;
        let button_dailys_missions = `<button id="do_daily_missions" class="k-elementor-button">Do daily missions</button>`;
        let button_weeklys_missions = `<button id="do_weekly_missions" class="k-elementor-button">Do weekly missions</button>`;
        let button_one_time_missions = `<button id="do_one_time_missions" class="k-elementor-button">Do one time missions</button>`;

        // Insert container and buttons
        let elementor = document.querySelector(".elementor");
        elementor.insertAdjacentHTML('afterbegin', missionbutton_container);
        let button_container = document.querySelector("#k-missionbutton-container");
        button_container.insertAdjacentHTML('afterbegin', button_dailys_missions);
        button_container.insertAdjacentHTML('afterbegin', button_weeklys_missions);
        button_container.insertAdjacentHTML('afterbegin', button_one_time_missions);


        // Add events to the buttons
        document.querySelector("#do_daily_missions").addEventListener("click", () => {do_missions(daily_missions)});
        document.querySelector("#do_weekly_missions").addEventListener("click", () => {do_missions(weekly_missions)});
        document.querySelector("#do_one_time_missions").addEventListener("click", () => {do_missions(one_time_missions)});
    }
}

function do_missions(array) {
    let clickables = get_all_buttons(array); // All elements that must be clicked
    for(let i = 0; i < clickables.length; i++) {
        clickables[i].click(); // Automated click on all missions of a type
    }
}

function fill_array_missions() {
    // Get all sections in missionlist
    let sections = document.querySelectorAll(".post-230 .elementor-230 > section");

    // Switches to check if the missions are filled
    let daily_missions_full = false;
    let weekly_missions_full = false;
    let one_time_missions_full = false;


    for(let i = 0; i < sections.length; i++) {
        // Get data-id attribute
        let data_id = sections[i].getAttribute("data-id");

        if(data_id === "541ca05" || data_id === "5c83df6") // Check if its the data-id from daily missions headline
            continue;
        else if(data_id === "541ca05" || data_id === "9bb30ec") { // Check if its the data-id from weekly missions headline
            daily_missions_full = true;
            continue;
        }
        else if(daily_missions_full === false) // If dailys arent full yet push the mission into array
            daily_missions.push(sections[i]);
        else if(data_id === "52b308f" || data_id === "23e9d1e") { // Check if its the data-id from one time missions headline
            weekly_missions_full = true;
            continue;
        }
        else if(weekly_missions_full === false) // If dailys arent full yet push the mission into array
            weekly_missions.push(sections[i]);
        else if(daily_missions_full && weekly_missions_full)
            one_time_missions.push(sections[i]);
    }

    // Merge all missions into one array
    let clickables = [].concat(daily_missions, weekly_missions, one_time_missions);
    let all_buttons = get_all_buttons(clickables); // Get all button elements from that section arrays
    for(let i = 0; i < all_buttons.length; i++) {
        if(all_buttons[i])
            if(all_buttons[i].tagName === "A") // If the task is a link (elementor tasks)
                all_buttons[i].setAttribute('target', '_blank'); // Add the attribute for new tab instead actual tab
            else if (all_buttons[i].tagName === "BUTTON") { // If the task is a button (gamipress tasks)
                let data_url = all_buttons[i].getAttribute('data-url');
                all_buttons[i].setAttribute("data-url", "");
                all_buttons[i].setAttribute('onclick', `window.open('${data_url}', '_blank')`); // Use just the link and make a window open instead href that can make use of _blank (for new tab instead actual)
            }
    }
}

function get_all_buttons(array) {
    let all_buttons = [];
    for(let i = 0; i < array.length; i++)
        // Here will be checked if its a elementor (green button) or a gamipress button (yellow button) and assigned to that array
        all_buttons.push(array[i].querySelector("a.elementor-button-link") ? array[i].querySelector("a.elementor-button-link") : array[i].querySelector("button.gamipress-button"));
    return all_buttons;
}

async function daily_videos_controls_autoplay() {
    if (window.location.href.indexOf("daily-watch-video-reward") > -1) {
        let video;
        let i = 0;
        for(i = 0; i < 240; i++) {
            video = document.querySelector("iframe") // Get the youtube video iframe
            if(video) {
                let videoparts = video.src.split('?'); // Split the parameters from URL
                video.src = `${videoparts[0]}?autoplay=1&controls=1&mute=1`; // Enable autoplay + controls + mute
                break;
            }
            else
                await sleep(500); // Wait 500ms before trying again to get iframe
        }
        if(i >= 240) // If 2 minutes passed without video loading
            alert("Video doesn't seem to load, maybe and adblock of you blocks it or the video is wrong linked");
    }
}


GM_addStyle(`
@media(min-width:620px) {
    .k-missionbutton-container {display:flex;}
    .k-elementor-button:first-of-type {margin-left: auto;}
    .k-elementor-button:last-of-type {margin-right: auto;}
}

 @media(max-width:619px) {
    .k-elementor-button {
        margin: 10px 10px 10px 0 !important;
    }
}

#gm_config_button_mobile {
    position: absolute;
    left:0;
    right:0;
    bottom: 20px;
    text-align:center;
}

.k-elementor-button {
    margin: 30px 30px 30px 0;
    background-color: var( --e-global-color-accent );
    font-size: 18px;
    padding: 20px 40px;
    border-radius: 5px;
}
`);