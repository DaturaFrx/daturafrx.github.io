// js/utils.js - Utility functions and helpers

// Logging functions
function logMessage(level, msg) {
  const timestamp = new Date().toISOString();
  const logEl = document.getElementById("debugLog");
  const entry = document.createElement("div");
  entry.className = `log-${level.toLowerCase()}`;
  entry.textContent = `[${
    timestamp.split("T")[1].split(".")[0]
  }] [${level}] ${msg}`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
  console.log(`[${level}] ${msg}`);
}

function logInfo(msg) {
  logMessage("INFO", msg);
}
function logWarn(msg) {
  logMessage("WARN", msg);
}
function logError(msg) {
  logMessage("ERROR", msg);
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Auto-scroll to bottom
function scrollToBottom() {
  const container = document.getElementById("messagesContainer");
  container.scrollTop = container.scrollHeight;
}

// HTML escaping for security
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Textarea auto-resize
function adjustTextareaHeight() {
  const textarea = document.getElementById("messageInput");
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
}

// Generate persistent user ID
function generatePersistentId() {
  let id = localStorage.getItem("p2p_user_id");
  if (!id) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    id = "";
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    id = `user-${id}`;
    localStorage.setItem("p2p_user_id", id);
  }
  return id;
}

// Recognize URLs and make them clickable or playable
function linkifyText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    const lowerUrl = url.toLowerCase();

    // Check for video files (with optional query parameters)
    if (/\.(mp4|webm|ogg)(\?.*)?$/.test(lowerUrl)) {
      const videoType = lowerUrl.match(/\.(mp4|webm|ogg)/)[1];
      return `<video controls style="max-width:300px; max-height:200px; display:block; margin:8px 0;" data-url="${escapeHtml(
        url
      )}">
                <source src="${escapeHtml(url)}" type="video/${videoType}">
                Your browser does not support the video tag.
                <p>Video: <a href="${escapeHtml(
                  url
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        url
      )}</a></p>
              </video>`;
    }

    // Check for audio files (with optional query parameters)
    if (/\.(mp3|wav|flac|m4a|aac)(\?.*)?$/.test(lowerUrl)) {
      const audioType = lowerUrl.match(/\.(mp3|wav|flac|m4a|aac)/)[1];
      return `<audio controls style="width:100%; max-width:300px; display:block; margin:8px 0;" data-url="${escapeHtml(
        url
      )}">
                <source src="${escapeHtml(url)}" type="audio/${
        audioType === "mp3" ? "mpeg" : audioType
      }">
                Your browser does not support the audio tag.
                <p>Audio: <a href="${escapeHtml(
                  url
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        url
      )}</a></p>
              </audio>`;
    }

    // Regular links
    return `<a href="${escapeHtml(
      url
    )}" target="_blank" rel="noopener noreferrer" class="message-link">${escapeHtml(
      url
    )}</a>`;
  });
}

// Append message to messages grid
function appendMessage(messageText, opts = {}) {
  const messagesGrid = document.getElementById("messagesGrid");
  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.style.display = "none";

  const messageDiv = document.createElement("div");
  messageDiv.className = "message-card";
  if (opts.own) messageDiv.classList.add("own");
  else messageDiv.classList.add("received");

  const metaDiv = document.createElement("div");
  metaDiv.className = "message-meta";
  if (opts.author || opts.time) {
    const authorSpan = document.createElement("span");
    authorSpan.className = "message-author";
    authorSpan.textContent = opts.author || "Unknown";
    metaDiv.appendChild(authorSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = opts.time || "";
    metaDiv.appendChild(timeSpan);
  }

  const textDiv = document.createElement("div");
  textDiv.className = "message-text";

  // Apply linkification to the escaped text
  textDiv.innerHTML = linkifyText(escapeHtml(messageText));

  messageDiv.appendChild(metaDiv);
  messageDiv.appendChild(textDiv);
  messagesGrid.appendChild(messageDiv);
  scrollToBottom();
}

// Global event delegation for handling clicks on dynamically created elements
document.addEventListener(
  "click",
  function (e) {
    // Handle links
    if (
      e.target.tagName === "A" &&
      e.target.classList.contains("message-link")
    ) {
      e.stopPropagation();
      // Let the browser handle the link normally
      return;
    }

    // Handle media elements - prevent parent handlers from interfering
    if (e.target.tagName === "AUDIO" || e.target.tagName === "VIDEO") {
      e.stopPropagation();
      // Let the browser handle media controls normally
      return;
    }

    // Handle source elements within media
    if (e.target.tagName === "SOURCE") {
      e.stopPropagation();
      return;
    }
  },
  true
); // Use capture phase to ensure we get the event first

// Fallback for media that fails to load - show link instead
document.addEventListener(
  "error",
  function (e) {
    if (
      (e.target.tagName === "VIDEO" || e.target.tagName === "AUDIO") &&
      e.target.dataset.url
    ) {
      const fallbackLink = document.createElement("p");
      fallbackLink.innerHTML = `${e.target.tagName.toLowerCase()} failed to load: <a href="${escapeHtml(
        e.target.dataset.url
      )}" target="_blank" rel="noopener noreferrer" class="message-link">${escapeHtml(
        e.target.dataset.url
      )}</a>`;
      e.target.parentNode.replaceChild(fallbackLink, e.target);
    }
  },
  true
);
