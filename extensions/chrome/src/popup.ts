export {};

const statusMessage = document.querySelector<HTMLElement>("#status")!;

const openPanel = async (kind: "selection" | "article" | "paste"): Promise<void> => {
  statusMessage.textContent = "Opening private inspection…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (typeof tab?.id !== "number" || typeof tab.windowId !== "number") {
    statusMessage.textContent = "No active page is available. Paste text in the side panel instead.";
    return;
  }
  await chrome.sidePanel.open({ tabId: tab.id });
  await chrome.runtime.sendMessage(kind === "paste"
    ? { type: "START_PASTE" }
    : { type: "START_CAPTURE", tabId: tab.id, kind });
  window.close();
};

document.querySelector("#selection")?.addEventListener("click", () => void openPanel("selection"));
document.querySelector("#article")?.addEventListener("click", () => void openPanel("article"));
document.querySelector("#paste")?.addEventListener("click", () => void openPanel("paste"));
