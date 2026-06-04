import { ThemedText } from '@/components/themed-text';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { SpotifyApi } from '@/services/spotifyApi';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Image, Linking, Animated } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

type Artist = { id: string; name: string };

// --- NUEVA PALETA DE COLORES (Neon Olive - TEMA CLARO) ---
const COLORS = {
  primary: '#84cc16', // Verde olivo claro / Lime vibrante
  primaryLight: '#ecfccb', // Verde muy claro para fondos
  bgTop: '#f8fafc',
  bgBottom: '#ffffff',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  textMain: '#0f172a',
  textMuted: '#64748b',
  inputBg: '#f1f5f9',
};

export default function HomeScreen() {
  const { token, promptAsync, isCheckingToken, logout, redirectUri } = useSpotifyAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<any[]>([]);
  
  const [suggestions, setSuggestions] = useState<Artist[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!token) return;

    if (text.trim().length > 2) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        try {
          const results = await SpotifyApi.searchArtists(token, text);
          setSuggestions(results.map((a: any) => ({ id: a.id, name: a.name })));
        } catch (error) {
          console.error(error);
        }
      }, 400); // 400ms debounce
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (artist: Artist) => {
    if (selectedArtists.length >= 5) {
      Alert.alert('Límite', 'Puedes agregar un máximo de 5 artistas a la vez.');
      return;
    }
    if (selectedArtists.some(a => a.id === artist.id)) {
      Alert.alert('Aviso', 'Ese artista ya está en la lista.');
      return;
    }
    setSelectedArtists([...selectedArtists, artist]);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleAddArtist = async () => {
    if (!token || !searchQuery.trim()) return;
    if (selectedArtists.length >= 5) {
      Alert.alert('Límite', 'Puedes agregar un máximo de 5 artistas a la vez.');
      return;
    }

    setIsLoading(true);
    try {
      const results = await SpotifyApi.searchArtists(token, searchQuery, 1);
      const artist = results[0];
      if (!artist) {
        Alert.alert('Error', 'No se encontró el artista. Intenta con otro nombre.');
      } else if (selectedArtists.some(a => a.id === artist.id)) {
        Alert.alert('Aviso', 'Ese artista ya está en la lista.');
      } else {
        setSelectedArtists([...selectedArtists, { id: artist.id, name: artist.name }]);
        setSearchQuery('');
        setSuggestions([]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema buscando al artista.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTrack = async (track: any) => {
    try {
      const spotifyUri = track.uri;
      const webUrl = track.external_urls?.spotify;

      // Intentar abrir la app nativa de Spotify primero
      const canOpen = await Linking.canOpenURL(spotifyUri);
      if (canOpen) {
        await Linking.openURL(spotifyUri);
      } else if (webUrl) {
        // Si no está instalada la app, abrir en el navegador
        await Linking.openURL(webUrl);
      } else {
        Alert.alert('Error', 'No se pudo abrir la canción.');
      }
    } catch (error) {
      console.warn('Error al intentar abrir Spotify:', error);
      // Fallback seguro por si falla la app nativa
      if (track.external_urls?.spotify) {
        Linking.openURL(track.external_urls.spotify).catch(e => console.error(e));
      }
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    setGeneratedTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const renderRightActions = (trackId: string, progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity 
        style={styles.deleteAction} 
        onPress={() => handleRemoveTrack(trackId)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <FontAwesome name="trash" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const handleRemoveArtist = (id: string) => {
    setSelectedArtists(selectedArtists.filter(a => a.id !== id));
  };

  const handleGeneratePlaylist = async () => {
    if (!token || selectedArtists.length === 0) return;

    setIsLoading(true);
    setGeneratedTracks([]); // Reset

    try {
      const artistNames = selectedArtists.map(a => a.name);

      let finalName = playlistName.trim();
      if (!finalName) {
        finalName = selectedArtists.length > 1
          ? `${selectedArtists[0].name} y amigos`
          : selectedArtists[0].name;
      }

      const tracks = await SpotifyApi.getRecommendations(token, artistNames, 25);
      if (!tracks || tracks.length === 0) {
        Alert.alert('Error', 'No se encontraron canciones recomendadas.');
        setIsLoading(false);
        return;
      }

      // En lugar de intentar crear la playlist en Spotify (que bloquea Apps Nuevas),
      // guardamos las canciones en el estado de nuestra app para mostrarlas!
      setGeneratedTracks(tracks);
      
      // Ya no borramos los seleccionados por si quiere crear otra mezcla después
    } catch (error) {
      console.error('Error generando playlist:', error);
      Alert.alert('Error', 'Ocurrió un problema al buscar las canciones. Posiblemente el token expiró.');
      if (error instanceof Error && error.message.includes('401')) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <LinearGradient colors={[COLORS.bgTop, COLORS.bgBottom]} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgTop }}>
        <LinearGradient
        colors={[COLORS.bgTop, COLORS.bgBottom]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, width: '100%' }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* Header alineado a la izquierda */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="play" size={20} color="#fff" style={{ marginLeft: 4 }} />
                  </View>
                  <View>
                    <ThemedText type="title" style={styles.title}>SoundSeed</ThemedText>
                    <ThemedText style={styles.subtitle}>Playlists Inteligentes</ThemedText>
                  </View>
                </View>
                {token && (
                  <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <FontAwesome name="exchange" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {!token ? (
              <View style={styles.connectContainer}>
                <View style={styles.welcomeCard}>
                  <ThemedText style={styles.welcomeTitle}>Bienvenido a tu creador de mixes</ThemedText>
                  <ThemedText style={styles.description}>
                    Combina hasta 5 de tus artistas favoritos y nuestra inteligencia creará la estación de radio perfecta directo en tu biblioteca.
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => promptAsync()}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="music" size={20} color="#fff" style={styles.buttonIcon} />
                  <ThemedText style={styles.buttonText}>Vincular cuenta de Spotify</ThemedText>
                </TouchableOpacity>
                <ThemedText style={{color: COLORS.textMuted, fontSize: 13, marginTop: 20, textAlign: 'center'}}>
                  Requiere suscripción activa a Spotify Premium
                </ThemedText>

                <View style={styles.uriContainer}>
                  <ThemedText style={styles.uriLabel}>Copia esto en tu Dashboard de Spotify:</ThemedText>
                  <TextInput 
                    style={styles.uriInput}
                    value={redirectUri}
                    editable={false}
                    selectTextOnFocus={true}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.appContainer}>
                
                {generatedTracks.length > 0 ? (
                  <View style={styles.resultsContainer}>
                    <View style={styles.resultsHeaderRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <ThemedText style={[styles.stepLabel, { marginBottom: 4 }]}>¡Aquí tienes tu Mix!</ThemedText>
                        <ThemedText style={styles.description}>Toca cualquier canción para reproducirla.</ThemedText>
                      </View>
                      <TouchableOpacity 
                        style={styles.changeArtistsButtonTop}
                        onPress={() => setGeneratedTracks([])}
                      >
                        <FontAwesome name="users" size={12} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <ThemedText style={styles.changeArtistsTextTop}>Cambiar artistas</ThemedText>
                      </TouchableOpacity>
                    </View>

                    {generatedTracks.map((track, index) => (
                      <Swipeable 
                        key={`${track.id}-${index}`}
                        renderRightActions={(progress, dragX) => renderRightActions(track.id, progress, dragX)}
                        containerStyle={{ marginBottom: 10 }}
                      >
                        <TouchableOpacity 
                          style={styles.trackCard}
                          onPress={() => handlePlayTrack(track)}
                          activeOpacity={0.7}
                        >
                          <Image source={{ uri: track.album?.images[0]?.url }} style={styles.trackImage} />
                          <View style={styles.trackInfo}>
                            <ThemedText style={styles.trackName} numberOfLines={1}>{track.name}</ThemedText>
                            <ThemedText style={styles.trackArtist} numberOfLines={1}>
                              {track.artists.map((a: any) => a.name).join(', ')}
                            </ThemedText>
                          </View>
                          <FontAwesome name="play-circle" size={28} color={COLORS.primary} />
                        </TouchableOpacity>
                      </Swipeable>
                    ))}

                    <View style={styles.resultsButtonsRow}>
                      <TouchableOpacity 
                        style={[styles.generateButton, { flex: 1 }]}
                        onPress={handleGeneratePlaylist}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#0f172a" />
                        ) : (
                          <>
                            <FontAwesome name="refresh" size={16} color="#0f172a" style={styles.buttonIcon} />
                            <ThemedText style={styles.generateButtonText}>Recargar Mix</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    {/* Formulario alineado verticalmente, sin tarjeta central para dar más aire */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.stepLabel}>¿Cómo se llamará el mix?</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Viaje por carretera, Gym..."
                    placeholderTextColor={COLORS.textMuted}
                    value={playlistName}
                    onChangeText={setPlaylistName}
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.stepLabel}>Artistas base</ThemedText>
                  <View style={styles.searchRow}>
                    <View style={styles.searchIconWrapper}>
                      <FontAwesome name="search" size={16} color={COLORS.textMuted} />
                    </View>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Escribe un artista y presiona + (Max. 5)"
                      placeholderTextColor={COLORS.textMuted}
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                      editable={!isLoading}
                      onSubmitEditing={handleAddArtist}
                    />
                    <TouchableOpacity 
                      style={[styles.addButton, (!searchQuery.trim() || isLoading) && styles.disabledButton]} 
                      onPress={handleAddArtist}
                      disabled={!searchQuery.trim() || isLoading}
                    >
                      <FontAwesome name="plus" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Lista de sugerencias */}
                  {suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {suggestions.map((artist) => (
                        <TouchableOpacity
                          key={artist.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(artist)}
                        >
                          <FontAwesome name="user-circle" size={16} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                          <ThemedText style={styles.suggestionText}>{artist.name}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Área de Chips visualmente separada */}
                <View style={styles.chipsArea}>
                  {selectedArtists.length === 0 ? (
                    <ThemedText style={styles.emptyText}>Aún no has agregado artistas.</ThemedText>
                  ) : (
                    <View style={styles.chipsContainer}>
                      {selectedArtists.map(artist => (
                        <View key={artist.id} style={styles.chip}>
                          <ThemedText style={styles.chipText}>{artist.name}</ThemedText>
                          <TouchableOpacity onPress={() => handleRemoveArtist(artist.id)} style={styles.chipClose}>
                            <FontAwesome name="times" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Botón flotante / de bloque completo al final */}
                <View style={styles.actionContainer}>
                  {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.generateButton, selectedArtists.length === 0 && styles.disabledButton]}
                      onPress={handleGeneratePlaylist}
                      disabled={selectedArtists.length === 0}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="magic" size={20} color="#0f172a" style={styles.buttonIcon} />
                      <ThemedText style={styles.generateButtonText}>Crear Playlist Automática</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
</View>
                )}

              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutButton: {
    padding: 10,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    // Efecto Neón
    borderWidth: 1,
    borderColor: '#bef264', // Borde aún más brillante
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textMain,
    letterSpacing: -1,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCard: {
    backgroundColor: COLORS.cardBg,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  connectButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.textMain, // Botón negro en tema claro se ve muy premium
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  uriContainer: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
  },
  uriLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  uriInput: {
    width: '100%',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: 12,
    color: COLORS.textMain,
    fontSize: 13,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appContainer: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 10,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
  },
  suggestionText: {
    fontSize: 15,
    color: COLORS.textMain,
  },
  searchIconWrapper: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: COLORS.textMain,
  },
  addButton: {
    margin: 6,
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    // Efecto Neón
    borderWidth: 1,
    borderColor: '#bef264',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.4,
  },
  chipsArea: {
    minHeight: 100,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    marginBottom: 30,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    // Contorno neón sutil para los chips
    borderWidth: 1,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  chipText: {
    color: COLORS.primary,
    fontWeight: '700',
    marginRight: 10,
    fontSize: 14,
  },
  chipClose: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    marginTop: 'auto', // Empuja el botón al fondo si hay espacio
    paddingTop: 20,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Efecto Neón fuerte
    borderWidth: 1,
    borderColor: '#bef264',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  generateButtonText: {
    color: '#0f172a', // En fondos verde claro neón, la letra oscura lee mejor
    fontSize: 18,
    fontWeight: '900',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5', // Verde muy clarito
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 20,
  },
  successIconBg: {
    width: 40,
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  successTextCol: {
    flex: 1,
  },
  successTitle: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  successDesc: {
    color: '#047857',
    fontSize: 13,
  },
  successClose: {
    padding: 8,
  },
  resultsContainer: {
    paddingBottom: 40,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 16,
    height: '100%',
  },
  resultsButtonsRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  changeArtistsButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 5,
  },
  changeArtistsTextTop: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
