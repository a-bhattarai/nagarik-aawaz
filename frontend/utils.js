/* ================================================================
   NAGARIK AAWAZ — utils.js
   Shared utility functions used across all dashboard scripts.
   Include this BEFORE other script tags in every dashboard HTML.
================================================================ */

/**
 * Escape HTML special characters to prevent XSS when inserting
 * user-supplied text into innerHTML.
 * Converts: & < > " to their safe entity equivalents.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}