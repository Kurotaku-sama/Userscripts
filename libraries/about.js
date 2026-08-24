(() => {
    // Text content for the About dialog, keyed by language code
    const about_texts = {
        en: {
            check_out: "Check out my other Userscripts and please leave a star if you like my work:",
            found_bug: "Found a bug? Reach out to me on Discord:",
            support: "If you like my work feel free to support me:",
            close: "Close",
        },
        de: {
            check_out: "Schau dir meine anderen Userscripts an und lass gerne einen Star da, wenn dir meine Arbeit gefällt:",
            found_bug: "Bug gefunden? Melde dich bei mir auf Discord:",
            support: "Wenn dir meine Arbeit gefällt, unterstütze mich gerne:",
            close: "Schließen",
        },
    };

    // Detect browser language, fallback to English if not German
    const lang_code = navigator.language.startsWith("de") ? "de" : "en";
    const t = about_texts[lang_code];

    // External links used inside the About dialog
    const homepage_url = "kurotaku.dev";
    const github_repo_url = "https://github.com/Kurotaku-sama/Userscripts";
    const github_io_url = "https://kurotaku-sama.github.io/Userscripts/";

    if (typeof GM_registerMenuCommand === "function") {
        GM_registerMenuCommand("About", () => {
            const html = `
                <strong>Version: ${GM_info.script.version}</strong><br>
                <strong>Author: Kurotaku</strong><br>
                <strong>Homepage:</strong> <a href="https://${homepage_url}" target="_blank" class="about_link">${homepage_url}</a><br><br>
                <strong>${t.check_out}</strong><br>
                <a href="${github_repo_url}" target="_blank" class="about_link">GitHub Repo</a> |
                <a href="${github_io_url}" target="_blank" class="about_link">GitHub.io</a><br><br>
                ${t.found_bug} <b>Kurotaku</b><br><br>
                ${t.support}
                <div class="donation-wrapper">
                    ${donation_styles}
                    ${paypal}
                    ${ko_fi}
                </div>
            `;

            Swal.fire({
                title: GM_info.script.name,
                html: html,
                theme: "dark",
                confirmButtonText: t.close,
                backdrop: true,
            });
        });
    }

    const paypal = `
    <a href="https://www.paypal.me/Kurotaku1337" target="_blank" rel="noopener" class="donation-button link-paypal">
        <img src="https://www.paypalobjects.com/webstatic/de_DE/i/de-pp-logo-200px.png" alt="PayPal" class="donation-icon" />
        <span class="donation-text"></span>
        <div class="donation-shine"></div>
    </a>
    `;

    const ko_fi = `
    <a href="https://ko-fi.com/kurotaku1337" target="_blank" rel="noopener" class="donation-button link-kofi">
        <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi" class="donation-icon" />
        <span class="donation-text">Ko-fi</span>
        <div class="donation-shine"></div>
    </a>
    `;

    const donation_styles = `
    <style>
    .donation-wrapper {
        margin-top: 15px;
        display: flex;
        justify-content: center;
        gap: 15px;
    }

    /* Link color for all links inside the About dialog (homepage, GitHub repo, GitHub.io) */
    .about_link {
        color: #7066e0;
        text-decoration: none;
    }

    .about_link:hover {
        text-decoration: underline;
    }

    /* Base styles for all donation buttons */
    .donation-button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center; /* Center content horizontally */
        gap: 10px;
        text-decoration: none;
        border-radius: 12px;
        padding: 0 20px; /* Removed vertical padding to maintain exact height */

        /* Fixed height constraints */
        height: 50px;
        min-height: 50px;
        box-sizing: border-box; /* Ensures padding doesn't add to height */

        color: white !important;
        font-size: 13px;
        font-family: "Segoe UI", sans-serif;
        font-weight: bold;
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        overflow: hidden;
    }

    .donation-button:hover {
        transform: translateY(-4px) scale(1.03);
        box-shadow: 0 12px 24px rgba(0,0,0,0.25);
        text-decoration: none;
    }

    .donation-icon {
        display: block;
        transition: transform 0.3s ease-in-out;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
    }

    .donation-text {
        font-size: 20px;
        position: relative;
        text-align: center;
        line-height: 1; /* Adjusted for fixed height */
    }

    /* Universal shine effect animation */
    .donation-shine {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(120deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
        transform: rotate(25deg);
        pointer-events: none;
        animation: donation_shine_anim 3s infinite linear;
    }

    @keyframes donation_shine_anim {
        0% { transform: translateX(-100%) rotate(25deg); }
        100% { transform: translateX(100%) rotate(25deg); }
    }

    /* --- Specific: PAYPAL STYLES --- */
    .link-paypal {
        background: linear-gradient(135deg, #003087, #009cde);
    }

    .link-paypal .donation-icon {
        height: 26px; /* Adjusted for 50px height */
        filter: brightness(0) invert(1);
    }

    /* --- Specific: KO-FI STYLES --- */
    .link-kofi {
        background: linear-gradient(135deg, #6a1292, #c850c0);
    }

    .link-kofi:hover {
        transform: translateY(-4px) scale(1.03) rotateX(5deg);
    }

    .link-kofi .donation-icon {
        height: 30px; /* Slightly smaller to fit 50px container comfortably */
    }

    .link-kofi:hover .donation-icon {
        animation: kofi_shake 2s ease-in-out infinite;
    }

    @keyframes kofi_shake {
        0%, 50%, 100% { transform: rotate(0deg); }
        10%, 30% { transform: rotate(-10deg); }
        20%, 40% { transform: rotate(10deg); }
    }
    </style>
    `;
})();