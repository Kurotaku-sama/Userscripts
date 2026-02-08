// ==UserScript==
// @name            Podcast.de Autodownload
// @namespace       https://kurotaku.de
// @version         1.0.2
// @description     Enables automatic downloading of Podcast.de episodes with user-defined file name templates.
// @description:de  Ermöglicht das automatische Herunterladen von Podcast.de-Episoden mit benutzerdefinierten Dateinamen-Templates
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @include         https://*.podcast.de*
// @icon            https://www.podcast.de/images/icons/maskable_icon.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Podcast.de_Autodownload/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Podcast.de_Autodownload/script.user.js
// @require         https://cdn.jsdelivr.net/gh/Kurotaku-sama/Userscripts@main/libraries/kuros_library.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @run-at          document-body
// ==/UserScript==


(async function() {
    await init_gm_config();

    if (GM_config.get("enable_template_tester"))
        GM_registerMenuCommand("Template Tester", template_tester);

    // Check if the current page is an episode page and if the episode array exists with at least one item
    // Note: The `episode` array comes from the site's own JavaScript, not defined in this userscript
    if (window.location.pathname.includes("/episode/") && episode?.length > 0) {
        // Extract the episode URL (removing any query parameters)
        let url = episode[0].url.split("?")[0];

        // Trigger metadata fetching and download
        fetch_metadata_and_init_download(url);
    } else
        console.error("Episode URL not found or not an episode page.");
})();

async function init_gm_config() {
    const config_id = "configuration_podcastde_autodownload";
    await migrate_config_id(config_id);
    GM_registerMenuCommand("Einstellungen", () => GM_config.open());
    GM_config.init({
        id: config_id,
        title: "Podcast.de Autodownload",
        fields: {
            auto_download_enabled: {
                type: "checkbox",
                default: true,
                label: "Automatischen Download aktivieren/deaktivieren",
            },
            enable_template_tester: {
                type: "checkbox",
                default: true,
                label: "Template-Tester aktivieren",
            },
            enable_download_notification: {
                type: "checkbox",
                default: true,
                label: "Download Benachrichtigung anzeigen",
            },
            auto_download_delay: {
                label: "Verzögerung vor dem Download (in Sekunden)",
                type: "int",
                min: 0,
                max: 300,
                default: 3,
            },
            file_name_template: {
                label: `Dateinamen-Template ${get_summary_html()}`,
                type: "input",
                default: "{album} {sep_v:'-'} {track} {sep_v:'-'} {title}",
            },
        },
        events: {
            save: () => { location.reload() },
        },
        frame: create_configuration_container(),
    });
    await wait_for_gm_config();
}

function get_summary_html() {
    return `
<details>
    <summary>Info: (klick mich)</summary>
    <ul>
        <li>Verfügbare Tags: Alle Tags aus den Metadaten, z. B. {album}, {track}, {title}, {artist}, etc.</li>
        <li>Separatoren:
            <ul>
                <li>{sep_v:"-"} fügt eine beliebige Zeichenkette ein, wenn das <b>vorherige</b> Tag existiert und nicht leer ist.</li>
                <li>{sep_n:"-"} fügt eine beliebige Zeichenkette ein, wenn das <b>nächste</b> Tag existiert und nicht leer ist.</li>
                <li>{sep_mv:"-"} fügt eine beliebige Zeichenkette ein, wenn <b>irgendein vorheriges Tag</b> (bis zum Anfang oder vorherigen Separator) existiert und nicht leer ist.</li>
                <li>{sep_mn:"-"} fügt eine beliebige Zeichenkette ein, wenn <b>irgendein nachfolgendes Tag</b> (bis zum Ende oder nächsten Separator) existiert und nicht leer ist.</li>
            </ul>
        </li>
        <li>Beispiel: "{album} {sep_v:'-'} {title} {sep_n:'['}{track}{sep_n:']'}"</li>
        <li>Bei Separatoren können " oder ' verwendet werden</li>
        <li>Doppelte Leerzeichen werden automatisch entfernt.</li>
        <li>Sonderzeichen in Windows werden durch ähnliche ersetzt.</li>
    </ul>
</details>`;
}

function get_episode_name() {
    let title_element = document.querySelector(".title > h1");
    return title_element?.innerText.trim();
}

