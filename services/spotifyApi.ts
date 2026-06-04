const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Función auxiliar para manejar respuestas
async function handleResponse(response: Response) {
  const text = await response.text();
  if (!response.ok) {
    console.error('Spotify API Error:', response.status, text);
    throw new Error(`Spotify Error: ${response.status} - ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

export const SpotifyApi = {
  // 1. Obtener los datos del usuario actual (necesitamos su ID para crear playlists)
  async getCurrentUser(token: string) {
    const response = await fetch(`${SPOTIFY_API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // 2. Buscar artistas por nombre (para autocompletado y sugerencias)
  async searchArtists(token: string, query: string, limit: number = 5) {
    if (!query.trim()) return [];
    
    const response = await fetch(
      `${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await handleResponse(response);
    return data.artists?.items || [];
  },

  // 3. Obtener canciones recomendadas (Workaround usando Search porque top-tracks también está restringido)
  async getRecommendations(token: string, artistNames: string[], limit: number = 25) {
    let allTracks: any[] = [];
    
    // Buscar canciones para cada artista
    for (const name of artistNames.slice(0, 5)) {
      try {
        const response = await fetch(
          `${SPOTIFY_API_URL}/search?q=artist:${encodeURIComponent(name)}&type=track&limit=10`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await handleResponse(response);
        if (data && data.tracks && data.tracks.items) {
          allTracks = [...allTracks, ...data.tracks.items];
        }
      } catch (error) {
        console.warn('No se pudieron obtener tracks para el artista', name);
      }
    }

    // Mezclar la lista de canciones para que no suenen todos del mismo artista seguido
    for (let i = allTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
    }

    // Retornar solo la cantidad solicitada
    return allTracks.slice(0, limit);
  },

  // 4. Crear una nueva playlist
  async createPlaylist(token: string, userId: string, artistName: string) {
    const response = await fetch(`${SPOTIFY_API_URL}/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Mix de ${artistName} 🎧`,
        description: 'Generada automáticamente por SoundSeed',
        public: false, // La hacemos privada por defecto
      }),
    });
    return handleResponse(response);
  },

  // 5. Agregar las canciones a la playlist creada
  async addTracksToPlaylist(token: string, playlistId: string, trackUris: string[]) {
    const response = await fetch(`${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    });
    return handleResponse(response);
  },
};
