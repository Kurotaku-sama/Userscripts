[![Ko-fi](https://img.shields.io/badge/If%20you%20like%20my%20work%20feel%20free%20to%20support%20me%20on%20Kofi-8A2BE2?style=for-the-badge&logo=ko-fi&labelColor=9370DB&link=https://ko-fi.com/kurotaku1337)](https://ko-fi.com/kurotaku1337)

# MyFigureCollection Image Downloader

[![Install](https://img.shields.io/badge/install-userscript-purple?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/Kurotaku-sama/Userscripts/main/userscripts/MyFigureCollection_Image_Downloader/script.user.js)

---

## Description

This userscript allows you to download images for items from MyFigureCollection (MFC) either automatically when the page loads or manually via an integrated button. All settings, including download modes and file formatting, are easily adjustable through your userscript manager's menu.

---

## Settings

- **Autodownload**: Automatically starts the download process when an item page is loaded.
- **Mode (Primary Only / All Images)**: Choose between downloading only the main product image or the entire gallery.
- **Format (ZIP / Single Files)**: Toggle between packing images into a ZIP archive or downloading them individually.
- **ZIP Content (Subfolder)**: When using ZIP, creates a subfolder inside the archive named after the figure.
- **Naming (Item ID)**: Includes the MFC Item ID in the filename (e.g., `12345_01.jpg`).
- **Padding**: Adds leading zeros to filenames (e.g., `01`, `001`) to ensure correct sorting in your local file system.

![Settings](settings.png)

---

## Note

Due to issues with some userscript managers regarding the `@require` of large libraries, **JSZip** is loaded dynamically during each ZIP download process. This ensures that archiving works reliably without the script hanging during initial page load.

---

## Libraries Used

- **JSZip**: For creating ZIP archives directly in the browser.