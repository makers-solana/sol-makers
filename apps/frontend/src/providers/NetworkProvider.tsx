import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SolanaNetwork = 'devnet' | 'mainnet';

interface NetworkContextType {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [network, setNetworkState] = useState<SolanaNetwork>(() => {
    const saved = localStorage.getItem('solana-network');
    return (saved === 'mainnet' || saved === 'devnet') ? saved : 'devnet';
  });

  const setNetwork = (newNetwork: SolanaNetwork) => {
    setNetworkState(newNetwork);
    localStorage.setItem('solana-network', newNetwork);
    // Optional: Reload to ensure all providers (Solana, Thirdweb) refresh their state
    // window.location.reload(); 
  };

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
