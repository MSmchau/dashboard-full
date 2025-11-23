/// <reference types="vite/client" />

// Vite 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_GATEWAY_URL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_AUTH_SERVICE_URL: string
  readonly VITE_DEVICE_SERVICE_URL: string
  readonly VITE_MONITOR_SERVICE_URL: string
  readonly VITE_DATA_SERVICE_URL: string
  readonly VITE_CONFIG_SERVICE_URL: string
  readonly VITE_TIMEOUT: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_RETRY_ATTEMPTS: string
  readonly VITE_WEBSOCKET_RECONNECT_INTERVAL: string
  readonly VITE_WS_RECONNECT_ATTEMPTS: string
  readonly VITE_WS_HEARTBEAT_INTERVAL: string
  readonly VITE_WS_TIMEOUT: string
  readonly VITE_WS_RECONNECT_INTERVAL: string
  readonly VITE_ENABLE_MOCK_DATA: string
  readonly VITE_BASE_URL: string
  // 更多环境变量可以在这里添加
}

// 扩展全局 ImportMeta 接口
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 扩展全局 ImportMeta 接口
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

declare const _default: import("vite").UserConfig;
export default _default;