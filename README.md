# LiLi (v0.1) — Asistente de voz privado para reproducir música

LiLi es un asistente de voz tipo “Alexa/Google Assistant”, pero **bajo mi control**: el objetivo es que el procesamiento ocurra **en local** o en **infraestructura propia**, priorizando privacidad, transparencia y modularidad.

Esta **primera versión (MVP)** se centra en un caso de uso concreto: **reproducir música por voz** desde una biblioteca personal servida por **Navidrome**, usando compatibilidad **Subsonic / OpenSubsonic API**.

> ⚠️ **Estado del proyecto**: prototipo/MVP en evolución.

---

## 🧩 Qué incluye esta primera versión (MVP)

**Objetivo del MVP:** “Reproducir música por voz” (comandos simples) sin depender de servicios en la nube.

- App móvil (enfoque inicial Android, pensada para escalar).
- **STT offline** (Speech-to-Text) con **Vosk** para transcribir la voz a texto.
- Interpretación sencilla del comando (reglas / keywords).
- Integración con **Navidrome** vía **Subsonic / OpenSubsonic API** para buscar canciones/playlists.
- Reproducción local en el dispositivo con **react-native-track-player**.
- Feedback visual: estados (escuchando / buscando / reproduciendo) y transcripción.

---

## 🏗️ Arquitectura (v0.1)

Pipeline típico:

1. Micrófono → captura de audio  
2. **Vosk (offline)** → transcripción a texto  
3. Parser de comandos → intención (canción/playlist/controles básicos)  
4. **Navidrome (Subsonic/OpenSubsonic API)** → búsqueda + obtención de IDs / URL de stream  
5. **Track Player** → reproduce URL (stream) en el móvil

---

## 🔒 Privacidad y filosofía

- **Sin nube por defecto**: la voz se transcribe localmente y la música viene de un servidor propio (Navidrome).
- Preferencia por **componentes auditables** (muchos de ellos open source).
- Comunicaciones seguras recomendadas (HTTPS / VPN) si se expone Navidrome fuera de la red local.

> Nota: Que LiLi se apoye en componentes open source **no significa** que LiLi sea open source. LiLi es **software propietario** (ver Licencia).

---

## 🧰 Stack técnico (MVP)

- **React Native + TypeScript** (base multiplataforma).
- **Vosk** + `react-native-vosk` (STT offline).
- **Navidrome** (servidor de música) + compatibilidad **Subsonic / OpenSubsonic**.
- `react-native-track-player` para reproducción.
- Cliente Subsonic TS o llamadas directas con `fetch`.

---

## ✅ Requisitos

### App (React Native)
- Node.js + entorno React Native
- Android Studio (AVD) para Android
- (Opcional) Xcode para iOS

### Servidor de música
- Navidrome levantado y accesible desde el móvil
- Biblioteca musical cargada
- Usuario creado para acceso por API

### Modelo de voz (Vosk)
- Modelo español recomendado (ejemplo): `vosk-model-small-es-0.22` (tamaño aproximado según proveedor)

---

## ⚙️ Configuración

Crea un fichero de entorno (ej. `.env`) o un módulo de config (según tu estrategia) con:

- `NAVIDROME_URL` (ej: `http://192.168.1.50:4533`)
- `NAVIDROME_USER`
- `NAVIDROME_PASSWORD` (o token/API token si lo configuras)
- `SUBSONIC_CLIENT_NAME` (ej: `LiLi`)
- `SUBSONIC_API_VERSION` (ej: `1.16.1` si aplicase)
- `VOSK_MODEL_PATH` (ruta/asset del modelo en Android/iOS)

> Nota: en móvil, guarda credenciales de forma segura (keystore/keychain) cuando pase de prototipo a uso real.

---

## ▶️ Cómo se usa (MVP)

1. Abro LiLi.
2. Pulso el botón **Hablar** (push-to-talk).
3. Digo un comando de música.
4. LiLi muestra la transcripción, busca en Navidrome y reproduce.

---

## 🗣️ Comandos soportados (propuesta inicial)

> Parser simple por keywords, pensado para ampliar.

- “**Pon** {canción}”
- “**Reproduce** {canción}”
- “Pon la **canción** {nombre}”
- “Reproduce mi **lista/playlist** {nombre}”
- (Opcional) “**Pausa**”, “**Siguiente**”, “**Anterior**” (si se implementa control del reproductor)

---

## 🧪 Plan de desarrollo (resumen por fases)

1. **Entorno** RN + Navidrome + modelos Vosk + librerías base  
2. **STT offline** (Vosk) + permisos micrófono  
3. **Parser de comandos** (reglas)  
4. **Integración Navidrome** (búsqueda + playlists + URL stream)  
5. **Reproducción** con Track Player  
6. **Feedback UI** (escuchando / buscando / reproduciendo + errores)  
7. **Pruebas E2E** + ajustes finales (latencia, recursos, fiabilidad)  

---

## 🧯 Manejo de errores (MVP)

- “No te he entendido” si transcripción vacía o muy mala.
- “No encontré esa canción/lista” si Navidrome devuelve resultados vacíos.
- “Servidor inaccesible” si no hay conectividad con Navidrome.

---

## 🛣️ Roadmap post-MVP (ideas)

- Wake word “LiLi” (activación por palabra) en vez de botón.
- TTS (respuesta por voz) para confirmaciones.
- NLP más robusto (Rasa u otros enfoques) si crecen los comandos.
- Modo “dispositivo dedicado” (Raspberry Pi en casa).
- Más skills (domótica, recordatorios, etc.).

---

## 📦 Componentes de terceros

LiLi puede interactuar con o depender de componentes/especificaciones de terceros (p. ej., Navidrome / Subsonic / OpenSubsonic, Vosk, etc.).  
Cada componente está sujeto a su **propia licencia**. Consulta `THIRD_PARTY_NOTICES.md` para más detalles.

> LiLi **no está afiliado** a Navidrome, OpenSubsonic, Vosk ni a ningún proyecto de terceros.

---

## 🤝 Contribución

Este repositorio es **propietario**.  
Por ahora **no se aceptan issues/PRs externos**. Si quieres comentar algo o proponer mejoras, contacta conmigo.

---

## 📄 Licencia

**LiLi es software propietario.**  
Consulta `LICENSE.md`.
