// js/ui.js - UI management and message display

// Status management
function updateStatus(status, type = "info") {
  const statusText = document.getElementById("statusText");
  const statusDot = document.getElementById("statusDot");

  statusText.textContent = status;
  statusDot.className = "status-dot";

  if (type === "connected") statusDot.classList.add("connected");
  else if (type === "connecting") statusDot.classList.add("connecting");
  else if (type === "error") statusDot.classList.add("error");
}

// Message display
function displayMessage(sender, text, isOwn = false) {
  const messagesGrid = document.getElementById("messagesGrid");
  const emptyState = document.getElementById("emptyState");

  if (emptyState) {
    emptyState.remove();
  }

  const messageCard = document.createElement("div");
  messageCard.className = `message-card ${isOwn ? "own" : "received"}`;

  messageCard.innerHTML = `
    <div class="message-meta">
      <span class="message-author">${escapeHtml(sender)}</span>
      <span class="message-time">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="message-text">${escapeHtml(text)}</div>
  `;

  messagesGrid.appendChild(messageCard);

  // Auto-scroll to bottom
  setTimeout(scrollToBottom, 50);
}

// Setup all event listeners
function setupEventListeners() {
  // Save profile button
  document.getElementById("saveProfileBtn").onclick = async () => {
    const usernameInput = document.getElementById("usernameInput");
    username = usernameInput.value.trim();

    if (!username) {
      showToast("Please enter a username");
      return;
    }

    document.getElementById("usernameDisplay").textContent = username;
    document.getElementById("setupPanel").style.display = "none";
    document.getElementById("connectionPanel").style.display = "block";

    await initPeer();
  };

  // Connect button
  document.getElementById("connectBtn").onclick = connectToPeer;

  // Send button
  document.getElementById("sendBtn").onclick = sendMessage;

  // Message input keydown
  document.getElementById("messageInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Message input auto-resize
  document
    .getElementById("messageInput")
    .addEventListener("input", adjustTextareaHeight);

  // Debug toggle
  document.getElementById("debugToggle").onclick = () => {
    const debugPanel = document.getElementById("debugPanel");
    debugPanel.classList.toggle("open");
  };
}

// Setup copy ID button (called when peer is initialized)
function setupCopyButton() {
  document.getElementById("copyIdBtn").onclick = () => {
    navigator.clipboard.writeText(myId);
    showToast("ID copied to clipboard");
  };
}
