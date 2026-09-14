// ============================================================
// ГЕНЕРАЦИЯ QR-КОДОВ
// ============================================================
// Использует библиотеку qrcode (глобал QRCode).
// При её отсутствии — резервный вариант через внешний API.
// ============================================================

function generateQR(containerId, textVal) {
    const container = document.getElementById(containerId);
    if (!container) return;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    container.style.display = "block";
    container.style.background = "#ffffff";
    container.style.overflow = "hidden";
    container.style.boxSizing = "border-box";
    container.style.width = "170px";
    container.style.height = "170px";
    container.style.margin = "0 auto";
    container.style.position = "relative";

    try {
        if (typeof QRCode !== 'undefined') {
            const wrapper = document.createElement('div');
            wrapper.style.position = "absolute";
            wrapper.style.top = "0px";
            wrapper.style.left = "0px";
            wrapper.style.width = "170px";
            wrapper.style.height = "170px";
            wrapper.style.overflow = "hidden";
            container.appendChild(wrapper);

            new QRCode(wrapper, {
                text: textVal,
                width: 170,
                height: 170,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });

            setTimeout(() => {
                let canvas = wrapper.querySelector('canvas');
                let img = wrapper.querySelector('img');
                let table = wrapper.querySelector('table');
                if (canvas) {
                    canvas.style.display = "block";
                    canvas.style.width = "170px";
                    canvas.style.height = "170px";
                    canvas.style.margin = "0";
                }
                if (img) {
                    // qrcode.js adds a fallback <img> after the canvas.
                    // Keep it hidden; otherwise a second QR appears below the first one.
                    img.style.display = "none";
                    img.style.width = "0";
                    img.style.height = "0";
                    img.style.margin = "0";
                }
                if (table) {
                    table.style.margin = "0";
                    table.style.borderCollapse = "collapse";
                    table.style.width = "170px";
                    table.style.height = "170px";
                    table.querySelectorAll('td').forEach(td => {
                        td.style.padding = "0";
                        td.style.margin = "0";
                        td.style.border = "none";
                    });
                }
            }, 50);
        } else {
            useAPIFallback(container, textVal);
        }
    } catch (e) {
        console.error("QRCode rendering error:", e);
        useAPIFallback(container, textVal);
    }
}

function useAPIFallback(container, textVal) {
    container.innerHTML = "";
    const img = document.createElement('img');
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(textVal);
    img.width = 200;
    img.height = 200;
    img.style.display = "block";
    img.style.margin = "0 auto";
    container.appendChild(img);
}
