document.addEventListener("DOMContentLoaded", () => {
  initLoomCoupons();
  
  // Edge Case 2 Solution: MutationObserver for Section Rendering API
  // Re-initialize if the DOM is updated (e.g., mini-cart, quick-view)
  const observer = new MutationObserver((mutations) => {
    const hasNewCoupons = Array.from(mutations).some(m => 
      Array.from(m.addedNodes).some(n => n.nodeType === 1 && (n.classList?.contains('rockit-coupons-wrapper') || n.querySelector?.('.rockit-coupons-wrapper')))
    );
    if (hasNewCoupons) initLoomCoupons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Edge Case 3 Solution: Variant Selection Listener
  // Listen for Shopify variant changes in the URL
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('variant=')) initLoomCoupons();
    }
  }).observe(document, {subtree: true, childList: true});
});

async function initLoomCoupons() {
  const containers = document.querySelectorAll(".rockit-coupons-wrapper:not([data-initialized])");
  if (containers.length === 0) return;

  containers.forEach(async (container) => {
    container.setAttribute("data-initialized", "true");
    const productId = container.dataset.productId;
    const tags = container.dataset.tags || "";
    const vendor = container.dataset.vendor || "";
    const collections = container.dataset.collections || "";
    if (!productId) return;

    try {
      // Fade-in effect
      container.style.opacity = "0";
      container.style.transition = "opacity 0.4s ease";

      const variantId = new URLSearchParams(window.location.search).get("variant") || "";
      const res = await fetch(`/apps/timer?type=coupons&productId=${productId}&variantId=${variantId}&tags=${encodeURIComponent(tags)}&vendor=${encodeURIComponent(vendor)}&collections=${encodeURIComponent(collections)}&t=${Date.now()}`);
      if (!res.ok) return;
      
      const data = await res.json();
      if (!data.coupons || data.coupons.length === 0) {
        container.style.display = "none";
        return;
      }

      const coupons = data.coupons;
      const maxVisible = 2;
      const visibleCoupons = coupons.slice(0, maxVisible);
      const hiddenCoupons = coupons.slice(maxVisible);

      let html = "";
      visibleCoupons.forEach((c, i) => {
        html += renderCouponCard(c, i);
      });

      if (hiddenCoupons.length > 0) {
        html += `<button class="rockit-more-btn" id="rockit-more-btn-${productId}">
          View ${hiddenCoupons.length} more offer${hiddenCoupons.length > 1 ? "s" : ""} →
        </button>`;
      }

      container.innerHTML = html;
      container.style.display = "block";
      setTimeout(() => container.style.opacity = "1", 50);

      attachCardEvents(container);
      
      if (hiddenCoupons.length > 0) {
        buildSidebar(coupons, productId);
        document.getElementById(`rockit-more-btn-${productId}`).addEventListener("click", () => {
          openSidebar(productId);
        });
      }
    } catch (e) {
      console.error("[Loom Coupons]", e);
    }
  });
}

