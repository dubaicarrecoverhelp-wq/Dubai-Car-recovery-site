// Inserted into app.js by the performance build overlay. Reuses the existing
// booking field, status regions and business configuration.
function requestLocation(event) {
 if (!window.isSecureContext || !navigator.geolocation) {
  locationFailure('Location is unavailable here. Open the HTTPS site or share a landmark on WhatsApp.');return;
 }
 const openWhatsApp = !event?.currentTarget?.closest('.booking-form');
 for (const button of locationButtons) {
  button.disabled = true;button.classList.remove('is-ready');
  button.querySelector('span').textContent = 'Finding your location';
 }
 const previous = currentLocation?.mapsURL;
 for (const form of document.querySelectorAll('.booking-form')) {
  const input = form.elements.location;
  if (previous && input?.value.trim() === 'Current location: ' + previous) {
   input.value = '';input.dispatchEvent(new Event('input', {bubbles: true}));
  }
 }
 currentLocation = null;
 showLocation('Allow location access to prepare your pickup pin in WhatsApp. Review it there and tap Send.');
 findPickup({
  geolocation: navigator.geolocation,
  success(position) {
   resetLocationButtons();useLocation(position);
   const approximate = position.coords.accuracy > 100;
   showLocation(`Location found, within ${Math.ceil(position.coords.accuracy)} m. ${approximate ? 'This pin is approximate. Check it before sharing.' : 'Review your pickup pin and tap Send in WhatsApp.'}`, 'success', currentLocation.mapsURL);
   const text = `Hello ${business.name}, I need towing assistance.\nMy pickup location: ${currentLocation.mapsURL}\nDevice-reported accuracy: within ${currentLocation.accuracy} metres.\nPlease confirm availability and a quote.`;
   const url = 'https://wa.me/' + business.whatsapp + '?text=' + encodeURIComponent(text);
   for (const box of locationResults) {
    const link = document.createElement('a');link.href = url;
    link.className = 'btn whatsapp';link.textContent = 'Send location on WhatsApp';box.append(link);
   }
   if (openWhatsApp && !approximate) {
    if (window.__TOWING_TEST_MODE__) window.__preparedLocationWhatsAppURL = url;
    else location.assign(url);
   }
  },
  failure(error) {
   const messages = {1: 'Location permission was denied. You can still share a pickup pin or landmark on WhatsApp.', 2: 'Your device could not find your location. Share a landmark or map pin on WhatsApp.', 3: 'Location is taking too long. Try again, or share your pickup pin or landmark on WhatsApp.'};
   locationFailure(messages[error?.code] || messages[2]);
  }
 });
}
