// Override print() so I can use print() instaed console.log() like in Python
window.print = (...args) => console.log(...args)

if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("About", () => {
        Swal.fire({
            title: GM_info.script.name,
            html: `
                <strong>Version: ${GM_info.script.version}</strong><br>
                <strong>Author: Kurotaku</strong><br>
                <strong>Homepage:</strong> <a href="https://kurotaku.de" target="_blank">kurotaku.de</a><br><br>
                <strong>Check out my other Userscripts and please leave a star if you like my work:</strong><br>
                <a href="https://github.com/Kurotaku-sama/Userscripts" target="_blank">GitHub</a><br><br>
                If you encounter any issues, feel free to DM me on Discord: <b>Kurotaku</b><br>
                ${ko_fi}
                `,
            theme: "dark",
            backdrop: true,
        });
    });
}

function sort_alphabetically(text) {
    return text.split('\n').sort().join('\n');
}

function trim_spaces(text) {
    let lines = text.split("\n");
    let temp = [];
    lines.forEach((item) => {
        temp.push(item.trim());
    });
    return temp.join("\n");
}

function download_table_as_csv(id) {
    let table_id = id, separator = ';'

    // Select rows from table_id
    var rows = document.querySelectorAll('table#' + table_id + ' tr');
    // Construct csv
    var csv = [];
    for (var i = 0; i < rows.length; i++) {
        var row = [], cols = rows[i].querySelectorAll('td, th');
        for (var j = 0; j < cols.length; j++) {
            // Clean innertext to remove multiple spaces and jumpline (break csv)
            var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
            // Escape double-quote with double-double-quote (see https://stackoverflow.com/questions/17808511/properly-escape-a-double-quote-in-csv)
            data = data.replace(/"/g, '""');
            // Push escaped string
            row.push('"' + data + '"');
        }
        csv.push(row.join(separator));
    }
    var csv_string = csv.join('\n');
    // Download it
    var filename = 'export_' + table_id + '_' + new Date().toLocaleDateString() + '.csv';
    var link = document.createElement('a');
    link.style.display = 'none';
    link.setAttribute('target', '_blank');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_string));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function animate_number_counter(element, start, end, duration = 1000) {
    const start_time = performance.now();

    const animate = (time) => {
        const progress = Math.min((time - start_time) / duration, 1);
        element.textContent = `${Math.floor(start + (end - start) * progress)}`;
        if (progress < 1) requestAnimationFrame(animate);
    };
    // Start the animation
    requestAnimationFrame(animate);
    // Wait for the animation to finish
    await sleep(duration);
}

// Waits for GM_config to be defined before proceeding, preventing errors if GM_config isn't ready yet
function wait_for_gm_config() {
    return new Promise(resolve => {
        const check_interval = setInterval(() => {
            if (typeof GM_config !== "undefined") {
                clearInterval(check_interval);
                resolve();
            }
        }, 50);
    });
}

// --------------------------
// Randomizer
// --------------------------
function random_number(min = 0, max = Number.MAX_SAFE_INTEGER) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random_string(length, characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    const characters_length = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * characters_length));
        counter += 1;
    }
    return result;
}

function randomize_case(text) {
    return text.split('').map(function(letter) {
        return Math.random() < 0.5 ? letter.toUpperCase() : letter.toLowerCase();
    }).join('');
}

