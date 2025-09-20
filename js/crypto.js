// js/crypto.js - Cryptographic operations

// Crypto variables
let keyPair = null;
let derivedKey = null;
let curveName = "P-256";
const outgoingQueue = [];

// Select best available curve
async function selectBestCurve() {
  const curves = ["P-256", "P-384"];
  for (const curve of curves) {
    try {
      await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: curve },
        false,
        ["deriveBits"]
      );
      curveName = curve;
      logInfo(`Using curve ${curveName}`);
      return;
    } catch (e) {
      logWarn(`Curve ${curve} failed: ${e.message}`);
    }
  }
  throw new Error("No working curves found");
}

// Generate ECDH key pair
async function generateKeyPair() {
  logInfo(`Generating key pair on curve ${curveName}`);
  keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: curveName },
    true,
    ["deriveBits"]
  );
  const raw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  return Array.from(new Uint8Array(raw));
}

// Derive shared encryption key
async function deriveSharedKey(remoteArr) {
  logInfo("Deriving shared key");
  const remoteRaw = new Uint8Array(remoteArr).buffer;
  const remoteKey = await crypto.subtle.importKey(
    "raw",
    remoteRaw,
    { name: "ECDH", namedCurve: curveName },
    false,
    []
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: remoteKey },
    keyPair.privateKey,
    256
  );
  const salt = new TextEncoder().encode("p2p-chat-salt-v3");
  const info = new TextEncoder().encode(`p2p-chat-session-${curveName}`);
  const hkdfKey = await crypto.subtle.importKey("raw", bits, "HKDF", false, [
    "deriveKey",
  ]);
  derivedKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info,
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  logInfo("Shared key derived");
  flushOutgoingQueue();
}

// Encrypt message with AES-GCM
async function encryptMessage(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    new TextEncoder().encode(text)
  );
  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
  };
}

// Decrypt received message
async function decryptMessage(payload) {
  const ciphertext = new Uint8Array(payload.ciphertext);
  const iv = new Uint8Array(payload.iv);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

// Send queued messages once encryption is ready
async function flushOutgoingQueue() {
  if (!derivedKey || !conn || !conn.open) {
    logWarn("Queue flush skipped - not ready");
    return;
  }
  while (outgoingQueue.length) {
    const item = outgoingQueue.shift();
    const encrypted = await encryptMessage(item.text);
    conn.send({
      type: "message",
      username,
      message: encrypted,
    });
    displayMessage("You", item.text, true);
  }
}
