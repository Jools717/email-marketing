export {};

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    dataLayer: any[];
  }
}
