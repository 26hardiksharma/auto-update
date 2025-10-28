import Versions from './components/Versions'
import UpdateChecker from './components/UpdateChecker'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <div className="app-header">
        <img alt="logo" className="logo" src={electronLogo} />
        <h1 className="app-title">Auto-Update App</h1>
        <div className="creator">Powered by Electron + Vite + React</div>
      </div>

      <div className="text">
        Modern desktop app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
        &nbsp;featuring automatic updates
      </div>

      <UpdateChecker />

      <div className="footer-section">
        <p className="tip">
          Press <code>F12</code> to open DevTools
        </p>
        <div className="actions">
          <div className="action">
            <a href="https://electron-vite.org/" target="_blank" rel="noreferrer noopener">
              📚 Documentation
            </a>
          </div>
          <div className="action">
            <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
              🔗 Send IPC
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
