const fromContainer = document.querySelector('.from-container');
const logLink = document.querySelector('.log-link');
const regLink = document.querySelector('.reg-link');
const navBtn = document.querySelector('.navbar-btn');
const closeIcone = document.querySelector('.close-icon');

regLink.addEventListener('click', ()=> {
    fromContainer.classList.add('active');
});
logLink.addEventListener('click', ()=> {
    fromContainer.classList.remove('active');
});
navBtn.addEventListener('click', ()=> {
    fromContainer.classList.add('active-popup');
});
closeIcone.addEventListener('click', ()=> {
    fromContainer.classList.remove('active-popup');
});
document.querySelectorAll('.input-box input').forEach(input => {
    input.addEventListener('input', () => {
        if (input.value) {
            input.classList.add('filled');
        } else {
            input.classList.remove('filled');
        }
    });
});
