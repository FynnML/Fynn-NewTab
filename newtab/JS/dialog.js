import { t } from "./i18n/i18n.js";

// --- Non-blocking toast -------------------------------------------------
// Used for notices that must not interrupt the user (e.g. a wallpaper falling
// back to the default one). Unlike the dialogs above, toasts never steal
// focus and disappear on their own.
export function showToast(message, { duration = 5000, variant = "info" } = {}) {
  if (!message) return;

  let container = document.getElementById("fynnToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "fynnToastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${variant}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;

  const removeToast = () => {
    if (!toast.isConnected) return;
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  };

  toast.addEventListener("click", removeToast);
  container.appendChild(toast);

  // Double rAF so the "visible" transition reliably plays from the initial
  // state even when the toast is appended mid-frame.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("visible"));
  });

  setTimeout(removeToast, duration);
}

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

export function showConfirmDialog(message, title, confirmLabel, { isDestructive = true } = {}) {
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
            <button class="custom-dialog-button cancel" id="customDialogCancel"></button>
            <button class="custom-dialog-button" id="customDialogConfirm"></button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    const titleEl = overlay.querySelector("#customDialogTitle");
    const messageEl = overlay.querySelector("#customDialogMessage");
    const cancelBtn = overlay.querySelector("#customDialogCancel");
    const confirmBtn = overlay.querySelector("#customDialogConfirm");
    
    titleEl.textContent = title || t("dialogs.confirm");
    messageEl.textContent = message;
    cancelBtn.textContent = t("dialogs.cancel");
    confirmBtn.textContent = confirmLabel || t("dialogs.confirmAction");
    confirmBtn.className = `custom-dialog-button ${isDestructive ? "danger" : "primary"}`;
    
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

export function showAlertDialog(message, title) {
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
            <button class="custom-dialog-button primary" id="customAlertDialogConfirm"></button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    const titleEl = overlay.querySelector("#customAlertDialogTitle");
    const messageEl = overlay.querySelector("#customAlertDialogMessage");
    const confirmBtn = overlay.querySelector("#customAlertDialogConfirm");
    
    titleEl.textContent = title || t("dialogs.notice");
    messageEl.textContent = message;
    confirmBtn.textContent = t("dialogs.ok");
    
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
