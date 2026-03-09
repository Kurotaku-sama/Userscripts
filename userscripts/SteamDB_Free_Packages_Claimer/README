[![Ko-fi](https://img.shields.io/badge/If%20you%20like%20my%20work%20feel%20free%20to%20support%20me%20on%20Kofi-8A2BE2?style=for-the-badge&logo=ko-fi&labelColor=9370DB&link=https://ko-fi.com/kurotaku1337)](https://ko-fi.com/kurotaku1337)

# SteamDB Free Packages Claimer

[![Install](https://img.shields.io/badge/install-userscript-purple?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/SteamDB_Free_Packages_Claimer/script.user.js)

---

## Description

This userscript automates the claiming of free licenses on [**steamdb.info/freepackages/**](https://steamdb.info/freepackages/).

The script automatically interacts with the SteamDB interface to trigger activations and cleans up the list by ignoring packages that cannot be claimed.

---

## Features

- **Automated Filtering & Claiming:** The script automatically selects your preferred filter (e.g., all, games, or demos) upon loading. Once the list is ready, it automatically triggers the "Activate" button to start the claiming process.
- **URL Parameter Trigger (Optional):** You can configure a specific keyword (e.g., `autoclaim`). If set, the script will **only** start its work if that parameter is present in the URL (e.g., `.../freepackages/?autoclaim`). This allows you to visit the site normally without triggering the automation unless intended.
- **Duplicate Protection:** Includes a built-in check to prevent multiple script instances from running simultaneously. If a duplicate tab is detected, it will automatically close to avoid conflicts.
- **Smart Cleanup:** Automatically excludes or ignores packages that fail to activate (such as those missing required base games) so they do not clutter your list in the future.
- **Auto-Exit:** Closes the tab automatically once the process is finished, with configurable timers for both success and error states.
- **Login Check:** Verifies your SteamDB session and stops execution automatically if you are not logged in.

---

## Configuration

 - **Default Filter:** Set your preferred filter (all, owned, all-no-demos, games, demos, others).
- **Required URL Parameter:** Enter a keyword (e.g., `start`) to make the script wait for this parameter in the URL. Leave empty to always run on the `/freepackages/` page.
- **Startup Delays:** Custom wait times for page initialization and filter changes.
- **Blacklist Settings:** Enable or disable the automatic exclusion of failed packages.
- **Automation:** Configure if and when the tab should close after success, error, or if nothing was found to claim.

---

## Troubleshooting: Auto-Close not working?

Modern browsers may block scripts from closing tabs automatically. To fix this:

### **Firefox**
1. Enter **`about:config`** in the address bar.
2. Search for: **`dom.allow_scripts_to_close_windows`**.
3. Set it to **`true`**.

### **Chromium Based Browsers (Chrome / Edge / Brave)**
Chromium-based browsers strictly limit `window.close()`. If you open the page manually, you may need to find a browser-specific workaround or extension to allow the script to close the tab.

---

## Screenshot

![Settings](settings.png)