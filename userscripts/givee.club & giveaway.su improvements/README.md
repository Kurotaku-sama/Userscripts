# givee.club & giveaway.su improvements

[![Install](https://img.shields.io/badge/install-userscript-purple?style=for-the-badge&logo=tampermonkey)](https://gist.github.com/Kurotaku-sama/e10dba1c073e49a6a55d155aae323914/raw/givee.club%2520&%2520giveaway.su%2520improvements.user.js) [![Gist Github](https://img.shields.io/badge/gist-github-purple?style=for-the-badge&logo=github)](https://gist.github.com/Kurotaku-sama/e10dba1c073e49a6a55d155aae323914)

---

## Description

This userscript enhances the giveaway experience on both [**givee.club**](https://givee.club) and [**giveaway.su**](https://giveaway.su), offering better visibility control, UI improvements, and quality-of-life features to help you navigate and manage giveaways more efficiently.

Originally, a separate script was planned for giveaway.su based on user feedback — however, during development, I made the decision to merge both scripts into a single unified script with nearly identical functionality across both sites.

---

## Features

- Remove sponsored content from the giveaway list on givee.club
- Ability to hide giveaways so you just see new ones
- Add quick-hide buttons to all giveaway cards
- Toggle hidden items on the main page with a toggle button
- Adds config and visibility toggle buttons directly to the site interface
- Display exact giveaway draw time on event pages
- Adds buttons to automatically perform or check tasks

![Settings givee.club](settings_gicl.png) ![Settings giveaway.su](settings_gisu.png)

Like all my other scripts, the configuration can also be accessed via the userscript/add-on menu.
However, each platform — **givee.club** and **giveaway.su** — has its **own individual settings**, allowing you to customize behavior separately for each site.

![Settings](settings.png)

---

## Buttons in the Interface

The script adds two new buttons:
- One to open the configuration menu
- One to show/hide previously hidden giveaway items

These are integrated directly into the site for quick access:

![Interface buttons](buttons_gicl.png)<br>
*Buttons in give.club*

![Interface buttons](gisu.png)<br>
*Buttons in giveaway.su*

---

## Recommended: Giveaway Companion

For additional automation and integration, it's recommended to also install [**Giveaway Companion**](https://raw.githubusercontent.com/longnull/GiveawayCompanion/master/GiveawayCompanion.user.js).

This script is not created by me, but I use it myself and highly recommend it for many giveaway platforms, like **Gleam.io**.<br>
A one-click install button for it is available in the configuration panel.

---

## Notes

- The list of hidden items is auto-sorted and cleaned
- The configuration menu and toggle visibility are also accessible directly via new site buttons