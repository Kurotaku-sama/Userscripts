// ==UserScript==
// @name            MyFigureCollection Image Downloader
// @namespace       https://kurotaku.de
// @version         1.0
// @description     Automatically/Manually download item page images from MFC as a ZIP or single files.
// @author          Kurotaku
// @license         CC BY-NC-SA 4.0
// @match           https://myfigurecollection.net/*
// @icon            https://static.myfigurecollection.net/ressources/assets/webicon.png
// @updateURL       https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/MyFigureCollection_Image_Downloader/script.user.js
// @downloadURL     https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/MyFigureCollection_Image_Downloader/script.user.js
// @require         https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/libraries/kuros_library.js
// @require         https://cdn.jsdelivr.net/npm/sweetalert2
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @grant           GM_unregisterMenuCommand
// @grant           GM_download
// @grant           GM_xmlhttpRequest
// @connect         static.myfigurecollection.net
// @run-at          document-end
// ==/UserScript==

let menu_ids = [];

(async function() {
    const is_item_page = window.location.pathname.startsWith('/item/');

    print("[MFC Downloader] Initializing...");
    init_settings();
    update_menu_commands();

    if (is_item_page) {
        insert_download_button();
        if (GM_getValue("mfc_autodownload", false)) {
            print("[MFC Downloader] Autodownload active...");
            execute_logic();
        }
    }
})();

function init_settings() {
    const defaults = {
        "mfc_autodownload": false,
        "mfc_primary_only": false,
        "mfc_use_folders": true,
        "mfc_zip_subfolder": true,
        "mfc_use_item_id": true,
        "mfc_use_padding": true
    };
    for (const [key, val] of Object.entries(defaults))
        if (GM_getValue(key) === undefined) GM_setValue(key, val);
}

function update_menu_commands() {
    const is_item_page = window.location.pathname.startsWith('/item/');
    menu_ids.forEach(id => GM_unregisterMenuCommand(id));
    menu_ids = [];

    const auto         = GM_getValue("mfc_autodownload");
    const primary_only = GM_getValue("mfc_primary_only");
    const use_folders  = GM_getValue("mfc_use_folders");
    const zip_sub      = GM_getValue("mfc_zip_subfolder");
    const use_item_id  = GM_getValue("mfc_use_item_id");
    const use_padding  = GM_getValue("mfc_use_padding");

    menu_ids.push(GM_registerMenuCommand(`Autodownload: ${auto ? "✅ ON" : "❌ OFF"}`, () => {
        GM_setValue("mfc_autodownload", !auto);
        update_menu_commands();
    }));

    if(is_item_page)
        menu_ids.push(GM_registerMenuCommand(`Download Now 📥`, () => execute_logic()));

    menu_ids.push(GM_registerMenuCommand(`Mode: ${primary_only ? "🎯 Primary Only" : "🖼️ All Images"}`, () => {
        GM_setValue("mfc_primary_only", !primary_only);
        update_menu_commands();
    }));

    menu_ids.push(GM_registerMenuCommand(`Format: ${use_folders ? "📁 ZIP" : "📄 Single Files"}`, () => {
        GM_setValue("mfc_use_folders", !use_folders);
        update_menu_commands();
    }));

    if (use_folders)
        menu_ids.push(GM_registerMenuCommand(`ZIP Content: ${zip_sub ? "📂 Subfolder" : "📄 Direct files"}`, () => {
            GM_setValue("mfc_zip_subfolder", !zip_sub);
            update_menu_commands();
        }));

    menu_ids.push(GM_registerMenuCommand(`Naming: ${use_item_id ? "🆔 Incl. Item ID" : "🔢 Just Numbers"}`, () => {
        GM_setValue("mfc_use_item_id", !use_item_id);
        update_menu_commands();
    }));

    menu_ids.push(GM_registerMenuCommand(`Padding (01, 001): ${use_padding ? "✅ YES" : "❌ NO"}`, () => {
        GM_setValue("mfc_use_padding", !use_padding);
        update_menu_commands();
    }));
}

function get_item_id() {
    const match = window.location.pathname.match(/\/item\/(\d+)/);
    return match ? match[1] : "unknown";
}

async function execute_logic() {
    print("[MFC Downloader] Executing logic...");
    if (GM_getValue("mfc_primary_only")) await download_primary_image();
    else await download_all_images();
}

