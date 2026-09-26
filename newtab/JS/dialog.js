/**
 * dialog.js — Custom modal dialogs to replace native browser prompts.
 */

function setupA11y(overlay, cancelCallback) {
  const previousActiveElement = document.activeElement;
  
  const focusableEls = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstFocusableEl = focusableEls[0];
  const lastFocusableEl = focusableEls[focusableEls.length - 1];

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelCallback();
    } else if (e.key === "Tab") {
      if (focusableEls.length === 1) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableEl) {
          lastFocusableEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableEl) {
          firstFocusableEl.focus();
          e.preventDefault();
        }
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  // Set timeout to ensure the visibility transition has applied so element is focusable
  setTimeout(() => {
    if (firstFocusableEl) {
      firstFocusableEl.focus();
    }
  }, 10);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    if (previousActiveElement && typeof previousActiveElement.focus === "function") {
      previousActiveElement.focus();
    }
  };
}

export function showConfirmDialog(message, title = "Confirm", confirmLabel = "Delete") {
  return new Promise((resolve) => {
    let overlay = document.getElementById("customDialogOverlay");
    
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "custom-dialog-overlay";
      overlay.id = "customDialogOverlay";
      overlay.innerHTML = `
        <div class="custom-dialog" role="dialog" aria-modal="true" aria-labelledby="customDialogTitle" aria-describedby="customDialogMessage">
          <h3 class="custom-dialog-title" id="customDialogTitle"></h3>
          <p class="custom-dialog-message" id="customDialogMessage"></p>
          <div class="custom-dialog-actions">
            <button class="custom-dialog-button cancel" id="customDialogCancel">Cancel</button>
            <button class="custom-dialog-button confirm" id="customDialogConfirm">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    const titleEl = overlay.querySelector("#customDialogTitle");
    const messageEl = overlay.querySelector("#customDialogMessage");
    const cancelBtn = overlay.querySelector("#customDialogCancel");
    const confirmBtn = overlay.querySelector("#customDialogConfirm");
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmLabel;
    
    let a11yCleanup;

    const cleanup = () => {
      overlay.classList.remove("active");
      cancelBtn.removeEventListener("click", handleCancel);
      confirmBtn.removeEventListener("click", handleConfirm);
      if (a11yCleanup) a11yCleanup();
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    cancelBtn.addEventListener("click", handleCancel);
    confirmBtn.addEventListener("click", handleConfirm);
    
    requestAnimationFrame(() => {
      overlay.classList.add("active");
      a11yCleanup = setupA11y(overlay, handleCancel);
    });
  });
}

export function showAlertDialog(message, title = "Notice") {
  return new Promise((resolve) => {
    let overlay = document.getElementById("customAlertDialogOverlay");
    
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "custom-dialog-overlay";
      overlay.id = "customAlertDialogOverlay";
      overlay.innerHTML = `
        <div class="custom-dialog" role="dialog" aria-modal="true" aria-labelledby="customAlertDialogTitle" aria-describedby="customAlertDialogMessage">
          <h3 class="custom-dialog-title" id="customAlertDialogTitle"></h3>
          <p class="custom-dialog-message" id="customAlertDialogMessage"></p>
          <div class="custom-dialog-actions">
            <button class="custom-dialog-button confirm" id="customAlertDialogConfirm">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    const titleEl = overlay.querySelector("#customAlertDialogTitle");
    const messageEl = overlay.querySelector("#customAlertDialogMessage");
    const confirmBtn = overlay.querySelector("#customAlertDialogConfirm");
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    let a11yCleanup;

    const cleanup = () => {
      overlay.classList.remove("active");
      confirmBtn.removeEventListener("click", handleConfirm);
      if (a11yCleanup) a11yCleanup();
    };
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    confirmBtn.addEventListener("click", handleConfirm);
    
    requestAnimationFrame(() => {
      overlay.classList.add("active");
      a11yCleanup = setupA11y(overlay, handleConfirm);
    });
  });
}
