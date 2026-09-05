import type { CapturePayload } from "../../shared/types.js";
import { clearUnfinished, loadInterrupted } from "../../shared/storage.js";

let pendingCapture: CapturePayload | null = null;
interface CaptureIntent { id: string; tabId: number; mode: "article" | "selection" }
let pendingIntent: CaptureIntent | null = null;
let intentSequence = 0;

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
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);
const openForCapture = (tabId: number, mode: CaptureIntent["mode"]): void => {
  const intent: CaptureIntent = { id: `${Date.now().toString(36)}-${++intentSequence}`, tabId, mode };
  pendingIntent = intent;
  pendingCapture = null;
  /* Keep open inside the original gesture. A cold panel reads GET_PENDING;
     a warm panel receives the notification. Only its acknowledgement consumes
     the intent, and a superseded opening must not broadcast an old request. */
  void chrome.sidePanel.open({ tabId }).then(() => {
    if (pendingIntent?.id !== intent.id) return;
    return chrome.runtime.sendMessage({ type: "CAPTURE_INTENT", intent }).catch(() => undefined);
  }).catch(() => undefined);
};

chrome.action.onClicked.addListener((tab) => {
  if (typeof tab.id !== "number") return;
  openForCapture(tab.id, "article");
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "inspect-selection" || !tab || typeof tab.id !== "number") return;
  openForCapture(tab.id, "selection");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CLEAR_CAPTURE_INTENT") {
    if (pendingIntent?.id === message.id) pendingIntent = null;
    sendResponse({ ok: true });
    return false;
  }
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
    pendingIntent = null;
    pendingCapture = { kind: "paste", text: "", host: "", title: "Pasted text", limitations: [] };
    void clearUnfinished();
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "GET_PENDING") {
    void (async () => {
      const intent = pendingIntent;
      const capture = pendingCapture;
      pendingCapture = null;
      const interrupted = intent || capture ? null : await loadInterrupted();
      sendResponse({ ...(intent ? { intent } : {}), capture, interrupted });
    })();
    return true;
  }
  return false;
});
