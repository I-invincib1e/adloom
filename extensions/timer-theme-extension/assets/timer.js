
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
        
        // Fix: App proxy returns { timer: { ... } }, effectively wrapping it doubly or singly dependant on proxy
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
            console.error("Rockit Timer: Invalid end time provided for product " + productId);
            return;
        }

        const config = JSON.parse(style || "{}");

        // --- Apply Content ---
        // Handle gradients vs solid colors vs helper classes
        const bgStyle = (config.backgroundColor && config.backgroundColor.includes('gradient')) 
          ? `background: ${config.backgroundColor};` 
          : `background-color: ${config.backgroundColor || '#fff'};`;

        const className = config.className || '';

        let html = `
          <div class="rockit-timer-box ${className}" style="
            ${bgStyle}
            border: ${config.borderSize || 0}px solid ${config.borderColor || 'transparent'};
            border-radius: ${config.borderRadius || 0}px;
            padding: ${config.padding || 12}px;
            color: ${config.titleColor || '#000'};
            font-size: ${config.fontSize || 16}px;
            font-family: ${config.typography || 'inherit'};
            box-shadow: ${className.includes('rockit-timer-bar') ? 'none' : (className.includes('neon') ? '0 0 15px rgba(0, 255, 255, 0.4)' : (className.includes('gold') ? '0 4px 15px rgba(187, 143, 44, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)'))};
            transition: all 0.3s ease;
          ">
        `;

        // Banner Layout: Title Loop Left, Timer Right
        html += `<div class="rockit-timer-text-group">`;
        if (config.title) {
          html += `<div class="rockit-timer-title" style="color: ${config.titleColor}">${config.title}</div>`;
        }
        if (config.subtitle) {
          html += `<div class="rockit-timer-subtitle" style="color: ${config.subtitleColor || '#666'}">${config.subtitle}</div>`;
        }
        html += `</div>`;

        html += `<div class="rockit-timer-digits" style="color: ${config.timerColor || config.titleColor || '#000'}">`;
        
        const labels = config.labels || { days: "D", hours: "H", minutes: "M", seconds: "S" };
        ["days", "hours", "minutes", "seconds"].forEach(unit => {
          html += `
            <div class="rockit-timer-unit">
              <div class="rockit-timer-val rockit-${unit}">00</div>
              <div class="rockit-timer-label" style="color: inherit; opacity: 0.7;">${labels[unit]}</div>
            </div>
          `;
        });

        html += `</div></div>`;
        
        container.innerHTML = html;
        container.style.display = "block";

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
        console.error("Rockit Timer Error:", e);
      }
  }); // end forEach
});
