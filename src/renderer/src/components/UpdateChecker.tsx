import { useState, useEffect } from 'react'
import './UpdateChecker.css'

interface UpdateInfo {
  updateAvailable: boolean
  currentVersion: string
  latestVersion: string
  updateInfo?: any
  error?: string
}

interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

function UpdateChecker(): React.JSX.Element {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Register event listeners
    window.api.onUpdateAvailable((info) => {
      console.log('Update available:', info)
    })

    window.api.onUpdateNotAvailable((info) => {
      console.log('Update not available:', info)
    })

    window.api.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    window.api.onUpdateDownloaded((info) => {
      console.log('Update downloaded:', info)
      setUpdateDownloaded(true)
      setDownloading(false)
    })

    window.api.onUpdateError((errorMsg) => {
      console.error('Update error:', errorMsg)
      setError(errorMsg)
      setDownloading(false)
      setChecking(false)
    })
  }, [])

  const checkForUpdates = async (): Promise<void> => {
    setChecking(true)
    setError(null)
    try {
      const result = await window.api.checkForUpdates()
      setUpdateInfo(result)
      if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates')
    } finally {
      setChecking(false)
    }
  }

  const downloadUpdate = async (): Promise<void> => {
    setDownloading(true)
    setError(null)
    try {
      const result = await window.api.downloadUpdate()
      if (!result.success && result.error) {
        setError(result.error)
        setDownloading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update')
      setDownloading(false)
    }
  }

  const installUpdate = async (): Promise<void> => {
    try {
      await window.api.installUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install update')
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="update-checker">
      <h2>App Updates</h2>

      <div className="update-section">
        <button
          onClick={checkForUpdates}
          disabled={checking || downloading}
          className="btn-primary"
        >
          {checking ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {updateInfo && !error && (
        <div className="update-info">
          <div className="version-info">
            <p>
              <strong>Current Version:</strong> {updateInfo.currentVersion}
            </p>
            <p>
              <strong>Latest Version:</strong> {updateInfo.latestVersion}
            </p>
          </div>

          {updateInfo.updateAvailable ? (
            <div className="update-available">
              <p className="update-message">🎉 A new version is available!</p>

              {!updateDownloaded && !downloading && (
                <button onClick={downloadUpdate} className="btn-success">
                  Download Update
                </button>
              )}

              {downloading && downloadProgress && (
                <div className="download-progress">
                  <p>Downloading update...</p>
                  <div className="progress-bar">
                    {/* eslint-disable-next-line react/forbid-dom-props */}
                    <div
                      className="progress-fill"
                      style={{ width: `${downloadProgress.percent}%` }}
                    ></div>
                  </div>
                  <p className="progress-text">
                    {downloadProgress.percent.toFixed(1)}% -
                    {formatBytes(downloadProgress.transferred)} /{' '}
                    {formatBytes(downloadProgress.total)} (
                    {formatBytes(downloadProgress.bytesPerSecond)}/s)
                  </p>
                </div>
              )}

              {updateDownloaded && (
                <div className="update-ready">
                  <p className="success-message">✅ Update downloaded and ready to install!</p>
                  <button onClick={installUpdate} className="btn-install">
                    Restart and Install
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="up-to-date">
              <p className="success-message">✅ You're running the latest version!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UpdateChecker
