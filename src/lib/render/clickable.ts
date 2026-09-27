// Click-to-edit for the editor's live preview only. The preview iframe runs with
// sandbox="allow-scripts" (no allow-same-origin): this script can only post a message
// naming what was clicked; it cannot read the editor, cookies or storage.
export const CLICK_SCRIPT = `document.addEventListener('click',function(e){var t=e.target.closest('[data-src]');if(!t)return;e.preventDefault();parent.postMessage({type:'cv-click',src:t.getAttribute('data-src')},'*')});`;
export const CLICK_CSS = `[data-src]{cursor:pointer;border-radius:2px}[data-src]:hover{outline:1.5px dashed #2f6fb0;outline-offset:2px;background:rgba(47,111,176,.06)}`;

/** Removes source markers from exported output (they are only produced by our own templates). */
export const stripSourceMarkers = (html: string) => html.replace(/ data-src="[a-z]+(?::[\w-]+)*"/g, '');
