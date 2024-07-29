declare module 'pdf-to-base64' {
    function pdf2base64(input: string): Promise<string>;
    export = pdf2base64;
  }