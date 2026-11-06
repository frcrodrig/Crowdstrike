import FalconApi from '@crowdstrike/foundry-js';
import { createContext, useEffect, useMemo, useState } from 'react';

const FalconApiContext = createContext(null);

function useFalconApiContext() {
  const [isInitialized, setIsInitialized] = useState(false);
  const falcon = useMemo(() => new FalconApi(), []);
  const navigation = useMemo(() => falcon.isConnected ? falcon.navigation : undefined, [falcon.isConnected]);

  useEffect(() => {
    (async () => {
      console.log('[FOUNDRY-TEST] Connecting to Falcon...');
      try {
        await falcon.connect();
        console.log('[FOUNDRY-TEST] Falcon connected successfully');

        // Expose falcon instance globally for api-engine
        window.falconApi = falcon;
        console.log('[FOUNDRY-TEST] Falcon API exposed to window.falconApi');

        setIsInitialized(true);
      } catch (err) {
        console.error('[FOUNDRY-TEST] Falcon connect error:', err);
      }
    })();
  }, [falcon]);

  return { falcon, navigation, isInitialized };
}

export { useFalconApiContext, FalconApiContext };
