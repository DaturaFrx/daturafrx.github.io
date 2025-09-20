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

// Extract YouTube video ID from various YouTube URL formats
function getYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Improved URL detection and linkification with video platform support
function linkifyText(text) {
  // More comprehensive URL regex that handles various protocols and formats
  const urlRegex = /((?:https?:\/\/|www\.)[^\s<>"{}|\\^`\[\]]+)/gi;
  
  return text.replace(urlRegex, (match) => {
    let url = match;
    
    // Add protocol if missing (for www. URLs)
    if (url.toLowerCase().startsWith('www.')) {
      url = 'https://' + url;
    }
    
    // Clean up the URL - remove trailing punctuation that's not part of the URL
    const cleanUrl = url.replace(/[.,;:!?)\]}]*$/, '');
    const lowerUrl = cleanUrl.toLowerCase();

    try {
      // Validate URL format
      new URL(cleanUrl);
    } catch (e) {
      // If URL is invalid, return original text
      logWarn(`Invalid URL detected: ${match}`);
      return match;
    }

    // Check for YouTube URLs
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('music.youtube.com')) {
      const videoId = getYouTubeVideoId(cleanUrl);
      if (videoId) {
        const displayText = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl;
        return `<div class="media-container">
                  <div class="video-embed" style="margin: 8px 0;">
                    <iframe width="300" height="169" 
                            src="https://www.youtube.com/embed/${videoId}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                            style="border-radius: 4px;">
                    </iframe>
                    <p style="margin: 4px 0 0 0; font-size: 0.9em;">
                      <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="message-link" title="${escapeHtml(cleanUrl)}">${escapeHtml(displayText)}</a>
                    </p>
                  </div>
                </div>`;
      }
    }

    // Check for other video platforms
    if (lowerUrl.includes('vimeo.com')) {
      const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        const videoId = vimeoMatch[1];
        const displayText = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl;
        return `<div class="media-container">
                  <div class="video-embed" style="margin: 8px 0;">
                    <iframe width="300" height="169" 
                            src="https://player.vimeo.com/video/${videoId}" 
                            frameborder="0" 
                            allow="autoplay; fullscreen; picture-in-picture" 
                            allowfullscreen
                            style="border-radius: 4px;">
                    </iframe>
                    <p style="margin: 4px 0 0 0; font-size: 0.9em;">
                      <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="message-link" title="${escapeHtml(cleanUrl)}">${escapeHtml(displayText)}</a>
                    </p>
                  </div>
                </div>`;
      }
    }

    // Check for direct video files (with optional query parameters)
    if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(lowerUrl)) {
      const videoType = lowerUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)/i)[1].toLowerCase();
      const mimeType = videoType === 'ogg' ? 'ogg' : (videoType === 'webm' ? 'webm' : 'mp4');
      
      return `<div class="media-container">
                <video controls style="max-width:300px; max-height:200px; display:block; margin:8px 0; border-radius: 4px;" data-url="${escapeHtml(cleanUrl)}">
                  <source src="${escapeHtml(cleanUrl)}" type="video/${mimeType}">
                  Your browser does not support the video tag.
                  <p>Video: <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="message-link">${escapeHtml(cleanUrl)}</a></p>
                </video>
              </div>`;
    }

    // Check for audio files (with optional query parameters)
    if (/\.(mp3|wav|flac|m4a|aac|ogg)(\?.*)?$/i.test(lowerUrl)) {
      const audioType = lowerUrl.match(/\.(mp3|wav|flac|m4a|aac|ogg)/i)[1].toLowerCase();
      const mimeType = audioType === "mp3" ? "mpeg" : audioType;
      
      return `<div class="media-container">
                <audio controls style="width:100%; max-width:300px; display:block; margin:8px 0;" data-url="${escapeHtml(cleanUrl)}">
                  <source src="${escapeHtml(cleanUrl)}" type="audio/${mimeType}">
                  Your browser does not support the audio tag.
                  <p>Audio: <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="message-link">${escapeHtml(cleanUrl)}</a></p>
                </audio>
              </div>`;
    }

    // Check for image files
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(lowerUrl)) {
      return `<div class="media-container">
                <img src="${escapeHtml(cleanUrl)}" 
                     alt="Shared image" 
                     style="max-width:300px; max-height:300px; display:block; margin:8px 0; border-radius:4px;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                     data-url="${escapeHtml(cleanUrl)}">
                <p style="display:none;">Image: <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="message-link">${escapeHtml(cleanUrl)}</a></p>
              </div>`;
    }

    // Regular links - truncate display text if too long
    const displayText = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl;
    
    return `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="message-link" title="${escapeHtml(cleanUrl)}">${escapeHtml(displayText)}</a>`;
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
  // First escape HTML, then apply linkification
  const escapedText = escapeHtml(messageText);
  textDiv.innerHTML = linkifyText(escapedText);

  messageDiv.appendChild(metaDiv);
  messageDiv.appendChild(textDiv);
  messagesGrid.appendChild(messageDiv);
  
  // Log for debugging (only in debug mode)
  if (window.location.search.includes('debug')) {
    logInfo(`Message appended: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);
  }
  scrollToBottom();
}

// Global event delegation for handling clicks on dynamically created elements
document.addEventListener(
  "click",
  function (e) {
    // Handle links
    if (e.target.tagName === "A" && e.target.classList.contains("message-link")) {
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

    // Handle images
    if (e.target.tagName === "IMG" && e.target.dataset.url) {
      e.stopPropagation();
      // Let the browser handle image normally
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
      logWarn(`${e.target.tagName} failed to load: ${e.target.dataset.url}`);
      const fallbackLink = document.createElement("p");
      fallbackLink.innerHTML = `${e.target.tagName.toLowerCase()} failed to load: <a href="${escapeHtml(
        e.target.dataset.url
      )}" target="_blank" rel="noopener noreferrer" class="message-link">${escapeHtml(
        e.target.dataset.url
      )}</a>`;
      e.target.parentNode.replaceChild(fallbackLink, e.target);
    }
    
    if (e.target.tagName === "IMG" && e.target.dataset.url) {
      logWarn(`Image failed to load: ${e.target.dataset.url}`);
    }
  },
  true
);