// --------------------------
// Sleep functions
// --------------------------
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function sleep_s(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function sleep_m(minutes) {
    return new Promise(resolve => setTimeout(resolve, minutes * 1000 * 60));
}

function sleep_h(minutes) {
    return new Promise(resolve => setTimeout(resolve, minutes * 1000 * 60 * 60));
}

// --------------------------
// Element observer
// --------------------------
function wait_for_element(selector, container = document.documentElement) {
    return new Promise(resolve => {
        const node = container.querySelector(selector)
        if (node) return resolve(node)

        const observer = new MutationObserver(() => {
            const el = container.querySelector(selector)
            if (el) {
                observer.disconnect()
                resolve(el)
            }
        })

        observer.observe(container, {
            childList: true,
            subtree: true
        })
    })
}

function wait_for_element_to_disappear(selector, container = document.documentElement) {
    return new Promise(resolve => {
        const node = container.querySelector(selector)
        if (!node) return resolve()

        const observer = new MutationObserver(() => {
            const el = container.querySelector(selector)
            if (!el) {
                observer.disconnect()
                resolve()
            }
        })

        observer.observe(container, {
            childList: true,
            subtree: true
        })
    })
}


const ko_fi = `
<a href="https://ko-fi.com/kurotaku1337" target="_blank" rel="noopener" class="kofi-button">
    <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi cup" class="kofi-icon" />
    <span class="kofi-text">If you like my work feel free<br>to support me on Ko-fi</span>
    <div class="kofi-shine"></div>
</a>

<style>
  .kofi-button {
    margin-top: 15px;
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    background: linear-gradient(135deg, #6a1292, #c850c0);
    border-radius: 12px;
    padding: 10px 20px;
    color: white;
    font-size: 13px;
    font-family: "Segoe UI", sans-serif;
    font-weight: bold;
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    overflow: hidden;
  }

  .kofi-button:visited {
    text-decoration: none;
    color: white;
  }

  .kofi-button:hover {
    transform: translateY(-4px) scale(1.03) rotateX(5deg);
    box-shadow: 0 12px 24px rgba(0,0,0,0.25);
    text-decoration: none;
    color: white;
  }

  .kofi-icon {
    height: 32px;
    width: auto;
    display: block;
    filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
    transition: transform 0.3s ease-in-out;
  }

  .kofi-text {
    position: relative;
    text-align: center;
    color: white;
  }

  .kofi-shine {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(120deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
    transform: rotate(25deg);
    pointer-events: none;
    animation: kofi_shine 3s infinite linear;
  }

  @keyframes kofi_shine {
    0% { transform: translateX(-100%) rotate(25deg); }
    100% { transform: translateX(100%) rotate(25deg); }
  }

  @keyframes kofi_shake_icon {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    50% { transform: rotate(10deg); }
    75% { transform: rotate(-10deg); }
    100% { transform: rotate(0deg); }
  }

  .kofi-button:hover .kofi-icon {
    animation: kofi_shake_icon 2s ease-in-out infinite;
  }

  @keyframes kofi_shake_icon {
    0% { transform: rotate(0deg); }
    10% { transform: rotate(-10deg); }
    20% { transform: rotate(10deg); }
    30% { transform: rotate(-10deg); }
    40% { transform: rotate(10deg); }
    50% { transform: rotate(0deg); }
    60% { transform: rotate(0deg); }
    100% { transform: rotate(0deg); }
  }
</style>
`;

// --------------------------
// GM_config Functions
// --------------------------

/**
 * Smart migration: If only one key exists in the storage, it migrates that key regardless of its name.
 * If multiple keys exist, it defaults to the provided old_id (usually 'configuration').
 * @param {string} new_id - The target configuration ID.
 * @param {string} old_id - The fallback source ID (defaults to 'configuration').
 */
async function migrate_config_id(new_id, old_id = "configuration") {
    // If new config already exists, migration is considered done
    const new_exists = GM_getValue(new_id, null);
    if (new_exists) return;

    const all_keys = GM_listValues();
    let source_id = old_id;

    // Smart logic: If exactly one key exists and it's not our target, use that one
    if (all_keys.length === 1 && all_keys[0] !== new_id) {
        source_id = all_keys[0];
        print(`[GM_config Migration] Only one key found (${source_id}). Using it as source.`);
    }

    const old_raw = GM_getValue(source_id, null);
    if (!old_raw) return;

    try {
        // Move data and wipe source immediately
        GM_setValue(new_id, old_raw);
        GM_deleteValue(source_id);
        print(`[GM_config Migration] Data successfully moved from ${source_id} to ${new_id}.`);
    } catch (e) {
        print(`[GM_config Migration] Error during move: ${e}`);
    }
}

// Removes keys from storage that are not defined in the current GM_config.init
// Not required but in some cases it could be needed
// To call this method correctly put it underneath: await wait_for_gm_config();
// await cleanup_gm_config(config_id);
async function cleanup_gm_config(config_id, config_obj) {
    // Safety check for GM_config instance
    if (!config_obj || !config_obj.fields) {
        print(`[Cleanup] Aborted: GM_config fields not found.`);
        return;
    }

    const stored_raw = GM_getValue(config_id, null);
    if (!stored_raw) return;

    try {
        const stored_data = JSON.parse(stored_raw);
        const active_keys = Object.keys(config_obj.fields);
        let cleaned_data = {};
        let has_changed = false;

        for (const key in stored_data) {
            // Only keep if the key is actually defined in the current script version
            if (active_keys.includes(key))
                cleaned_data[key] = stored_data[key];
            else {
                has_changed = true;
                print(`[Cleanup] Removing obsolete field: ${key}`);
            }
        }

        if (has_changed)
            GM_setValue(config_id, JSON.stringify(cleaned_data));
    } catch (e) {
        print(`[Cleanup] Error during cleanup: ${e}`);
    }
}

async function debug_list_all_configs() {
    print("--- [DEBUG] Listing all GM Storage Keys ---");

    // Get all keys from the GreaseMonkey/Tampermonkey storage
    const keys = GM_listValues();

    if (keys.length === 0) {
        print("No configurations found in storage.");
        return;
    }

    for (const key of keys) {
        const val = GM_getValue(key);
        try {
            // Try to parse as JSON for better readability in console
            const parsed = JSON.parse(val);
            console.log(`Key: %c${key}`, "color: #00ff00; font-weight: bold;", parsed);
        } catch (e) {
            // If it's not JSON (like a simple boolean or string), just print it
            console.log(`Key: %c${key}`, "color: #aaa;", val);
        }
    }

    print("--- [DEBUG] End of list ---");
}

// --------------------------
// GM_config shadow container with styling
// --------------------------
function create_configuration_container() {
    const style = `
        :host {
            all: initial;
            font-family: Arial, Roboto, sans-serif;

            /* Main colors */
            --main-bg-color: #2e2e2e; /* dark gray background for container */
            --main-border-color: gray; /* border for container and inputs */
            --main-accent-color: #ffffff; /* for checkboxes and buttons */
            --text-color: #ffffff; /* general text color */
            --link-text-color: #ffff00; /* color for links */
            --section-bg-color: #1f1f1f; /* darker for section headers */
            --gap-size: 10px; /* spacing between buttons and reset */

            /* Input colors */
            --input-text-color: #ffffff;
            --input-bg-color: transparent;
            --input-border-color: var(--main-border-color);

            /* Textarea colors */
            --textarea-text-color: #ffffff;
            --textarea-bg-color: transparent;
            --textarea-border-color: var(--main-border-color);

            /* Checkbox colors */
            --checkbox-bg-color: var(--main-bg-color);
            --checkbox-border-color: var(--main-border-color);
            --checkbox-accent-color: var(--main-accent-color);

            /* Button colors */
            --button-text-color: #ffffff;
            --button-bg-color: #1f1f1f;
            --button-border-color: #ffffff;
        }

        /* Backdrop styling */
        #custom_backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            display: none;
        }

        :host > div:not(#custom_backdrop) {
            padding: 20px !important;
            height: auto !important;
            max-height: 600px !important;
            max-width: 500px !important;
            background-color: var(--main-bg-color) !important;
            border: 2px solid var(--main-border-color) !important;
            color: var(--text-color) !important;
            font-size: 15px;
            /* Center the panel */
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 9999 !important;
        }

        /* Header */
        div[id$="_header"] {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            color: var(--text-color);
        }

        /* Yellow links inside section holders */
        .section_header_holder a {
            color: var(--link-text-color);
            text-decoration: none;
        }

        /* Inputs and textareas */
        textarea,
        input[type="text"] {
            background-color: var(--input-bg-color);
            border: 1px solid var(--input-border-color);
            padding: 5px;
            width: 100%;
            box-sizing: border-box;
            margin-top: 5px;
            color: var(--input-text-color);
        }

        textarea {
            min-height: 80px;
            resize: vertical;
            color: var(--textarea-text-color);
            background-color: var(--textarea-bg-color);
            border: 1px solid var(--textarea-border-color);
        }

        /* Checkboxes */
        input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            width: 16px;
            height: 16px;
            border: 2px solid var(--checkbox-border-color);
            background-color: var(--checkbox-bg-color);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
            margin: 0 10px 0 0;
            vertical-align: text-bottom;
        }

        input[type="checkbox"]:checked::after {
            content: '';
            position: absolute;
            left: 3px;
            width: 6px;
            height: 10px;
            border-bottom: solid var(--checkbox-accent-color);
            border-right: solid var(--checkbox-accent-color);
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
            box-sizing: border-box;
        }

        /* Checkboxes Labels multi-line alignment*/
        .config_var input[type="checkbox"] {
            vertical-align: top;
        }

        .config_var input[type="checkbox"] + label {
            display: inline-block;
            max-width: calc(100% - 30px);
        }

        /* Section headers */
        .section_header {
            background-color: var(--section-bg-color);
            font-weight: bold;
            text-align: center;
            padding: 5px 0;
            border-top: 3px solid var(--main-accent-color);
            border-bottom: 3px solid var(--main-accent-color);
            margin: 10px 0;
            color: var(--text-color);
        }

        /* Config variables */
        .config_var {
            margin: 10px 0 5px;
        }

        /* Buttons holder */
        div[id$="_buttons_holder"] {
            display: flex;
            justify-content: center;
            gap: var(--gap-size);
            margin-top: 30px;
            flex-wrap: wrap;
        }

        /* Save/Close buttons */
        input[type="button"] {
            display: block !important;
            margin: auto !important;
        }

        .saveclose_buttons,
        input[type="button"],
        [id$="_resetLink"] {
            font-size: 15px;
            display: inline-block;
            color: var(--button-text-color);
            background-color: var(--button-bg-color);
            border: solid var(--button-border-color) 1px;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            margin-bottom: var(--gap-size);
        }
    `;

    // Create host element for Shadow DOM
    const host = document.createElement("div");
    document.body.appendChild(host);

    // Attach shadow root in 'open' mode
    const shadow_root = host.attachShadow({mode: "open"});

    // Create backdrop element inside shadow root
    const backdrop = document.createElement("div");
    backdrop.id = "custom_backdrop";
    shadow_root.appendChild(backdrop);

    // Create container for GM_config inside the shadow root
    const container = document.createElement("div");
    container.id = "config_wrapper";
    container.style.display = "none"; // Hidden by default
    shadow_root.appendChild(container);

    // Inject styles directly into the Shadow DOM
    const style_tag = document.createElement("style");
    style_tag.textContent = style;
    shadow_root.appendChild(style_tag);

    // Block page hotkeys while panel is open
    const block_hotkeys = (e) => e.stopPropagation();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === "style") {
                const is_visible = container.style.display !== "none";

                // Toggle backdrop visibility based on container state
                backdrop.style.display = is_visible ? "block" : "none";

                if (is_visible) {
                    // Start blocking keyboard events when menu is open
                    window.addEventListener("keydown", block_hotkeys, true);
                    window.addEventListener("keyup", block_hotkeys, true);
                    window.addEventListener("keypress", block_hotkeys, true);
                } else {
                    // Stop blocking when menu is closed
                    window.removeEventListener("keydown", block_hotkeys, true);
                    window.removeEventListener("keyup", block_hotkeys, true);
                    window.removeEventListener("keypress", block_hotkeys, true);
                }
            }
        });
    });

    observer.observe(container, { attributes: true, attributeFilter: ["style"] });

    return container;
}