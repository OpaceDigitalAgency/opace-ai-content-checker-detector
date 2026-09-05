import type { CapturePayload, CaptureKind } from "../../shared/types.js";
import { clearUnfinished, loadInterrupted, markUnfinished } from "../../shared/storage.js";

let pendingCapture: CapturePayload | null = null;

const restrictedMessage = "Chrome would not let this extension read that page. Open the side panel and choose This page, and it will offer to ask Chrome for permission, or paste the text instead.";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "inspect-selection",
      title: "Check selection with Opace AI Content Checker & Detector",
      contexts: ["selection"]
    });
  });
});

/* Chrome's automatic side-panel toggle does not dispatch the extension action
   in every supported browser. Handle the action explicitly so activeTab is
   granted before opening the panel, without requesting standing site access. */
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
chrome.action.onClicked.addListener((tab) => {
  if (typeof tab.id !== "number") return;
  void chrome.sidePanel.open({ tabId: tab.id });
});

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
  /* The side panel injects its own captures and reads the reply directly, so it
     tells the worker to drop the copy the broadcast left here. Otherwise a
     later panel reload would pick up a capture the user has already seen. */
  if (message?.type === "CLEAR_PENDING") {
    pendingCapture = null;
    void clearUnfinished();
    sendResponse({ ok: true });
    return false;
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
