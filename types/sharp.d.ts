declare module 'sharp' {
    interface Sharp {
      // Add method signatures as needed
      resize(width?: number, height?: number, options?: object): Sharp;
      toBuffer(): Promise<Buffer>;
      // Add other methods you use
    }
  
    function sharp(input?: string | Buffer): Sharp;
  
    export = sharp;
  }