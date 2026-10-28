//
// layerCleanerPro
//
// The problem is not the content.
// The problem is the interruption.
//

const ENABLE_AUTO_CONSENT = true;

//
// Consent Automation
//

function autoAcceptConsent() {
  if (!ENABLE_AUTO_CONSENT) {
    return;
  }

  const consentKeywords = [

  // English

  "cookie",
  "cookies",
  "consent",
  "gdpr",
  "privacy",

  // Japanese

  "プライバシー",
  "クッキー",
  "同意",

  // Chinese

  "隐私",
  "隱私", 
  "个人信息",
  "個人資料"

  ];

  const acceptKeywords = [

  // English

  "accept",
  "agree",
  "allow",
  "ok",
  "got it",
  "i agree",

  // Japanese

  "同意",
  "承諾",
  "許可",
  "了解",

  // Chinese

  "接受",
  "允许",
  "允許",
  "确认",
  "確認",
  "知道了"

  ];

  const buttons = document.querySelectorAll(
    'button, a, input[type="button"], input[type="submit"], [role="button"]'
  );

  buttons.forEach((button) => {
    const buttonText = (
      button.innerText ||
      button.value ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!buttonText) {
      return;
    }

    const containerText = (
      button.closest("div,section,article,form")?.innerText ||
      ""
    )
      .toLowerCase()
      .slice(0, 3000);

    const isConsentRelated = consentKeywords.some((keyword) =>
      containerText.includes(keyword)
    );

    if (!isConsentRelated) {
      return;
    }

    const shouldAccept = acceptKeywords.some((keyword) =>
      buttonText.includes(keyword)
    );

    if (!shouldAccept) {
      return;
    }

    try {
      button.click();
    } catch (error) {}
  });
}

//
// Element Neutralization
//

function hideElement(element) {
  if (!element || !element.isConnected) {
    return;
  }

  element.style.setProperty(
    "display",
    "none",
    "important"
  );

  element.style.setProperty(
    "visibility",
    "hidden",
    "important"
  );

  element.style.setProperty(
    "opacity",
    "0",
    "important"
  );

  element.style.setProperty(
    "pointer-events",
    "none",
    "important"
  );

  element.setAttribute(
    "data-layer-cleaner",
    "hidden"
  );
}

//
// Scroll Lock Recovery
//

function cleanupScrollLock() {
  [
    document.body,
    document.documentElement
  ].forEach((element) => {
    if (!element) {
      return;
    }

    element.style.setProperty(
      "overflow",
      "auto",
      "important"
    );

    element.style.setProperty(
      "position",
      "static",
      "important"
    );

    element.style.setProperty(
      "touch-action",
      "auto",
      "important"
    );

    element.classList.remove(
      "modal-open",
      "no-scroll",
      "overflow-hidden",
      "disable-scroll",
      "scroll-lock"
    );
  });
}

//
// Keyword-Based Detection
//

function removeNamedPopups() {
  document
    .querySelectorAll("dialog")
    .forEach(hideElement);

  const selectors = [
    '[class*="modal" i]',
    '[class*="overlay" i]',
    '[class*="popup" i]',
    '[class*="cookie" i]',
    '[class*="gdpr" i]',
    '[class*="consent" i]',
    '[id*="modal" i]',
    '[id*="overlay" i]',
    '[id*="popup" i]',
    '[id*="cookie" i]'
  ];

  selectors.forEach((selector) => {
    document
      .querySelectorAll(selector)
      .forEach((element) => {
        if (
          element.closest(
            "header, nav, footer"
          )
        ) {
          return;
        }

        hideElement(element);
      });
  });
}

//
// Large Overlay Detection
//

function removeLargeOverlays() {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenArea = screenWidth * screenHeight;

  document
    .querySelectorAll(
      "div, section, aside, article"
    )
    .forEach((element) => {
      if (
        element.closest(
          "header, nav, footer"
        )
      ) {
        return;
      }

      const style =
        getComputedStyle(element);

      const position =
        style.position;

      if (
        position !== "fixed" &&
        position !== "absolute"
      ) {
        return;
      }

      const zIndex = parseInt(
        style.zIndex,
        10
      );

      if (
        Number.isNaN(zIndex) ||
        zIndex < 10
      ) {
        return;
      }

      const rect =
        element.getBoundingClientRect();

      const elementArea =
        rect.width * rect.height;

      const isLargeOverlay =
        elementArea >
        screenArea * 0.30;

      const isFullScreenOverlay =
        rect.width >= screenWidth * 0.80 &&
        rect.height >= screenHeight * 0.80;

      if (
        isLargeOverlay ||
        isFullScreenOverlay
      ) {
        hideElement(element);
      }
    });
}

//
// Backdrop Detection
//

function removeBackdrops() {
  document
    .querySelectorAll("div")
    .forEach((element) => {
      const style =
        getComputedStyle(element);

      if (
        style.position !== "fixed"
      ) {
        return;
      }

      const rect =
        element.getBoundingClientRect();

      const coversScreen =
        rect.width >=
          window.innerWidth * 0.90 &&
        rect.height >=
          window.innerHeight * 0.90;

      if (!coversScreen) {
        return;
      }

      const backgroundColor =
        style.backgroundColor.toLowerCase();

      if (
        backgroundColor.includes("rgb")
      ) {
        hideElement(element);
      }
    });
}

//
// Overlay Resurrection Handling
//

function purgeRestoredElements() {
  document
    .querySelectorAll(
      '[data-layer-cleaner="hidden"]'
    )
    .forEach((element) => {
      try {
        if (
          getComputedStyle(element)
            .display !== "none"
        ) {
          element.remove();
        }
      } catch (error) {}
    });
}

//
// Main Cleanup Routine
//

function cleanLayers() {
  autoAcceptConsent();
  removeNamedPopups();
  removeLargeOverlays();
  removeBackdrops();
  cleanupScrollLock();
  purgeRestoredElements();
}

//
// Initialization
//

async function initialize() {
  const currentDomain =
    location.hostname;

  const data =
    await chrome.storage.local.get({
      layerBlockedDomains: []
    });

  if (
    !data.layerBlockedDomains.includes(
      currentDomain
    )
  ) {
    return;
  }

  cleanLayers();

  let timer = null;

  const observer =
    new MutationObserver(() => {
      clearTimeout(timer);

      timer = setTimeout(
        cleanLayers,
        300
      );
    });

  function startObserver() {
    if (!document.body) {
      setTimeout(
        startObserver,
        100
      );

      return;
    }

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  startObserver();
}

initialize();