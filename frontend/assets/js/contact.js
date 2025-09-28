const form = document.querySelector('[data-contact-form]');
const statusMessage = document.querySelector('[data-contact-status]');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('name');
    statusMessage.textContent = `Thanks, ${name || 'there'}! Our team will reach out shortly.`;
    form.reset();
  });
}
