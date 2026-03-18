/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number
    height?: number
    margin?: number
    colorDark?: string
    colorLight?: string
  }

  function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeOptions): Promise<void>
  function toCanvas(
    text: string,
    options: QRCodeOptions,
    callback: (error: any, canvas: HTMLCanvasElement) => void
  ): void
}
