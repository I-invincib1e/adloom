/**
 * Rockit Coupon Offers – Storefront Script
 * Fetches active coupons from App Proxy, renders cards with show/hide + copy,
 * and opens a sidebar drawer when there are more than 2 offers.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".rockit-coupons-wrapper");
  if (!container) return;

  const productId = container.dataset.productId;
  if (!productId) return;

  try {
    const res = await fetch(`/apps/timer?type=coupons&productId=${productId}`);
    if (!res.ok) return;

    const data = await res.json();
    if (!data.coupons || data.coupons.length === 0) return;

    const coupons = data.coupons;
    const maxVisible = 2;
    const visibleCoupons = coupons.slice(0, maxVisible);
    const hiddenCoupons = coupons.slice(maxVisible);

    // Render visible coupon cards
    let html = "";
    visibleCoupons.forEach((c, i) => {
      html += renderCouponCard(c, i);
    });

    // "More offers" button
    if (hiddenCoupons.length > 0) {
      html += `<button class="rockit-more-btn" id="rockit-more-btn">
        View ${hiddenCoupons.length} more offer${hiddenCoupons.length > 1 ? "s" : ""} →
      </button>`;
    }

    container.innerHTML = html;
    container.style.display = "block";

    // Attach events to visible cards
    attachCardEvents(container);

    // Build sidebar if there are hidden coupons
    if (hiddenCoupons.length > 0) {
      buildSidebar(coupons);
      document.getElementById("rockit-more-btn").addEventListener("click", () => {
        openSidebar();
      });
    }
  } catch (e) {
    console.error("[Rockit Coupons]", e);
  }
});

function renderCouponCard(coupon, index) {
  const desc = coupon.description ? `<div class="rockit-coupon-desc">${escapeHtml(coupon.description)}</div>` : "";
  const styleClass = coupon.style ? `rockit-coupon-${coupon.style}` : "rockit-coupon-standard";
  
  return `
    <div class="rockit-coupon-card ${styleClass}" data-index="${index}">
      <div class="rockit-coupon-info">
        <div class="rockit-coupon-offer">🎁 ${escapeHtml(coupon.offerTitle)}</div>
        ${desc}
      </div>
      <div class="rockit-coupon-code-area">
        <span class="rockit-coupon-code hidden-code" data-code="${escapeHtml(coupon.couponCode)}">${escapeHtml(coupon.couponCode)}</span>
        <button class="rockit-btn rockit-btn-show" data-action="toggle">Show</button>
        <button class="rockit-btn rockit-btn-copy" data-action="copy" data-code="${escapeHtml(coupon.couponCode)}">Copy</button>
      </div>
    </div>`;
}

function attachCardEvents(root) {
  // Toggle show/hide
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

  // Copy
  root.querySelectorAll('[data-action="copy"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.code;
      // Also reveal the code when copying
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
        // Fallback
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

function buildSidebar(allCoupons) {
  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "rockit-sidebar-overlay";
  overlay.id = "rockit-sidebar-overlay";
  overlay.addEventListener("click", closeSidebar);

  // Sidebar
  const sidebar = document.createElement("div");
  sidebar.className = "rockit-sidebar";
  sidebar.id = "rockit-sidebar";

  let cardsHtml = "";
  allCoupons.forEach((c, i) => {
    cardsHtml += renderCouponCard(c, i);
  });

  sidebar.innerHTML = `
    <div class="rockit-sidebar-header">
      <h3>Available Offers</h3>
      <button class="rockit-sidebar-close" id="rockit-sidebar-close">✕</button>
    </div>
    <div class="rockit-sidebar-body">
      ${cardsHtml}
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(sidebar);

  document.getElementById("rockit-sidebar-close").addEventListener("click", closeSidebar);

  // Attach events in sidebar
  attachCardEvents(sidebar);
}

function openSidebar() {
  document.getElementById("rockit-sidebar-overlay").classList.add("open");
  document.getElementById("rockit-sidebar").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  document.getElementById("rockit-sidebar-overlay").classList.remove("open");
  document.getElementById("rockit-sidebar").classList.remove("open");
  document.body.style.overflow = "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
