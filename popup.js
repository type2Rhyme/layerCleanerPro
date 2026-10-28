//
// layerCleanerPro
//
// The problem is not the content.
// The problem is the interruption.
//

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const domainInfo =
      document.getElementById(
        "domain-info"
      );

    const blockTabButton =
      document.getElementById(
        "block-tab-btn"
      );

    const layerCleanerButton =
      document.getElementById(
        "block-layer-btn"
      );

    const [activeTab] =
      await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

    if (
      !activeTab ||
      !activeTab.url ||
      activeTab.url.startsWith(
        "chrome://"
      )
    ) {
      domainInfo.textContent =
        "Unavailable on this page";

      return;
    }

    const url =
      new URL(activeTab.url);

    const currentDomain =
      url.hostname;

    domainInfo.textContent =
      currentDomain;

    //
    // Load current settings
    //

    const data =
      await chrome.storage.local.get({
        blockedDomains: [],
        layerBlockedDomains: []
      });

    let blockedDomains =
      data.blockedDomains;

    let layerBlockedDomains =
      data.layerBlockedDomains;

    let isTabBlocked =
      blockedDomains.includes(
        currentDomain
      );

    let isLayerCleaningEnabled =
      layerBlockedDomains.includes(
        currentDomain
      );

    //
    // Refresh button states
    //

    function updateButtons() {

      blockTabButton.style.display =
        "block";

      layerCleanerButton.style.display =
        "block";

      if (isTabBlocked) {

        blockTabButton.textContent =
          "Tab Blocking: ON";

        blockTabButton.className =
          "btn-red";

      } else {

        blockTabButton.textContent =
          "Tab Blocking: OFF";

        blockTabButton.className =
          "btn-green";

      }

      if (
        isLayerCleaningEnabled
      ) {

        layerCleanerButton.textContent =
          "Layer Cleaning: ON";

        layerCleanerButton.className =
          "btn-red";

      } else {

        layerCleanerButton.textContent =
          "Layer Cleaning: OFF";

        layerCleanerButton.className =
          "btn-green";

      }
    }

    updateButtons();

    //
    // Toggle tab blocking
    //

    blockTabButton.addEventListener(
      "click",
      async () => {

        if (isTabBlocked) {

          blockedDomains =
            blockedDomains.filter(
              domain =>
                domain !==
                currentDomain
            );

          isTabBlocked = false;

        } else {

          blockedDomains.push(
            currentDomain
          );

          isTabBlocked = true;
        }

        await chrome.storage.local.set({
          blockedDomains
        });

        if (activeTab.id) {

          chrome.action
            .setIcon({
              tabId: activeTab.id,
              path: isTabBlocked
                ? "icon-red.png"
                : "icon-green.png"
            })
            .catch(() => {});
        }

        updateButtons();
      }
    );

    //
    // Toggle layer cleaning
    //

    layerCleanerButton.addEventListener(
      "click",
      async () => {

        if (
          isLayerCleaningEnabled
        ) {

          layerBlockedDomains =
            layerBlockedDomains.filter(
              domain =>
                domain !==
                currentDomain
            );

          isLayerCleaningEnabled =
            false;

        } else {

          layerBlockedDomains.push(
            currentDomain
          );

          isLayerCleaningEnabled =
            true;
        }

        await chrome.storage.local.set({
          layerBlockedDomains
        });

        updateButtons();

        //
        // Reload the page immediately
        // so changes take effect.
        //

        if (activeTab.id) {
          chrome.tabs.reload(
            activeTab.id
          );
        }
      }
    );

  }
);