[![Ko-fi](https://img.shields.io/badge/If%20you%20like%20my%20work%20feel%20free%20to%20support%20me%20on%20Kofi-8A2BE2?style=for-the-badge&logo=ko-fi&labelColor=9370DB&link=https://ko-fi.com/kurotaku1337)](https://ko-fi.com/kurotaku1337)

# Highlight and Filter Searchengine Results

[![Install](https://img.shields.io/badge/install-userscript-purple?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/Highlight_and_Filter_Searchengine_results/script.user.js) [![GitHub](https://img.shields.io/badge/github-purple?style=for-the-badge&logo=github)](https://github.com/Kurotaku-sama/Userscripts/tree/main/userscripts/Highlight_and_Filter_Searchengine_results)

---

## Description

This userscript enhances search results on multiple search engines by highlighting domains from your preferred websites, removing blacklisted results, and optionally filtering special sections.
On Google, it can also rearrange or hide search tabs to maintain your preferred order.

---

## Features

- **Highlighted Results Section** - Moves matched domains to a dedicated container at the top of search results, making them more prominent.
- **Custom Styling** - Apply your chosen CSS styles to highlighted results.
- **Flexible Matching** - Works with partial domain matches (e.g., "steamcommunity" matches "steamcommunity.com").
- **Order Preservation** - Maintains your configured domain priority order.
- **Blacklist Filtering** - Remove results from blacklisted domains. Works the same way as **Highlight Domain Terms**, supporting optional site-specific prefixes.
- **Search Tabs Management** - On Google, rearrange or hide specific tabs. This ensures Google does not reorder tabs or add unnecessary ones for each search.
- **Startpage Sponsorblock** - Hides sponsored (ad) results on Startpage.
- **Special Sections Removal** - Remove tables, sitelinks, or other special sections on Google or DuckDuckGo.
- **Supports Multiple Search Engines** - See [Supported Search Engines](#supported-search-engines).
  If you need this script to support another search engine, contact me.

---

## Supported Search Engines

- Google
- Startpage
- DuckDuckGo

---

## Configuration

### Script Enable/Disable
- **Enable/Disable the Script** - Toggle whether the userscript is active.

### Highlight
- **Enable Highlighting** - Toggle highlighting of matched domains.
- **Highlight Domain Terms** - Enter one domain per line.
  Optional: prefix with site keys separated by `;` followed by `|` for engine-specific highlighting.
  Highlighted results are moved to the top and displayed in the same order as listed in this field.
  **Examples:**
  - `google|example.com` → highlights `example.com` only on Google
  - `startpage;duckduckgo|example.com` → highlights `example.com` on Startpage and DuckDuckGo
  - `example.com` → highlights `example.com` on all supported search engines
  - `example` → highlights any site containing `example` in the domain name

- **CSS Styles** - Apply custom styles to highlighted results.
  **Example:** `padding: 20px; border: cyan 2px solid`.

### Blacklist Filter
- **Enable Blacklist Filter** - Toggle removing blacklisted results.
- **Blacklist Domain Terms** - Enter domains to remove from results, one per line.
  Works exactly like **Highlight Domain Terms**, supporting optional site-specific prefixes.
  **Examples:**
  - `google|example.com` → removes `example.com` only on Google
  - `startpage;duckduckgo|example.com` → removes `example.com` on Startpage and DuckDuckGo
  - `example.com` → removes `example.com` on all supported search engines
  - `example` → removes any result containing `example` in the domain name
- **Do not show removed results notification** - Disable the message that appears when blacklisted results are removed.

### Search Tabs (Google Only)
- **Enable Tab Rearrange/Filter** - Toggle tab management.
- **Tab Order** - Semicolon-separated list to define the desired tab order.
  **Example:** `All;Web;Images;Videos;Short videos`
- **Tabs to Remove/Hide** - Semicolon-separated list of tabs to hide.
  **Example:** `News;Products`
This ensures Google does not reorder tabs or add unnecessary ones for each search.

### Special Sections
- **Remove Special Sections on Google (Tables, Sitelinks etc.)** - Toggle removal of tables, sitelinks, and other special sections in search results.

---

## Known Issues

- **Startpage DOM Reloads**
  On Startpage, the entire `#main` section may reload dynamically when the page is loaded without an existing cache.<br>
  This can cause all modifications from the userscript to be reverted.

---

## Notes

- This script only works on static search results. Infinite scroll or dynamically loaded results are **not supported**.
- If a domain is present in both the blacklist and the highlight list, it will still be **removed**.
- All domain matching ignores `http://`, `https://`, and `www.` prefixes.
  For example, entering `fandom.com` will highlight or block all subpages like `gamename.fandom.com`.
