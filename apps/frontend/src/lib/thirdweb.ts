import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({ 
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "7c261d5c14b38664a2c864850e78260d" 
});