function renderCouponCard(coupon, index) {
  const desc = coupon.description ? `<div class="rockit-coupon-desc">${escapeHtml(coupon.description)}</div>` : "";
  
  let styleObj = {};
  let presetClass = "rockit-coupon-standard";
  let customStyles = "";

  try {
    if (coupon.style && coupon.style.startsWith('{')) {
      styleObj = JSON.parse(coupon.style);
      if (styleObj.preset) {
        presetClass = `coupon-${styleObj.preset}`;
      }
      customStyles = `
        background: ${styleObj.backgroundColor || ""};
        border: ${styleObj.borderStyle || "solid"} 1px ${styleObj.borderColor || ""};
        border-radius: ${styleObj.borderRadius || 8}px;
        color: ${styleObj.textColor || ""};
        font-family: ${styleObj.typography || "inherit"};
      `;
    } else if (coupon.style) {
      presetClass = `coupon-${coupon.style}`;
    }
  } catch (e) {
    console.error("Style parse error", e);
  }

  const codeAreaStyle = styleObj.codeColor ? `background: ${styleObj.codeColor}; color: ${styleObj.backgroundColor || "#fff"}; font-size: ${styleObj.fontSize || 13}px;` : "";
  
  return `
    <div class="rockit-coupon-card ${presetClass}" data-index="${index}" style="${customStyles}">
      <div class="rockit-coupon-info">
        <div class="rockit-coupon-offer" style="color: inherit;">🎁 ${escapeHtml(coupon.offerTitle)}</div>
        ${desc}
      </div>
      <div class="rockit-coupon-code-area">
        <span class="rockit-coupon-code hidden-code" style="${codeAreaStyle}" data-code="${escapeHtml(coupon.couponCode)}">${escapeHtml(coupon.couponCode)}</span>
        <button class="rockit-btn rockit-btn-show" data-action="toggle">Show</button>
        <button class="rockit-btn rockit-btn-copy" data-action="copy" data-code="${escapeHtml(coupon.couponCode)}">Copy</button>
      </div>
    </div>`;
}

function attachCardEvents(root) {
  root.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".rockit-coupon-card");
      const codeEl = card.querySelector(".rockit-coupon-code");
      const isHidden = codeEl.classList.contains("hidden-code");
      if (isHidden) {
        codeEl.classList.remove("hidden-code");
        btn.textContent = "Hide";
      } else {
        codeEl.classList.add("hidden-code");
        btn.textContent = "Show";
      }
    });
  });

  root.querySelectorAll('[data-action="copy"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.code;
      const card = btn.closest(".rockit-coupon-card");
      const codeEl = card.querySelector(".rockit-coupon-code");
      codeEl.classList.remove("hidden-code");
      const toggleBtn = card.querySelector('[data-action="toggle"]');
      if (toggleBtn) toggleBtn.textContent = "Hide";

      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 2000);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 2000);
      }
    });
  });
}

function buildSidebar(allCoupons, productId) {
  if (document.getElementById(`rockit-sidebar-${productId}`)) {
     const sidebarBody = document.querySelector(`#rockit-sidebar-${productId} .rockit-sidebar-body`);
     if (sidebarBody) {
        let cardsHtml = "";
        allCoupons.forEach((c, i) => cardsHtml += renderCouponCard(c, i));
        sidebarBody.innerHTML = cardsHtml;
        attachCardEvents(sidebarBody);
     }
     return;
  }

  const overlay = document.createElement("div");
  overlay.className = "rockit-sidebar-overlay";
  overlay.id = `rockit-sidebar-overlay-${productId}`;
  overlay.addEventListener("click", () => closeSidebar(productId));

  const sidebar = document.createElement("div");
  sidebar.className = "rockit-sidebar";
  sidebar.id = `rockit-sidebar-${productId}`;

  let cardsHtml = "";
  allCoupons.forEach((c, i) => {
    cardsHtml += renderCouponCard(c, i);
  });

  sidebar.innerHTML = `
    <div class="rockit-sidebar-header">
      <h3>Available Offers</h3>
      <button class="rockit-sidebar-close" id="rockit-sidebar-close-${productId}">✕</button>
    </div>
    <div class="rockit-sidebar-body">
      ${cardsHtml}
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(sidebar);

  document.getElementById(`rockit-sidebar-close-${productId}`).addEventListener("click", () => closeSidebar(productId));
  attachCardEvents(sidebar);
}

function openSidebar(productId) {
  document.getElementById(`rockit-sidebar-overlay-${productId}`).classList.add("open");
  document.getElementById(`rockit-sidebar-${productId}`).classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSidebar(productId) {
  document.getElementById(`rockit-sidebar-overlay-${productId}`).classList.remove("open");
  document.getElementById(`rockit-sidebar-${productId}`).classList.remove("open");
  document.body.style.overflow = "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
