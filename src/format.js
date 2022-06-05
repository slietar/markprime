const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit',
  numeric: 'auto',
  style: 'long'
});


export function formatRelativeTime(time) {
  return rtf.format(Math.round((time - Date.now()) / 3600e3 / 24), 'day');
}
