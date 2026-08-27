import type { CapturePayload, CaptureKind } from "../../shared/types.js";
import { clearUnfinished, loadInterrupted, markUnfinished } from "../../shared/storage.js";

let pendingCapture: CapturePayload | null = null;

const restrictedMessage = "Chrome does not allow this extension to read text on this page. Paste the text instead.";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "inspect-selection",
      title: "Check selection with Opace Content Integrity",
      contexts: ["selection"]
    });
  });
});

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const runCapture = async (tabId: number, kind: Exclude<CaptureKind, "paste">): Promise<void> => {
  pendingCapture = null;
  await markUnfinished(`capturing_${kind}`);
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [kind === "selection" ? "content/extract-selection.js" : "content/extract-article.js"]
    });
  } catch {
    pendingCapture = { kind, text: "", host: "", title: "Restricted page", limitations: [restrictedMessage] };
    await clearUnfinished();
  }
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "inspect-selection" || !tab || typeof tab.id !== "number") return;
  const tabId = tab.id;
  void chrome.sidePanel.open({ tabId }).then(() => runCapture(tabId, "selection"));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CAPTURE_READY") {
    pendingCapture = message.payload as CapturePayload;
    void clearUnfinished();
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "START_CAPTURE" && typeof message.tabId === "number") {
    void runCapture(message.tabId, message.kind === "article" ? "article" : "selection")
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === "START_PASTE") {
    pendingCapture = { kind: "paste", text: "", host: "", title: "Pasted text", limitations: [] };
    void clearUnfinished();
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "GET_PENDING") {
    void (async () => {
      const capture = pendingCapture;
      pendingCapture = null;
      const interrupted = capture ? null : await loadInterrupted();
      sendResponse({ capture, interrupted });
    })();
    return true;
  }
  return false;
});
