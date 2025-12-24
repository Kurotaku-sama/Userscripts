[![Ko-fi](https://img.shields.io/badge/If%20you%20like%20my%20work%20feel%20free%20to%20support%20me%20on%20Kofi-8A2BE2?style=for-the-badge&logo=ko-fi&labelColor=9370DB&link=https://ko-fi.com/kurotaku1337)](https://ko-fi.com/kurotaku1337)

# YouTube HitSquadGodFather Command Buttons

## Info

This script is no longer required for its original purpose, as **HitSquadGodFather is no longer streaming on YouTube**.
However, it may still serve as a reference or toolkit for similar use cases.

[![Install](https://img.shields.io/badge/install-userscript-orange?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/FOLDER/script.user.js)

---

## Description

This userscript adds a panel with command buttons similar like the old version of **[Twitch command buttons](/userscripts/Twitch_Command_Buttons/README.md)** to the YouTube live chat interface, specifically designed for on-stream minigames used during HitSquadGodFather's streams.

Each button sends a specific command into the live chat. This was intended to speed up interactions during events like trivia, team battles, or RPG-style encounters in the stream.

---

## Features

- Adds grouped command buttons for:
  - General commands (`!hitsquad`, `!points`, etc.)
  - Trivia answers (1–4)
  - Showdown Buttons
- Targeting system for Showdown attacks
- Optional toggle for each group in the config
- Sends commands into chat via simulated input and button clicks
- Works only when the page contains `HitSquadGodFather` in the live chat

![Settings](settings.png)

---

## Notes

- Buttons appear only if the live chat contains `HitSquadGodFather`
- The script may still be useful as a base for similar live chat automation tasks