import UpdateChecker from './components/UpdateChecker'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  return (
    <>
      <div className="app-header">
        <img alt="logo" className="logo" src={electronLogo} />
        <h1 className="app-title">Auto-Update App</h1>
        <div className="creator">Powered by Electron + Vite + React</div>
      </div>

      <div className="text">
       Release 1.0.4
      </div>

      <UpdateChecker />
    </>
  )
}

export default App
