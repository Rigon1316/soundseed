import { ResponseType, exchangeCodeAsync, makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

// Endpoints oficiales de Spotify
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export function useSpotifyAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  const redirectUri = makeRedirectUri({
    scheme: 'soundseed'
  });

  console.log("\n\n=== AGREGA ESTA URL EXACTA A TU SPOTIFY DASHBOARD ===");
  console.log(redirectUri);
  console.log("====================================================\n\n");

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID as string,
      scopes: [
        'user-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
      ],
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  // 1. Al iniciar la app, verificar si ya tenemos un token guardado
  useEffect(() => {
    const loadToken = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync('spotify_token');
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (e) {
        console.error('Error cargando token', e);
      } finally {
        setIsCheckingToken(false);
      }
    };
    loadToken();
  }, []);

  // 2. Si el usuario acaba de iniciar sesión, obtener y guardar el nuevo token
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;

      exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID as string,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request?.codeVerifier || '',
          },
        },
        discovery
      ).then(async (res) => {
        setToken(res.accessToken);
        // Guardar el token para la próxima vez
        await SecureStore.setItemAsync('spotify_token', res.accessToken);
      }).catch((err) => {
        console.error('Error al intercambiar el código por el token:', err);
      });
    }
  }, [response]);

  // Función opcional para cerrar sesión
  const logout = async () => {
    await SecureStore.deleteItemAsync('spotify_token');
    setToken(null);
  };

  return { token, request, promptAsync, logout, isCheckingToken, redirectUri };
}
