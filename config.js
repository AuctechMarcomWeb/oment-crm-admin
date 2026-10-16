/* Backend address.
   On your own computer (localhost) the local backend is used;
   on the live site (work.auctech.in) the live backend is used.
   Change the live address here if your API domain changes. */
(function () {
  var h = location.hostname;
  var local = !h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:';
  window.OMENT_API_BASE = 'https://workapi.auctech.in/api';
  // window.OMENT_API_BASE = 'http://localhost:5000/api';
})();
// window.OMENT_API_BASE = 'https://psa-oment.onrender.com/api';
window.OMENT_POLL_MS = 15000;
