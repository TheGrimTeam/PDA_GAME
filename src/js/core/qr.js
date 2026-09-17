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

    // Белая подложка, отступы, скругление и overflow задаются классом .qr-surface.
    // Здесь только гарантируем, что контейнер видим и является точкой отсчёта
    // для абсолютно позиционированного wrapper.
    container.classList.add("qr-surface");
    container.style.display = "block";
    container.style.position = "relative";

    try {
        if (typeof QRCode !== 'undefined') {
            const wrapper = document.createElement('div');
            // Центрируем QR внутри контейнера .qr-surface, у которого
            // padding: 10px и переменная ширина (190–230px).
            wrapper.style.position = "absolute";
            wrapper.style.top = "50%";
            wrapper.style.left = "50%";
            wrapper.style.transform = "translate(-50%, -50%)";
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
    // Класс .qr-surface гарантирует белую подложку контейнера,
    // а .qr-fallback-img — что это единственное видимое изображение QR.
    container.classList.add("qr-surface");
    const img = document.createElement('img');
    img.className = "qr-fallback-img";
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(textVal);
    img.width = 200;
    img.height = 200;
    container.appendChild(img);
}
