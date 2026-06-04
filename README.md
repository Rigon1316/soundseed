# 🌱 SoundSeed

> Descubre música nueva mezclando a tus artistas favoritos. Elige hasta 5 artistas, y SoundSeed genera un mix personalizado de 25 canciones listo para reproducirse en Spotify.

---

## ✨ Características

- 🎵 **Generación inteligente de Mixes** — Selecciona hasta 5 artistas y obtén una lista de 25 canciones mezcladas al azar.
- 🔍 **Búsqueda con sugerencias en vivo** — Autocompletado inteligente con debounce que consulta la API de Spotify mientras escribes.
- 👆 **Swipe para eliminar** — Desliza cualquier canción a la izquierda para eliminarla del mix.
- 🔁 **Recargar Mix** — Genera una combinación diferente de canciones con los mismos artistas.
- 🎧 **Reproducción directa** — Toca cualquier canción para abrirla directamente en Spotify (app nativa o navegador).
- 🔐 **Autenticación segura** — Flujo OAuth 2.0 con PKCE, sin necesidad de backend. Tokens guardados con `expo-secure-store`.
- 🎨 **Diseño Neon Olive** — Interfaz moderna en tema claro con acentos verde olivo y contornos con efecto neón.

---

## 📸 Flujo de uso

1. Vincula tu cuenta de Spotify.
2. Escribe el nombre de un artista → selecciona de las sugerencias.
3. Agrega hasta 5 artistas.
4. Presiona **"Crear Playlist Automática"**.
5. ¡Disfruta tu mix! Toca cualquier canción para escucharla en Spotify.

---

## 🛠️ Stack tecnológico

| Tecnología | Uso |
|---|---|
| [Expo](https://expo.dev/) (SDK 54) | Framework principal de React Native |
| [React Native](https://reactnative.dev/) 0.81 | UI nativa multiplataforma |
| [expo-auth-session](https://docs.expo.dev/versions/latest/sdk/auth-session/) | Autenticación OAuth 2.0 + PKCE con Spotify |
| [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) | Almacenamiento seguro de tokens |
| [expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) | Fondos con degradado |
| [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) | Gestos de swipe para eliminar canciones |
| [Spotify Web API](https://developer.spotify.com/documentation/web-api) | Búsqueda de artistas y canciones |
| TypeScript | Tipado estático |

---

## 📂 Estructura del proyecto

```
SoundSeed/
├── app/
│   ├── (tabs)/
│   │   └── index.tsx          # Pantalla principal (formulario + lista de canciones)
│   └── _layout.tsx            # Layout raíz de navegación
├── hooks/
│   └── useSpotifyAuth.ts      # Hook de autenticación OAuth 2.0 + PKCE
├── services/
│   └── spotifyApi.ts          # Cliente de la API de Spotify
├── components/
│   └── themed-text.tsx        # Componente de texto con tema
├── .env                       # Variables de entorno (Client ID)
├── app.json                   # Configuración de Expo
└── package.json
```

---

## 🚀 Instalación y ejecución

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Una cuenta de [Spotify Developer](https://developer.spotify.com/dashboard)
- App de Expo Go en tu dispositivo móvil

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/SoundSeed.git
cd SoundSeed
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=tu_client_id_aqui
```

### 4. Configurar Spotify Developer Dashboard

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Crea una nueva aplicación (o usa una existente).
3. En **Redirect URIs**, agrega la URL que la app imprime en la consola al iniciarse (por ejemplo: `exp://192.168.x.x:8081`).
4. Asegúrate de habilitar **Web API** en la configuración de la app.

### 5. Iniciar el servidor de desarrollo

```bash
npx expo start --clear
```

Escanea el código QR con Expo Go en tu dispositivo móvil.

---

## ⚠️ Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| **Creación de playlists** | Desde noviembre de 2024, Spotify restringió la creación de playlists vía API para aplicaciones nuevas en modo desarrollo. Por esta razón, SoundSeed muestra las canciones directamente en la app en lugar de guardarlas como playlist en tu cuenta. |
| **Requiere Spotify Premium** | El dueño de la aplicación en Spotify Developer Dashboard debe tener una suscripción Premium activa. |
| **Máximo 5 artistas** | Para mantener la calidad y variedad del mix, se limita la selección a 5 artistas por generación. |
| **Token expira** | Los tokens de Spotify expiran después de ~1 hora. Cierra sesión y vuelve a vincular tu cuenta si notas errores. |

---

## 📄 Licencia

Este proyecto es de uso personal y educativo.

---

<p align="center">
  Hecho con 💚 y mucha música
</p>
