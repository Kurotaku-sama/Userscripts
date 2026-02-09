[![Ko-fi](https://img.shields.io/badge/If%20you%20like%20my%20work%20feel%20free%20to%20support%20me%20on%20Kofi-8A2BE2?style=for-the-badge&logo=ko-fi&labelColor=9370DB&link=https://ko-fi.com/kurotaku1337)](https://ko-fi.com/kurotaku1337)

# StreamElements improvements

[![Install](https://img.shields.io/badge/install-userscript-purple?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/StreamElements_improvements/script.user.js)

---

## Description

This userscript improves the functionality of StreamElements store pages by adding filters, advanced sorting, and UI enhancements. It allows you to hide specific items, automatically gray out sold-out entries. Extra sidebar controls and buttons make interaction smoother.. All features are fully configurable through the settings.

---

## Features

### Item Visibility

- **Hide items by name**<br>
  Specify item names (one per line) to hide them from the store.<br>
  This applies globally across **all** StreamElements stores — not per channel.
- **Hide items by default**<br>
  Automatically hide your configured items on page load.
- **Hide sold out items**<br>
  Optionally hide items that are out of stock.
- **Hide subscriber-only items**<br>
  Hides items that are exclusive to subscribers.
- **Gray out hidden items**<br>
  Store items get a gray filter.
- **Gray out sold out items**<br>
  Store items get a gray filter.

### Sorting

- **StreamElements default Sorting**<br>
  ~~Set the store's default sorting to: Newest, Subscriber only, Cost, or leave it as-is.~~<br>
  Removed due to changes on their frontend

- **Sort by price (ascending/descending)**<br>
  Adds price-based sorting that can override the default.

#### Note regarding the Sorting:
- ~~If *"StreamElements default Sorting"* is not "Default", it takes precedence over ascending/descending.~~
- "Ascending" dominates over "Descending".
- If "Cost" and "Ascending" are selected, it will work.
- If either checkbox is enabled, normal sorting may not work!
- I recommend using the checkboxes for faster sorting!

### Miscellaneous

- **Steam search button**<br>
  Adds a button to each item for a quick Steam lookup.
- **Quick-hide button**<br>
  Allows you to hide an item directly from the UI via a small button. Remember to save your changes afterward!
- **Full-width layout**<br>
  The script forces the store layout to use the full width of your screen, removing StreamElements default size constraints.<br>
  Especially useful on larger displays where the default layout wastes a lot of space. This option is always active.

![Settings](settings.png)

---

## Sidebar Features

The script adds a sidebar panel to the left of the StreamElements store under the normal sidebar, giving you fast access to additional tools and toggles:

- **Toggle visibility options**<br>
  Instantly show or hide:
  - Hidden items
  - Sold out items
  - Subscriber-only items

- **Get Itemlist**<br>
  Outputs a plain-text list of all visible item names to your browser console for easy copy/paste into the hide list.

- **Show Items as Table**<br>
  Replaces the store view with a sortable table containing:
  - **Name**
  - **Description**
  - **Price**
  - **Stock**

  You can also download the table as a **CSV file** for further analysis or record-keeping.

- **Show Redemption History**<br>
  Opens your StreamElements redemption history in a new tab with a single click.

![Sidebar](sidebar.png)

---

## Important

If you hide items directly using the eye icon in the store UI, make sure to **save the changes** in the config popup afterward.
Otherwise, the hidden list will not persist after reloading the page.

Unlike most of my other scripts, this one also provides a **dedicated config button in the sidebar**, making it easier to access and manage your settings at any time with one click.

---

## Known Issues

StreamElements uses a dynamic frontend, meaning using the navigation does not fully reload the site.

- The script will only initialize if the store page is opened directly — such as through a bookmark or by refreshing the browser tab.