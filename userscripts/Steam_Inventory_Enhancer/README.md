**If you like my work feel free to support me on:**<br>
[![PayPal](https://img.shields.io/badge/PayPal-8A2BE2?style=for-the-badge&logo=paypal&labelColor=9370DB)](https://paypal.me/kurotaku1337)
[![Ko-fi](https://img.shields.io/badge/Kofi-8A2BE2?style=for-the-badge&logo=ko-fi&labelColor=9370DB)](https://ko-fi.com/kurotaku1337)

# Steam Inventory Enhancer

[![Install](https://img.shields.io/badge/install-userscript-purple?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Steam_Inventory_Enhancer/script.user.js)

---

## Description

This userscript enhances the Steam inventory experience by adding essential quality-of-life features. It provides a customizable sidebar for better navigation, powerful mass stacking/unstacking tools, a favorites system, a comprehensive filtering and sorting menu, an integrated item counter for ownership tracking across the market and inventory, and ASF integration for seamless 2FA management.

![Inventory Preview](inventory.png)

---

## Features

### Customizable Sidebar
- **Dynamic Layout:** Transform the standard inventory navigation into a flexible sidebar.
- **Adjustable Rows:** Manually choose between **1 to 4 rows** in the settings to perfectly fit your screen resolution and number of inventories.

### Item Stacker & Unstacker
- **Mass Stacking:** Merge all identical items in your inventory with a single click.
- **Smart Stacking:** Set a maximum stack size limit to organize items into specific quantities.
- **Unstacking:** Split large stacks of items back into individual units automatically.
- **Progress Tracking:** Real-time dual progress bar showing current item status and overall completion.

### Favorites System
- **Pin your Games:** Add or remove games from your favorites with a single click on the star icon.
- **Dedicated Section:** Favorited inventories are cloned into a separate, easy-to-access section at the top.
- **Custom Sorting:** Sort your pinned inventories by Name, Item Amount, or the date they were added.

### Inventory Filtering
- **Advanced Search:** Find specific game inventories instantly with search field.
- **Search by AppID:** Toggleable option in settings to search inventories by their AppID.
- **Hide Owned Inventories:** New toggle button to hide all inventories you already own (compares with your own inventory list).
- **Amount Range:** Filter inventories by item count using Min and Max fields.
- **Multi-Sort:** Toggle between Name and Amount sorting (Ascending ▴ / Descending ▾).
- **Quick Reset:** Clear individual filters or reset everything with a single click.
- **Override CTRL + F Hotkey:** The hotkey will focus automatically the search field instead the browsers native search.

### Itemcounter (Owned Indicator)
- **Ownership Tracking:** Instantly see how many copies of an item you already own directly in your inventory, market listings, and search results.
- **Caching:** Inventory data is stored locally with a configurable expiration time to reduce Steam API load and ensure fast display.
- **App Blacklist:** Exclude specific AppIDs (e.g., games with thousands of items) from being tracked.
- **Toggleable:** Separate settings to enable or disable the counter for the inventory page, market listings, or search results individually.

### ASF Integration (IPC)
- **Remote 2FA:** Accept or deny all mobile confirmations directly from the Steam inventory "More" menu.
- **Configurable:** Works with your local or remote ArchiSteamFarm instance via IPC.

---

## Settings

![Settings](settings.png)

---

## How it works

1. **Sidebar:** The script restructures the inventory navigation tabs into a grid layout based on your row selection.
2. **Stacking:** Uses the Steam WebAPI to calculate and execute "Combine" operations with built-in delays to prevent rate limits.
3. **Favorites:** Saves selected AppIDs to local storage and highlights them with a custom star icon.
4. **Filtering:** Caches inventory nodes and applies real-time CSS filtering and DOM reordering based on user input.
5. **Itemcounter:** Fetches the full inventory for the current AppID and caches the results to display ownership counts. If the item count is 0, no data is cached to ensure accuracy on the next load.
6. **ASF:** Sends commands via `GM_xmlhttpRequest` to your ASF IPC interface.

---

## Important Security Warnings (ASF)

- **2FA Risk:** Using the ASF option is always a risk, as it theoretically allows skipping 2nd Factor steps.
- **Credential Storage:** Your ASF IPC password is stored in the userscript's local storage.
- **Connection Security:** Use **HTTPS** for your ASF IPC connection to prevent "Man-in-the-Middle" attacks.

---

## Notes

- **Manual Adjustment:** You must manually set the number of rows (1-4) in the settings to match your display size.
- **Inspiration:** Inspired by the works of **Chr_** and **SteamDB**.
- **SteamDB Conflict:** Disable the **SteamDB sidebar** in their extension settings to prevent layout issues.