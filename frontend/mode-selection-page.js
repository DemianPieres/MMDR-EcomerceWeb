/**
 * Lógica específica de mode-selection.html: animación del copyright y
 * enlace a selectMode() definido en scripts.js.
 */
document.addEventListener("DOMContentLoaded", () => {
    const footerCopy = document.querySelector(".footer-copy");

    if (footerCopy) {
        setTimeout(() => {
            footerCopy.classList.add("hinge-active");
            footerCopy.addEventListener(
                "animationend",
                () => {
                    footerCopy.style.visibility = "hidden";
                    footerCopy.style.pointerEvents = "none";
                },
                { once: true }
            );
        }, 3000);
    }

    const btnAdmin = document.getElementById("btn-admin");
    const btnUsuario = document.getElementById("btn-usuario");

    if (btnAdmin) {
        btnAdmin.addEventListener("click", () => {
            if (typeof selectMode === "function") {
                selectMode("admin");
            }
        });
    }

    if (btnUsuario) {
        btnUsuario.addEventListener("click", () => {
            if (typeof selectMode === "function") {
                selectMode("user");
            }
        });
    }
});
