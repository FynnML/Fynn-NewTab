/**
 * dialog.js — Custom modal dialogs to replace native browser prompts.
 */

export function showConfirmDialog(message, title = "Confirm") {
  return new Promise((resolve) => {
    let overlay = document.getElementById("customDialogOverlay");
    
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "custom-dialog-overlay";
      overlay.id = "customDialogOverlay";
      overlay.innerHTML = `
        <div class="custom-dialog">
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
    
    const cleanup = () => {
      overlay.classList.remove("active");
      cancelBtn.removeEventListener("click", handleCancel);
      confirmBtn.removeEventListener("click", handleConfirm);
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
        <div class="custom-dialog">
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
    
    const cleanup = () => {
      overlay.classList.remove("active");
      confirmBtn.removeEventListener("click", handleConfirm);
    };
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    confirmBtn.addEventListener("click", handleConfirm);
    
    requestAnimationFrame(() => {
      overlay.classList.add("active");
    });
  });
}
