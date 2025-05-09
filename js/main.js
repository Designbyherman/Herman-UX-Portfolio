document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-menu a');
  
  // Toggle mobile menu
  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });
  
  // Close mobile menu when clicking on a link
  mobileLinks.forEach(link => {
    link.addEventListener('click', function() {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(event) {
    const isClickInside = hamburger.contains(event.target) || mobileMenu.contains(event.target);
    
    if (!isClickInside && mobileMenu.classList.contains('active')) {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    }
  });
});

const form = document.getElementById('contact-form');
const confirmation = document.getElementById('confirmation-message');

if (form) { // check if form exists on this page
  form.addEventListener('submit', function(event) {
    event.preventDefault(); // stop default submit
    const formData = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    }).then(response => {
      if (response.ok) {
        form.reset();
        confirmation.style.display = 'block';
        setTimeout(() => {
          confirmation.style.display = 'none';
        }, 4000);
      } else {
        alert('Oops! Something went wrong. Please try again.');
      }
    }).catch(error => {
      alert('Error: ' + error.message);
    });
  });
}
