declare module "qrcode-terminal" {
  interface QRCodeOptions {
    small?: boolean;
  }
  function generate(text: string, opts?: QRCodeOptions): void;
  function generate(
    text: string,
    opts: QRCodeOptions,
    callback: (qr: string) => void
  ): void;
  export { generate };
  export default { generate };
}
