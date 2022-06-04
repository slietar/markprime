import FSAccessBackend from './fs-access';


export default Object.fromEntries([
  FSAccessBackend
].map((Backend) => [Backend.name, Backend]));
