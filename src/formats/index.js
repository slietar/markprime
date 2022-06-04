import MarkdownFormat from './markdown';


export const Formats = Object.fromEntries([
  MarkdownFormat
].map((Format) => [Format.name, Format]));


export function findFormat(filename) {
  let segments = filename.split('.');

  if (segments.length < 1) {
    return null;
  }

  let extension = segments.at(-1);

  switch (extension) {
    case 'md': return MarkdownFormat;
  }

  return null;
}
