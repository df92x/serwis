// ==UserScript==
// @name         Siatka — czytelna siatka YouTube na tablecie
// @namespace    https://github.com/df92x/serwis
// @version      1.0.0
// @description  Wymusza wielokolumnową, czytelniejszą siatkę miniaturek na youtube.com (tablet / szeroki ekran).
// @author       Siatka
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const STYLE_ID = "siatka-tablet-grid-css";

  const css = `
    /* Desktop / Polymer UI */
    ytd-rich-grid-renderer {
      --ytd-rich-grid-items-per-row: 4 !important;
      --ytd-rich-grid-item-max-width: 360px !important;
      --ytd-rich-grid-item-min-width: 220px !important;
      max-width: 1600px !important;
      margin-inline: auto !important;
    }
    @media (min-width: 1100px) {
      ytd-rich-grid-renderer {
        --ytd-rich-grid-items-per-row: 4 !important;
      }
    }
    @media (min-width: 1400px) {
      ytd-rich-grid-renderer {
        --ytd-rich-grid-items-per-row: 5 !important;
      }
    }
    @media (min-width: 1700px) {
      ytd-rich-grid-renderer {
        --ytd-rich-grid-items-per-row: 6 !important;
      }
    }
    ytd-rich-item-renderer {
      margin: 0 !important;
      max-width: var(--ytd-rich-grid-item-max-width) !important;
    }
    ytd-thumbnail,
    ytd-rich-grid-media #thumbnail {
      max-height: 200px !important;
    }
    ytd-rich-grid-media #video-title,
    ytd-video-meta-block {
      font-size: 1.4rem !important;
      line-height: 1.35 !important;
    }

    /* Mobile web UI (m.youtube.com) — wymuś siatkę zamiast jednej kolumny */
    @media (min-width: 700px) {
      ytm-rich-grid-renderer .rich-grid-renderer-contents,
      ytm-rich-section-renderer .rich-section-content,
      .rich-grid-renderer-contents {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
        gap: 14px 12px !important;
        padding: 12px !important;
        max-width: 1600px !important;
        margin-inline: auto !important;
      }
      ytm-rich-item-renderer,
      ytm-video-with-context-renderer {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }
      ytm-media-item,
      .media-item-thumbnail-container,
      a.media-item-thumbnail-container {
        max-height: 180px !important;
      }
      .media-item-headline,
      h3.media-item-headline,
      .YtmCompactMediaItemDetails {
        font-size: 14px !important;
        line-height: 1.35 !important;
      }
    }
  `;

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  inject();
  document.addEventListener("DOMContentLoaded", inject);
  const obs = new MutationObserver(inject);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
