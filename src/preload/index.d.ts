import { ElectronAPI } from '@electron-toolkit/preload'

interface UpdateInfo {
  updateAvailable: boolean
  currentVersion: string
  latestVersion: string
  updateInfo?: any
  error?: string
}

interface DownloadResult {
  success: boolean
  error?: string
}

interface API {
  checkForUpdates: () => Promise<UpdateInfo>
  downloadUpdate: () => Promise<DownloadResult>
  installUpdate: () => Promise<void>
  getAppVersion: () => Promise<string>
  onUpdateAvailable: (callback: (info: any) => void) => void
  onUpdateNotAvailable: (callback: (info: any) => void) => void
  onDownloadProgress: (callback: (progress: any) => void) => void
  onUpdateDownloaded: (callback: (info: any) => void) => void
  onUpdateError: (callback: (error: string) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
