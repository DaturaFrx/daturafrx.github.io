// js/main.js - Application initialization and global variables

// Global application state
let username = '';

// Initialize application
function initializeApp() {
  // Set initial status
  updateStatus('Enter username to begin');
  
  // Setup all event listeners
  setupEventListeners();
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}