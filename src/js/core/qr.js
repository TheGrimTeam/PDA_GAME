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

    // Белая подложка, отступы и скругление задаются классом .qr-surface.
    // QR рендерится прямо в контейнер, поэтому дополнительная обёртка не нужна.
    container.classList.add("qr-surface");
    container.style.display = "block";

    try {
        if (typeof QRCode !== 'undefined') {
            // QR рендерится прямо в контейнер .qr-surface. Контейнер уже имеет
            // padding: 10px и box-sizing: border-box, поэтому размер QR (150px)
            // гарантированно помещается во внутреннюю область любого из
            // существующих контейнеров (190–230px).
            const QR_SIZE = 150;

            new QRCode(container, {
                text: textVal,
                width: QR_SIZE,
                height: QR_SIZE,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });

            setTimeout(() => {
                let canvas = container.querySelector('canvas');
                let img = container.querySelector('img');
                let table = container.querySelector('table');
                if (canvas) {
                    canvas.style.width = QR_SIZE + "px";
                    canvas.style.height = QR_SIZE + "px";
                    canvas.style.margin = "0 auto";
                }
                if (img) {
                    // qrcode.js добавляет служебный <img> рядом с canvas.
                    // Скрываем его, чтобы не дублировать QR (canvas уже виден).
                    img.style.display = "none";
                    img.style.width = "0";
                    img.style.height = "0";
                    img.style.margin = "0";
                }
                if (table) {
                    table.style.margin = "0 auto";
                    table.style.borderCollapse = "collapse";
                    table.style.width = QR_SIZE + "px";
                    table.style.height = QR_SIZE + "px";
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
