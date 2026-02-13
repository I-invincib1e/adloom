document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".rockit-timer-wrapper");
  if (!container) return;

  const productId = container.dataset.productId;
  if (!productId) return;

  try {
    const res = await fetch(`/apps/timer?productId=${productId}`);
    if (!res.ok) return;
    
    const data = await res.json();
    if (!data.timer) return; // No active timer for this product

    const { timer, endTime } = data;
    const style = JSON.parse(timer.style || "{}");
    const labels = style.labels || { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" };

    // Apply container styles
    const content = container.querySelector(".rockit-timer-content");
    content.style.backgroundColor = style.backgroundColor || "#ffffff";
    content.style.border = `${style.borderSize || 0}px solid ${style.borderColor || "#000000"}`;
    content.style.borderRadius = `${style.borderRadius || 8}px`;
    content.style.padding = `${style.padding || 20}px`;
    content.style.textAlign = "center";
    content.style.fontFamily = "inherit"; // Use theme font
    
    // Build HTML
    let html = "";
    if (style.title) {
        html += `<div style="font-size: 18px; font-weight: bold; margin-bottom: 4px; color: ${style.titleColor || "#000000"}">${style.title}</div>`;
    }
    if (style.subtitle) {
        html += `<div style="font-size: 14px; margin-bottom: 12px; color: ${style.subtitleColor || "#000000"}">${style.subtitle}</div>`;
    }
    
    html += `<div class="rockit-timer-digits" style="display: flex; justify-content: center; gap: 16px; color: ${style.timerColor || "#000000"}"></div>`;
    
    content.innerHTML = html;
    container.style.display = "block";

    const digitsContainer = content.querySelector(".rockit-timer-digits");
    
    // Countdown Logic
    const end = new Date(endTime).getTime();
    
    function update() {
        const now = new Date().getTime();
        const distance = end - now;
        
        if (distance < 0) {
            container.style.display = "none";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const pad = (n) => n < 10 ? `0${n}` : n;

        digitsContainer.innerHTML = [
            { val: pad(days), label: labels.days },
            { val: pad(hours), label: labels.hours },
            { val: pad(minutes), label: labels.minutes },
            { val: pad(seconds), label: labels.seconds }
        ].map(item => `
            <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; line-height: 1;">${item.val}</div>
                <div style="font-size: 11px; text-transform: uppercase; margin-top: 4px; opacity: 0.8;">${item.label}</div>
            </div>
        `).join("");
    }
    
    update();
    setInterval(update, 1000);

  } catch (e) {
    console.error("Rockit Timer Error:", e);
  }
});
