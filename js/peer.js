// js/peer.js - Peer connection management

let peer = null;
let conn = null;
let myId = null;

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// Initialize peer with collision-retry and ID generation
async function initPeer(maxRetries = 5) {
  await selectBestCurve();
  let attempt = 0;

  while (attempt < maxRetries) {
    const id = generatePersistentId(); // must not depend on username
    peer = new Peer(id, { debug: 2, config: { iceServers: ICE_SERVERS } });

    try {
      await new Promise((resolve, reject) => {
        peer.on("open", resolve);
        peer.on("error", (err) => {
          // PeerJS signals unavailable-id in different ways; check message too
          const msg =
            err && err.type ? err.type : err && err.message ? err.message : "";
          if (
            err &&
            (err.type === "unavailable-id" ||
              (msg.includes("ID") && msg.includes("taken")))
          )
            reject(err);
          else
            logError(`Peer error: ${err && err.message ? err.message : err}`);
        });
      });

      myId = peer.id;
      document.getElementById(
        "myIdDisplay"
      ).innerHTML = `${myId} <button class="copy-btn" id="copyIdBtn">Copy</button>`;
      setupCopyButton();
      updateStatus("Ready - waiting for connections");
      logInfo(`Peer initialized with ID: ${myId}`);
      break;
    } catch (e) {
      attempt++;
      try {
        peer.destroy();
      } catch (ignored) {}
      localStorage.removeItem("p2p_user_id"); // force new ID next iteration
      if (attempt >= maxRetries) {
        logError("Failed to generate unique peer ID after retries");
        updateStatus("Error", "error");
        throw e;
      }
    }
  }

  // Incoming connection handler
  peer.on("connection", async (incomingConn) => {
    const peerName = incomingConn.metadata?.username || incomingConn.peer;
    if (!confirm(`Accept connection from ${peerName}?`)) {
      incomingConn.close();
      return;
    }

    if (conn && conn.open) conn.close();
    conn = incomingConn;

    // Ensure we have a key pair generated locally
    await generateKeyPair();

    // If remote sent their public key in metadata, derive now
    if (incomingConn.metadata?.publicKey) {
      try {
        await deriveSharedKey(incomingConn.metadata.publicKey);
      } catch (err) {
        logWarn(
          `deriveSharedKey failed on incoming metadata: ${
            err && err.message ? err.message : err
          }`
        );
      }
    }

    setupConnectionHandlers();
    await jork(); // force immediate key exchange + queue flush

    // Reply with our public key
    try {
      const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
      conn.send({
        type: "key_exchange_response",
        publicKey: Array.from(new Uint8Array(publicKey)),
        username,
      });
    } catch (err) {
      logError(
        `Failed to send key_exchange_response: ${
          err && err.message ? err.message : err
        }`
      );
    }

    updateStatus("Connected", "connected");
    showToast(`Connected to ${peerName}`);
  });

  peer.on("error", (err) => {
    logError(`Peer error: ${err && err.message ? err.message : err}`);
    updateStatus("Error", "error");
  });
}

// Safe flush helper; waits briefly for derivedKey if necessary, otherwise logs and aborts
async function flushOutgoingQueue() {
  if (!conn || !conn.open) {
    logWarn("Queue flush skipped - connection not open");
    return;
  }

  while (outgoingQueue && outgoingQueue.length > 0) {
    if (!derivedKey) {
      // wait for derivedKey up to a short timeout
      const start = Date.now();
      while (!derivedKey && Date.now() - start < 3000) {
        await new Promise((r) => setTimeout(r, 10));
      }
      if (!derivedKey) {
        logWarn("Queue flush skipped - not ready");
        return;
      }
    }

    const msg = outgoingQueue.shift();
    try {
      const encrypted = await encryptMessage(msg.text);
      conn.send({ type: "message", username, message: encrypted });
      displayMessage("You", msg.text, true);
    } catch (err) {
      logError(
        `Failed to send queued message: ${
          err && err.message ? err.message : err
        }`
      );
    }
  }
}

// jork: force key exchange, flush queue, and send a tiny trigger to prompt recipient processing
async function jork() {
  if (!conn || !conn.open) return;

  try {
    // 1) Send our public key immediately if shared key not yet derived
    if (!derivedKey) {
      await generateKeyPair(); // ensure keyPair exists
      if (keyPair && keyPair.publicKey) {
        try {
          const publicKey = await crypto.subtle.exportKey(
            "raw",
            keyPair.publicKey
          );
          conn.send({
            type: "key_exchange_response",
            publicKey: Array.from(new Uint8Array(publicKey)),
            username,
          });
        } catch (e) {
          logWarn(
            `jork: failed to send public key: ${e && e.message ? e.message : e}`
          );
        }
      }
    }

    // 2) Flush outgoing queue immediately (will wait briefly for derivedKey)
    await flushOutgoingQueue();

    // 3) Send a tiny jork ping to nudge the remote peer to process or respond
    try {
      conn.send({ type: "jork", username });
    } catch (e) {
      // If sending fails because connection state still not open, ignore
    }
  } catch (err) {
    logWarn(`jork error: ${err && err.message ? err.message : err}`);
  }
}

