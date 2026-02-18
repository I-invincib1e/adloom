
document.addEventListener("DOMContentLoaded", async () => {
  // Use a unique class or attribute to find the container
  // We might have multiple containers if there are multiple product blocks.
  const containers = document.querySelectorAll(".rockit-timer-wrapper");
  if (containers.length === 0) return;

  // Process each container independently
  containers.forEach(async (container) => {
      const productId = container.dataset.productId;
      if (!productId) return;

      try {
        // Cache busting to prevent stale data
        const res = await fetch(`/apps/timer?productId=${productId}&t=${Date.now()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        // Robust check for nested timer object
        const timerData = data.timer?.timer || data.timer;

        if (!timerData) {
          container.style.display = "none";
          return;
        }

        const { endTime, style } = timerData;
        
        // Date parsing safety
        if (!endTime) return;
        const end = new Date(endTime).getTime();
        // Guard invalid date
        if (isNaN(end)) {
            console.error("Loom Timer: Invalid end time provided for product " + productId);
            return;
        }

        const config = JSON.parse(style || "{}");

        // --- Placement Logic (Announcement Bar Mode) ---
        // Target common header selectors to ensure it appears as an announcement bar
        // We prioritizing finding the site header to inject ONLY once if multiple timers exist (though usually one per page)
        
        const isHomePage = window.location.pathname === "/" || window.location.pathname === "";
        const isProductPage = window.location.pathname.includes("/products/");

        // Only show on Home or Product pages as requested
        if (!isHomePage && !isProductPage) {
           container.style.display = "none";
           return;
        }

        // Force Announcement Bar Placement
        // Try to find the header
        const headerSelectors = [
            "#shopify-section-header",
            "header.site-header",
            ".header-wrapper",
            "header",
            ".section-header"
        ];
        
        let targetEl = null;

        // If config has a specific selector, try that first (backward compatibility), else scan defaults
        if (config.cssSelector) {
             targetEl = document.querySelector(config.cssSelector);
        }

        if (!targetEl) {
            for (const selector of headerSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    targetEl = el;
                    break;
                }
            }
        }

        if (targetEl) {
            // Inject as the VERY FIRST element in the header (Announcement Bar style)
            // Or before the header if it's sticky/fixed, but usually inside or before works best.
            // Let's try inserting BEFORE the header to be safe as a top bar.
            targetEl.parentNode.insertBefore(container, targetEl);
            container.style.display = "block";
            container.style.width = "100%";
            container.style.zIndex = "9999"; // Ensure visibility
        } else {
             console.warn("Loom Timer: Could not find header to inject announcement bar.");
             // Fallback: Leave it where it was rendered (likely in product block if app block used)
             container.style.display = "block";
        }

        // --- Apply Content ---
        const bgStyle = (config.backgroundColor && config.backgroundColor.includes('gradient')) 
          ? `background: ${config.backgroundColor};` 
          : `background-color: ${config.backgroundColor || '#000'};`;

        const className = config.className || 'rockit-timer-bar';

        // Simplify structure for announcement bar
        let html = `
          <div class="rockit-timer-box ${className}" style="
            ${bgStyle}
            border-top: ${config.borderSize || 0}px solid ${config.borderColor || 'transparent'};
            border-bottom: ${config.borderSize || 0}px solid ${config.borderColor || 'transparent'};
            padding: ${config.padding || 10}px;
            color: ${config.titleColor || '#fff'};
            font-size: ${config.fontSize || 15}px;
            font-family: ${config.typography || 'inherit'};
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            width: 100%;
            transition: all 0.3s ease;
          ">
        `;

        html += `<div class="rockit-timer-text-group" style="display: flex; gap: 10px; align-items: center;">`;
        if (config.title) {
          html += `<div class="rockit-timer-title" style="font-weight: bold;">${config.title}</div>`;
        }
        if (config.subtitle) {
          html += `<div class="rockit-timer-subtitle" style="opacity: 0.9;">${config.subtitle}</div>`;
        }
        html += `</div>`;

        html += `<div class="rockit-timer-digits" style="display: flex; gap: 15px; align-items: center;">`;
        
        const labels = config.labels || { days: "D", hours: "H", minutes: "M", seconds: "S" };
        ["days", "hours", "minutes", "seconds"].forEach(unit => {
          html += `
            <div class="rockit-timer-unit" style="text-align: center; line-height: 1;">
              <div class="rockit-timer-val rockit-${unit}" style="font-weight: 800; font-family: monospace; font-size: 1.1em;">00</div>
              <div class="rockit-timer-label" style="font-size: 0.7em; text-transform: uppercase; opacity: 0.7;">${labels[unit]}</div>
            </div>
          `;
        });

        html += `</div></div>`;
        
        container.innerHTML = html;

        // Cache elements for updates - Scoped to this container
        const daysEl = container.querySelector(".rockit-days");
        const hoursEl = container.querySelector(".rockit-hours");
        const minutesEl = container.querySelector(".rockit-minutes");
        const secondsEl = container.querySelector(".rockit-seconds");

        // --- Countdown Logic ---
        const updateTimer = () => {
          const now = new Date().getTime();
          const distance = end - now;

          if (distance < 0) {
            container.style.display = "none";
            clearInterval(interval);
            return;
          }

          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          // Null safety updates
          if (daysEl) daysEl.innerText = days < 10 ? `0${days}` : days;
          if (hoursEl) hoursEl.innerText = hours < 10 ? `0${hours}` : hours;
          if (minutesEl) minutesEl.innerText = minutes < 10 ? `0${minutes}` : minutes;
          if (secondsEl) secondsEl.innerText = seconds < 10 ? `0${seconds}` : seconds;
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

      } catch (e) {
        console.error("Loom Timer Error:", e);
      }
  }); // end forEach
});