async function download_primary_image() {
    const img = document.querySelector('.item-picture .main > img');
    if (!img) return;

    const full_src = img.src.replace('/1/', '/2/');
    const ext = get_extension(full_src);
    const item_id = get_item_id();
    const file_name = GM_getValue("mfc_use_item_id") ? `${item_id}_primary.${ext}` : `primary.${ext}`;

    if (!GM_getValue("mfc_use_folders")) GM_download({ url: full_src, name: file_name });
    else await download_images_zip([{url: full_src, name: file_name}], get_clean_folder_name());
}

async function download_all_images() {
    print("[MFC Downloader] Fetching metadata...");
    const meta = document.querySelector('meta[name="pictures"]');

    if (!meta) {
        Swal.fire({
            title: "Error",
            text: "Could not find image metadata. Try clicking the main image once.",
            icon: "error",
            theme: "dark",
            backdrop: true
        });
        return;
    }

    const ordered_urls = get_ordered_urls(meta);
    const item_id = get_item_id();
    const use_padding = GM_getValue("mfc_use_padding");
    const pad_amount = ordered_urls.length.toString().length;

    const files = ordered_urls.map((url, i) => {
        const ext = get_extension(url);
        const index_str = use_padding ? String(i + 1).padStart(pad_amount, '0') : String(i + 1);
        const name = GM_getValue("mfc_use_item_id") ? `${item_id}_${index_str}.${ext}` : `${index_str}.${ext}`;
        return { url, name };
    });

    if (!GM_getValue("mfc_use_folders")) {
        for (const f of files) {
            GM_download({ url: f.url, name: f.name });
            await sleep(150);
        }
    } else await download_images_zip(files, get_clean_folder_name());
}

async function load_jszip() {
    if (typeof JSZip !== 'undefined') return;
    return new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function download_images_zip(files, zip_name) {
    await load_jszip();
    const zip = new JSZip();
    const use_subfolder = GM_getValue("mfc_zip_subfolder", true);
    let progress = 0;
    const total = files.length;

    Swal.fire({
        title: "Fetching images...",
        html: `<b>Progress:</b> <progress value="0" max="${total}" id="mfc-prog"></progress> <span id="mfc-val">0</span>/${total}`,
        allowOutsideClick: false,
        showConfirmButton: false,
        theme: "dark",
        backdrop: true,
        didOpen: () => Swal.showLoading()
    });

    for (let f of files) {
        try {
            const blob = await fetch_image_blob(f.url);
            const zip_path = use_subfolder ? `${zip_name}/${f.name}` : f.name;
            zip.file(zip_path, blob);
            progress++;
            const prog_bar = document.getElementById('mfc-prog');
            const prog_val = document.getElementById('mfc-val');
            if (prog_bar) prog_bar.value = progress;
            if (prog_val) prog_val.innerText = progress;
        } catch (e) {
            print(`[MFC Downloader] Failed: ${f.name}`);
        }
    }

    const content = await zip.generateAsync({type: 'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${zip_name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    Swal.fire({
        title: "Download Complete!",
        text: `${total} images have been packed into ${zip_name}.zip`,
        icon: "success",
        theme: "dark",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        backdrop: true
    });
}

function fetch_image_blob(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET", url: url, responseType: "blob",
            onload: r => resolve(r.response),
            onerror: r => reject(r)
        });
    });
}

function get_ordered_urls(meta) {
    const pics = JSON.parse(decodeURIComponent(meta.content));
    let urls = pics.map(p => String(p.src).replace('/1/', '/2/'));
    const main = document.querySelector(".item-picture .main img")?.src.replace('/1/', '/2/');

    if (main) {
        const idx = urls.indexOf(main);
        if (idx > 0) {
            urls.splice(idx, 1);
            urls.unshift(main);
        }
    }
    return urls;
}

function get_extension(url) {
    let ext = url.split('.').pop().split('?')[0].toLowerCase();
    return ext === 'jpeg' ? 'jpg' : ext;
}

function get_clean_folder_name() {
    const el = document.querySelector('#content h1.title');
    return el ? el.innerText.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim() : 'MFC_Download';
}

function insert_download_button() {
    wait_for_element("#wide .item-object .item-picture").then(container => {
        if (document.getElementById('mfc-download-btn')) return;
        container.parentNode.insertAdjacentHTML('beforeend', `<button id="mfc-download-btn">Download Images 🖼️</button>`);
        document.getElementById('mfc-download-btn').addEventListener('click', () => execute_logic());
    });
}

GM_addStyle(`
#mfc-download-btn {
    display: block;
    margin: auto;
}
`);