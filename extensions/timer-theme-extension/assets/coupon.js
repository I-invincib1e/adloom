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

      let html = `
        <div class="rockit-offers-container">
          <div class="rockit-offers-header">
            <strong>Offers For You</strong> <span>(Can be applied at checkout)</span>
          </div>
          <div class="rockit-offers-list">
      `;
      
      visibleCoupons.forEach((c, i) => {
        html += renderCouponCard(c, i, false);
      });

      if (hiddenCoupons.length > 0) {
        html += `<div class="rockit-hidden-offers" id="rockit-hidden-offers-${productId}" style="display: none;">`;
        hiddenCoupons.forEach((c, i) => {
          html += renderCouponCard(c, maxVisible + i, true);
        });
        html += `</div>`;
        html += `<button class="rockit-more-btn" id="rockit-more-btn-${productId}">
          +${hiddenCoupons.length} more offer${hiddenCoupons.length > 1 ? "s" : ""}
        </button>`;
      }

      html += `</div></div>`;

      container.innerHTML = html;
      container.style.display = "block";
      setTimeout(() => container.style.opacity = "1", 50);

      attachCardEvents(container);
      
      if (hiddenCoupons.length > 0) {
        const moreBtn = document.getElementById(`rockit-more-btn-${productId}`);
        const hiddenArea = document.getElementById(`rockit-hidden-offers-${productId}`);
        if(moreBtn && hiddenArea) {
           moreBtn.addEventListener("click", () => {
             hiddenArea.style.display = "block";
             moreBtn.style.display = "none";
           });
        }
      }
    } catch (e) {
      console.error("[Loom Coupons]", e);
    }
  });
}

function renderCouponCard(coupon, index, isHiddenInitial) {
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
        --rc-bg: ${styleObj.backgroundColor || "#fafafa"};
        --rc-border: ${styleObj.borderColor || "#e3e3e3"};
        --rc-text: ${styleObj.textColor || "#1a1a1a"};
        --rc-code-bg: ${styleObj.codeColor || ""};
        border-style: ${styleObj.borderStyle || "solid"};
        border-radius: ${styleObj.borderRadius || 8}px;
        font-family: ${styleObj.typography || "inherit"};
      `;
    } else if (coupon.style) {
      presetClass = `coupon-${coupon.style}`;
    }
  } catch (e) {
    console.error("Style parse error", e);
  }

  const codeColorVal = styleObj.codeColor || "var(--rc-text)";
  const bgCodeVal = styleObj.backgroundColor === "#ffffff" ? "#fdfdfd" : "#ffffff";
  const codeAreaStyle = `border: 1px solid var(--rc-border); color: ${codeColorVal}; background: ${bgCodeVal}; font-size: ${styleObj.fontSize || 13}px;`;
  
  const discountIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5V2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5V21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12V12Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M7 12L17 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 8L10 8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 16L14 16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const tagIconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;

  return `
    <div class="rockit-coupon-card ${presetClass}" data-index="${index}" style="${customStyles}">
      <div class="rockit-coupon-header" data-action="toggle-accordion">
        <div class="rockit-coupon-header-left">
          <div class="rockit-coupon-icon">
            ${tagIconSvg}
            <div class="rockit-percent-badge">%</div>
          </div>
          <div class="rockit-coupon-info">
            <div class="rockit-coupon-offer">${escapeHtml(coupon.offerTitle)}</div>
            ${desc}
          </div>
        </div>
        <div class="rockit-coupon-chevron">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>
      <div class="rockit-coupon-body">
        <div class="rockit-coupon-body-content">
          <span class="rockit-coupon-code" style="${codeAreaStyle}">${escapeHtml(coupon.couponCode)}</span>
          <button class="rockit-btn-copy-text" data-action="copy" data-code="${escapeHtml(coupon.couponCode)}">Copy Code</button>
        </div>
      </div>
    </div>`;
}

function attachCardEvents(root) {
  root.querySelectorAll('[data-action="toggle-accordion"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".rockit-coupon-card");
      card.classList.toggle("is-expanded");
    });
  });

  root.querySelectorAll('[data-action="copy"]').forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); // prevent accordion toggle
      const code = btn.dataset.code;
      const originalText = btn.textContent;

      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = originalText;
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
          btn.textContent = originalText;
          btn.classList.remove("copied");
        }, 2000);
      }
    });
  });
}

// Sidebars removed.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
