declare module 'react-datepicker';

declare module 'sharp' {
  interface Sharp {
    resize(width?: number, height?: number, options?: object): Sharp;
    toBuffer(): Promise<Buffer>;
    // Add other methods you use
  }

  function sharp(input?: string | Buffer): Sharp;
  export = sharp;
}