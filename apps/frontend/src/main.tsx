import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThirdwebProvider } from "thirdweb/react";
import App from './App'
import { NetworkProvider } from './providers/NetworkProvider'
import { SolanaProvider } from './providers/SolanaProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NetworkProvider>
      <ThirdwebProvider>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </ThirdwebProvider>
    </NetworkProvider>
  </React.StrictMode>,
)
