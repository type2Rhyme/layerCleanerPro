//
// layerCleanerPro
//
// The problem is not the content.
// The problem is the interruption.
//

//
// Badge & Counter Setup
//

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#28a745" });
  chrome.action.setBadgeTextColor({ color: "#ffffff" });
});

//
// Counter & Badge Update Logic
//

async function incrementBlockCount() {
  const data = await chrome.storage.local.get({ blockCount: 0 });
  const newCount = data.blockCount + 1;

  await chrome.storage.local.set({ blockCount: newCount });

  const badgeText = newCount > 999 ? "999+" : String(newCount);
  chrome.action.setBadgeText({ text: badgeText });
}

//
// Safe Icon Handling
//

function safeSetIcon(tabId, iconPath) {
  if (!tabId) {
    return;
  }

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      return;
    }

    chrome.action
      .setIcon({
        tabId,
        path: iconPath
      })
      .catch(() => {});
  });
}

//
// Icon State Management
//

function updateIcon(tabId, urlString) {
  if (!tabId) {
    return;
  }

  if (!urlString || urlString.startsWith("chrome://")) {
    safeSetIcon(tabId, "icon-green.png");
    return;
  }

  try {
    const url = new URL(urlString);

    chrome.storage.local.get(
      {
        blockedDomains: []
      },
      (data) => {
        if (chrome.runtime.lastError) {
          return;
        }

        const isBlocked = (data.blockedDomains || []).includes(
          url.hostname
        );

        safeSetIcon(
          tabId,
          isBlocked ? "icon-red.png" : "icon-green.png"
        );
      }
    );
  } catch (error) {
    safeSetIcon(tabId, "icon-green.png");
  }
}

//
// Message Listening for Counter
//

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "INCREMENT_COUNTER") {
    incrementBlockCount();
  }
});

//
// Popup Tab Blocking
//

chrome.tabs.onCreated.addListener((newTab) => {
  if (!newTab.openerTabId) {
    return;
  }

  chrome.tabs.get(newTab.openerTabId, (parentTab) => {
    if (
      chrome.runtime.lastError ||
      !parentTab ||
      !parentTab.url ||
      parentTab.url.startsWith("chrome://")
    ) {
      return;
    }

    try {
      const parentUrl = new URL(parentTab.url);

      chrome.storage.local.get(
        {
          blockedDomains: []
        },
        (data) => {
          if (chrome.runtime.lastError) {
            return;
          }

          const shouldClose = (data.blockedDomains || []).includes(
            parentUrl.hostname
          );

          if (shouldClose && newTab.id) {
            chrome.tabs.remove(newTab.id, () => {
              void chrome.runtime.lastError;
              incrementBlockCount();
            });
          }
        }
      );
    } catch (error) {}
  });
});

//
// Active Tab Tracking
//

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      return;
    }

    updateIcon(tab.id, tab.url);
  });
});

//
// Navigation Updates
//

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab || !tab.url) {
    return;
  }

  updateIcon(tabId, tab.url);
});

//
// Tab Removal Events
//

chrome.tabs.onRemoved.addListener(() => {});
