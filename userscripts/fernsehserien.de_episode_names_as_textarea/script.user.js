// ==UserScript==
// @name            fernsehserien.de episode names as textarea
// @name:de         fernsehserien.de Episodennamen als textarea
// @namespace       https://kurotaku.de
// @version         2.1.1
// @description     A simple script that adds a button that outputs each season of a series as a separate textarea to make it easier to copy. With this you can copy the episode names for programs like "Bulk Rename Utility" or the "MERU - Massive Episode Rename Utility" I developed.
// @description:de  Ein einfaches Script, dass einen Button hinzufügt, welcher jede Staffel einer Serie als eigenes Textarea ausgiebt, um es leichter zu kopieren. Damit kann man die Folgennamen für Programme wie "Bulk Rename Utility" oder das von mir entwickelte "MERU - Massive Episode Rename Utility" kopieren.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://www.fernsehserien.de/*/episodenguide
// @icon            https://bilder.fernsehserien.de/fernsehserien.de/fs-2021/img/favicon-32x32.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/fernsehserien.de_episode_names_as_textarea/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/fernsehserien.de_episode_names_as_textarea/script.user.js
// @require         https://cdn.jsdelivr.net/gh/Kurotaku-sama/Userscripts@main/libraries/kuros_library.js
// @require         cdn.jsdelivr.net/npm/sweetalert2@11
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==

(function() {
    let button = "<li id='k-get-episodenames' style='padding:0 15px'>Get Episode Names</li>";
    wait_for_element(".series-menu > ul").then(async menu => {
        menu.insertAdjacentHTML("afterbegin", button);
        document.getElementById("k-get-episodenames")?.addEventListener ("click", show_episodenames);
    });
})();

// Create textareas and insert the season as label and the episodes in a textarea
function show_episodenames() {
    document.getElementById("k-get-episodenames").remove(); // Remove the button because its not required anymore after the first click

    // Insert a div for the output textareas
    document.querySelector(".flexer").insertAdjacentHTML('beforebegin', "<div id='k-textarea-container' style='padding:2% 4%'></div>");
    let output_div = document.querySelector("#k-textarea-container");

    // Get the seasons with episodes
    let seasons = get_episodes();

    let ids = []; // Array with all created ids (required to check if there exist already a similar one)
    for (let season of seasons) {
        let random_id = random_number(); // For the id and name on the elements
        while (ids.includes(random_id)) // Check if the number is already used if yes generate another one
            random_id = random_number();
        random_id = `ID_${random_id}`; // IDs aren't allowed to start with a number thats why I added ID_ before

        // Create labels and textareas and insert them
        let label = `<label for="${random_id}" style="font-size:18px;font-weight:bold">${season.seasontitle}</label>`;
        let style = `resize:vertical;width:100%;min-height:150px;`
        let textarea = `<textarea id="${random_id}" name="${random_id}" style="${style}">${season.episodes}</textarea>`;
        output_div.innerHTML += `${label}<br>${textarea}<br><br>`;

        // Add the id into the array for used ids
        ids.push(random_id)
    }
}

function get_episodes() {
    let sections = document.querySelectorAll(".serie-content-left section[itemprop=containsSeason]");
    let output = []; // Contains title and the string with all episodes as object
    for (let section of sections) {
        let seasontitle = section.querySelector("header a[data-event-category=staffeltitel]").innerText; // Get Title
        let episodes_elements = section.querySelectorAll("div[role=cell] span[itemprop=name]"); // Get elements with episodenames

        let episodes = "";
        for(let i = 0; i < episodes_elements.length; i++) { // Get index and episode for each episode element
            episodes += `${episodes_elements[i].innerText}\n`
            if(i === episodes_elements.length-1) // Remove \n if its the last entry
                episodes = episodes.substring(0, episodes.length - 1);
        }
        output.push({seasontitle:seasontitle, episodes:episodes}) // Add the data into an output array
    }
    return output;
}