function sanitize_filename(filename) {
    let replacements = {
        ":": "꞉", "?": "？", "/": "⧸", "\\": "⧹", "|": "｜",
        "\"": "＂", "*": "＊", "<": "＜", ">": "＞"
    };
    return filename.replace(/[<>:"/\\|?*]/g, char => replacements[char] || char);
}

async function fetch_metadata_and_init_download(url) {
    try {
        // Fetch the episode file
        let response = await fetch(url);
        let blob = await response.blob();
        let array_buffer = await blob.arrayBuffer();

        // Fallback name from the page if metadata is missing
        let alternate_name = get_episode_name();

        // Read metadata from the audio file
        jsmediatags.read(new Blob([array_buffer]), {
            onSuccess: function(tag) {
                let metadata = tag.tags;
                metadata.title = metadata.title || alternate_name;

                // Build the filename based on the template
                let filename = build_filename_from_template(GM_config.get("file_name_template"), metadata);

                prompt(blob, filename);
            },
            onError: function(error) {
                // Use alternate name if metadata reading fails
                let filename = sanitize_filename(alternate_name + ".mp3");

                prompt(blob, filename);
            }
        });
    } catch (error) {
        console.error("Download failed:", error);
    }
}

function prompt(blob, filename) {
    if (GM_config.get("auto_download_enabled"))
        prompt_auto(blob, filename); // normal auto-download
    else
        prompt_manual(blob, filename); // alternative download function
}

// Manual download: just a single button to trigger download
function prompt_manual(blob, filename) {
    let html = `
    <div id="manual_download_box" class="dl-box">
        <span>${filename}</span>
        <button id="manual_download_btn" class="dl-btn dl-btn-now">Download</button>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("manual_download_btn").addEventListener("click", () => {
        start_download(blob, filename);
        document.getElementById("manual_download_box").remove();
    });
}

// Auto download with countdown
async function prompt_auto(blob, filename) {
    let delay = GM_config.get("auto_download_delay");
    if (delay <= 0) {
        start_download(blob, filename);
        return;
    }

    let html = `
    <div id="download_countdown" class="dl-box">
        <span id="countdown_text">Download startet in ${delay} Sekunden</span>
        <button id="download_now" class="dl-btn dl-btn-now">Sofort Download</button>
        <button id="cancel_download" class="dl-btn dl-btn-cancel">Abbruch</button>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    let finished = false;

    // Cancel button → stop countdown and switch to manual download
    document.getElementById("cancel_download").addEventListener("click", () => {
        finished = true;
        clearInterval(countdown_interval);
        document.getElementById("download_countdown").remove();
        prompt_manual(blob, filename); // fallback to manual
    });

    // Download now button → bypass countdown
    document.getElementById("download_now").addEventListener("click", () => {
        if (!finished) {
            finished = true;
            clearInterval(countdown_interval);
            document.getElementById("download_countdown").remove();
            start_download(blob, filename);
        }
    });

    // Countdown logic
    let countdown_span = document.getElementById("countdown_text");
    let countdown_interval = setInterval(() => {
        if (finished) {
            clearInterval(countdown_interval);
            return;
        }
        delay--;
        if (delay > 0) {
            countdown_span.textContent = `Download startet in ${delay} Sekunden`;
        } else {
            clearInterval(countdown_interval);
            document.getElementById("download_countdown")?.remove();
            if (!finished) start_download(blob, filename);
        }
    }, 1000);
}

// Helper to actually trigger download
function start_download(blob, filename) {
    let html = `<a href="${URL.createObjectURL(blob)}" download="${filename}" id="temp_download_link"></a>`
    document.body.insertAdjacentHTML("beforeend", html)
    document.getElementById("temp_download_link").click()
    document.getElementById("temp_download_link").remove()

    if (GM_config.get("enable_download_notification"))
        Swal.fire({
            title: "Download gestartet",
            text: `Die Datei "${filename}" wird heruntergeladen.`,
            icon: "success",
            confirmButtonText: "OK",
            theme: "dark"
        });
}


function template_tester() {
    let test_metadata = {
        album: "Album-Name",
        track: "1",
        title: "Title-Name",
        artist: "Artist-Name",
        year: "2025",
        genre: "Podcast"
    };

    Swal.fire({
        title: "Template Tester",
        html: `
            <div class="template_tester_info">
                <strong>Verfügbare Beispiel-Metadaten-Tags:</strong>
                <ul class="metadata_list">
                    ${Object.keys(test_metadata).map(key => `<li><code>{${key}}</code>: ${test_metadata[key]}</li>`).join("")}
                </ul>
            </div>
            <input id="template_input" class="template_input" placeholder="Gib dein Template ein" value="${GM_config.get('file_name_template')}">
            <div id="template_result" class="template_result"></div>
        `,
        showConfirmButton: false, // Confirm-Button entfernt
        showCancelButton: true,
        cancelButtonText: "Close",
        theme: "dark",
        didOpen: () => {
            const input = document.getElementById("template_input");
            const result = document.getElementById("template_result");

            input.addEventListener("input", () => {
                let template = input.value.trim();
                if (template) {
                    let filename = build_filename_from_template(template, test_metadata);
                    result.textContent = `Result: ${filename}`;
                } else
                    result.textContent = "";
            });
        }
    });
}

function build_filename_from_template(template, metadata) {
    // Extract all placeholders from template
    let fields = template.match(/{([^{}]+)}/g)?.map(match => match.slice(1, -1)) || [];
    let result = template;
    let previous_tag_exists = false; // Tracks if previous tag had value (for separators)

    for (let i = 0; i < fields.length; i++) {
        let temp = fields[i];

        switch (true) {
                // Separator if previous tag exists
            case temp.startsWith("sep_v:"):
                if (i !== 0 && previous_tag_exists) {
                    let separator = temp.split(":")[1].slice(1, -1);
                    result = result.replace(`{${temp}}`, separator);
                    previous_tag_exists = false;
                } else
                    result = result.replace(`{${temp}}`, "");
                break;

                // Separator if any previous tag exists (until start or previous separator)
            case temp.startsWith("sep_mv:"):
                if (i !== 0) {
                    let has_previous_tag = false;
                    for (let j = i - 1; j >= 0; j--) {
                        let prev_temp = fields[j];
                        if (prev_temp.startsWith("sep_")) break;
                        if (metadata[prev_temp] && metadata[prev_temp].trim() !== "") {
                            has_previous_tag = true;
                            break;
                        }
                    }
                    if (has_previous_tag) {
                        let separator = temp.split(":")[1].slice(1, -1);
                        result = result.replace(`{${temp}}`, separator);
                    } else
                        result = result.replace(`{${temp}}`, "");
                } else
                    result = result.replace(`{${temp}}`, "");
                break;

                // Separator if next tag exists
            case temp.startsWith("sep_n:"):
                if (i !== fields.length - 1) {
                    let next_temp = fields[i + 1];
                    if (next_temp && metadata[next_temp] && metadata[next_temp].trim() !== "") {
                        let separator = temp.split(":")[1].slice(1, -1);
                        result = result.replace(`{${temp}}`, separator);
                    } else
                        result = result.replace(`{${temp}}`, "");
                } else
                    result = result.replace(`{${temp}}`, "");
                break;

                // Separator if any following tag exists (until end or next separator)
            case temp.startsWith("sep_mn:"):
                if (i !== fields.length - 1) {
                    let has_next_tag = false;
                    for (let j = i + 1; j < fields.length; j++) {
                        let next_temp = fields[j];
                        if (next_temp.startsWith("sep_")) break;
                        if (metadata[next_temp] && metadata[next_temp].trim() !== "") {
                            has_next_tag = true;
                            break;
                        }
                    }
                    if (has_next_tag) {
                        let separator = temp.split(":")[1].slice(1, -1);
                        result = result.replace(`{${temp}}`, separator);
                    } else
                        result = result.replace(`{${temp}}`, "");
                } else
                    result = result.replace(`{${temp}}`, "");
                break;

            default: // Replace tag with metadata value if available, otherwise remove
                if (metadata[temp] && metadata[temp].trim() !== "") {
                    result = result.replace(`{${temp}}`, metadata[temp]);
                    previous_tag_exists = true;
                } else {
                    result = result.replace(`{${temp}}`, "");
                    previous_tag_exists = false;
                }
                break;
        }
    }

    // Cleanup: collapse multiple spaces and trim
    result = result.replace(/\s+/g, " ").trim();
    return sanitize_filename(result) + ".mp3";
}

GM_addStyle(`
.dl-box {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2e2e2e;
    color: #fff;
    border: 2px solid darkgray;
    padding: 10px 15px;
    border-radius: 8px;
    z-index: 9999;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    font-family: sans-serif;
    animation: dl-box 1s ease forwards;
}

@keyframes dl-box {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.dl-btn {
    margin-left: 10px;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.dl-btn-now {
    background: seagreen;
    color: #fff;
}

.dl-btn-now:hover {
    background: mediumseagreen;
}

.dl-btn-cancel {
    background: crimson;
    color: #fff;
}

.dl-btn-cancel:hover {
    background: firebrick;
}

.template_tester_info {
    text-align: left;
    margin-bottom: 10px;
}

.metadata_list {
    list-style-type: none;
    padding-left: 0;
}

.template_input {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
}

.template_result {
    margin-top: 10px;
    color: #fff;
    font-size: 14px;
}
`);