// Setup connection event handlers. Assumes conn is set before calling.
function setupConnectionHandlers() {
  if (!conn) return;

  conn.on("open", async () => {
    updateStatus("Connected", "connected");
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn) sendBtn.disabled = false;
    await jork(); // ensure immediate handshake and flush
  });

  conn.on("data", async (data) => {
    if (!data || typeof data !== "object" || !data.type) return;

    try {
      if (
        data.type === "key_exchange_response" &&
        Array.isArray(data.publicKey)
      ) {
        await deriveSharedKey(data.publicKey);
        await jork(); // after deriving, flush and ensure both sides exchange
      } else if (data.type === "request_key") {
        if (keyPair) {
          try {
            const publicKey = await crypto.subtle.exportKey(
              "raw",
              keyPair.publicKey
            );
            conn.send({
              type: "key_exchange_response",
              publicKey: Array.from(new Uint8Array(publicKey)),
              username,
            });
          } catch (err) {
            logError(
              `Failed to respond to request_key: ${
                err && err.message ? err.message : err
              }`
            );
          }
        }
      } else if (data.type === "jork") {
        // remote nudged us; make sure we reply with a key if needed and flush
        if (!derivedKey && keyPair) {
          try {
            const publicKey = await crypto.subtle.exportKey(
              "raw",
              keyPair.publicKey
            );
            conn.send({
              type: "key_exchange_response",
              publicKey: Array.from(new Uint8Array(publicKey)),
              username,
            });
          } catch (err) {
            logWarn(
              `Failed to reply to jork with key: ${
                err && err.message ? err.message : err
              }`
            );
          }
        }
        await flushOutgoingQueue();
      } else if (data.type === "message") {
        try {
          const plaintext = await decryptMessage(data.message);
          displayMessage(data.username || conn.peer, plaintext, false);
        } catch (e) {
          logError(
            `Failed to decrypt message: ${e && e.message ? e.message : e}`
          );
        }
      }
    } catch (err) {
      logError(
        `Error handling incoming data: ${
          err && err.message ? err.message : err
        }`
      );
    }
  });

  conn.on("close", () => {
    updateStatus("Disconnected", "error");
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn) sendBtn.disabled = true;
    conn = null;
    derivedKey = null;
    keyPair = null;
    showToast("Connection closed");
  });

  conn.on("error", (err) => {
    logError(`Connection error: ${err && err.message ? err.message : err}`);
    updateStatus("Connection error", "error");
  });
}

// Connect to a peer by ID
async function connectToPeer() {
  const peerId = document.getElementById("peerIdInput").value.trim();
  if (!peerId || peerId === myId) {
    showToast("Invalid peer ID");
    return;
  }

  if (conn && conn.open) conn.close();

  updateStatus("Connecting...", "connecting");

  // ensure we have a keyPair to include in metadata
  await generateKeyPair();
  let publicKeyMetadata = undefined;
  try {
    if (keyPair && keyPair.publicKey) {
      const exported = await crypto.subtle.exportKey("raw", keyPair.publicKey);
      publicKeyMetadata = exported
        ? Array.from(new Uint8Array(exported))
        : undefined;
    }
  } catch (e) {
    logWarn(
      `Could not export publicKey for metadata: ${
        e && e.message ? e.message : e
      }`
    );
  }

  conn = peer.connect(peerId, {
    metadata: { username, publicKey: publicKeyMetadata },
  });

  setupConnectionHandlers();

  // If the other side doesn't respond with a key, request it shortly after open
  setTimeout(() => {
    if (!derivedKey && conn && conn.open) {
      try {
        conn.send({ type: "request_key" });
      } catch (e) {
        // ignore send errors here
      }
    }
  }, 1500);
}

// Send a message
async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  if (!conn || !conn.open) {
    showToast("Not connected to a peer");
    return;
  }

  if (!derivedKey) {
    outgoingQueue.push({ text });
    try {
      conn.send({ type: "request_key" });
    } catch (e) {
      // ignore transient send errors; jork will nudge
    }
    // try to nudge remote immediately to speed up handshake
    await jork();
    showToast("Message queued - establishing encryption");
  } else {
    try {
      const encrypted = await encryptMessage(text);
      conn.send({ type: "message", username, message: encrypted });
      displayMessage("You", text, true);
    } catch (err) {
      logError(
        `Failed to send message: ${err && err.message ? err.message : err}`
      );
      outgoingQueue.push({ text });
      await jork();
    }
  }

  input.value = "";
  adjustTextareaHeight();
}
