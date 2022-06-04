const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit',
  numeric: 'auto',
  style: 'long'
});


export function formatRelativeTime(time) {
  return rtf.format(Math.round((Date.now() - time) / 3600e3 / 24), 'day');
}
