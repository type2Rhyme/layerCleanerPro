//
// layerCleanerPro
//
// The problem is not the content.
// The problem is the interruption.
//

//
// Tab-Specific Counter Management
//

const tabCounts = {};

//
// Badge & Counter Setup
//

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#28a745" });
  chrome.action.setBadgeTextColor({ color: "#ffffff" });
});

//
// Increment Counter for Specific Tab
//

function incrementTabCounter(tabId) {
  if (!tabId) {
    return;
  }

  const currentCount = (tabCounts[tabId] || 0) + 1;
  tabCounts[tabId] = currentCount;

  const badgeText = currentCount > 999 ? "999+" : String(currentCount);

  chrome.action.setBadgeText({
    tabId: tabId,
    text: badgeText
  });
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

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "INCREMENT_COUNTER" && sender.tab && sender.tab.id) {
    incrementTabCounter(sender.tab.id);
  }
});

//
// Popup Tab Blocking
//

chrome.tabs.onCreated.addListener((newTab) => {
  if (!newTab.openerTabId) {
    return;
  }

  // 1. 手動で開いた新規タブ（新規タブページや空ページ）はブロック対象から外す
  const pendingUrl = newTab.pendingUrl || newTab.url || "";
  if (
    pendingUrl.startsWith("chrome://") ||
    pendingUrl === "about:blank"
  ) {
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

              if (parentTab.id) {
                incrementTabCounter(parentTab.id);
              }
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
  if (changeInfo.status === "loading") {
    tabCounts[tabId] = 0;
    chrome.action.setBadgeText({
      tabId: tabId,
      text: ""
    });
  }

  if (changeInfo.status !== "complete" || !tab || !tab.url) {
    return;
  }

  updateIcon(tabId, tab.url);
});

//
// Tab Cleanup
//

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabCounts[tabId];
});
