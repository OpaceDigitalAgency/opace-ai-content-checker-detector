declare module '*.png' {
  const dataUrl: string;
  export default dataUrl;
}

declare module '*.woff2' {
  const dataUrl: string;
  export default dataUrl;
}

declare module 'opace:worker' {
  const source: string;
  export default source;
}
