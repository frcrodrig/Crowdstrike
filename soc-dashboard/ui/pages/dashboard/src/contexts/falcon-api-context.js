import FalconApi from '@crowdstrike/foundry-js';
import { createContext, useEffect, useMemo, useState } from 'react';

const FalconApiContext = createContext(null);

function useFalconApiContext() {
  const [isInitialized, setIsInitialized] = useState(false);
  const falcon = useMemo(() => new FalconApi(), []);
  const navigation = useMemo(() => isInitialized ? falcon.navigation : undefined, [isInitialized]);

  useEffect(() => {
    (async () => {
      await falcon.connect();

      // Expose falcon instance globally for utilities (parallel-logscale-executor, charlotte-api)
      window.falconApi = falcon;
      window.falconApi.isConnected = true;

      console.log('[FOUNDRY-TEST] Falcon connected successfully');
      console.log('[FOUNDRY-TEST] Falcon methods:', Object.keys(falcon));
      console.log('[FOUNDRY-TEST] Falcon.data exists?', !!falcon.data);
      console.log('[FOUNDRY-TEST] Falcon.logscale exists?', !!falcon.logscale);
      console.log('[FOUNDRY-TEST] Falcon.logscale type:', typeof falcon.logscale);
      if (falcon.logscale) {
        console.log('[FOUNDRY-TEST] Falcon.logscale methods:', Object.keys(falcon.logscale));
        console.log('[FOUNDRY-TEST] Falcon.logscale.runSavedSearch type:', typeof falcon.logscale.runSavedSearch);
      }

      setIsInitialized(true);
    })();
  }, []);

  return { falcon, navigation, isInitialized };
}

export { useFalconApiContext, FalconApiContext };