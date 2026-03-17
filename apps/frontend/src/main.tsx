import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThirdwebProvider } from "thirdweb/react";
import App from './App'
import { SolanaProvider } from './providers/SolanaProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThirdwebProvider>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </ThirdwebProvider>
  </React.StrictMode>,
)
