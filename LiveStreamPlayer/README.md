# Live Stream Player — iPadOS

Natywna aplikacja na **iPadOS** do odtwarzania transmisji na żywo z plików i adresów **HLS (.m3u8)**.

## Funkcje

- Odtwarzanie strumieni HLS (.m3u8) przez natywny `AVPlayer`
- Import plików playlisty `.m3u8` / `.m3u` z aplikacji Pliki
- Dodawanie strumieni po adresie URL
- Automatyczne parsowanie playlist M3U (wiele kanałów w jednym pliku)
- Lista zapisanych strumieni z możliwością usuwania
- Interfejs zoptymalizowany pod iPad (`NavigationSplitView`)
- Picture-in-Picture i sterowanie odtwarzaniem
- Ciemny motyw i oznaczenie transmisji **LIVE**

## Wymagania

- macOS z **Xcode 15+**
- iPad z **iPadOS 17+**
- Konto Apple Developer (do instalacji na urządzeniu)

## Uruchomienie

1. Otwórz projekt w Xcode:

   ```bash
   open LiveStreamPlayer/LiveStreamPlayer.xcodeproj
   ```

2. W **Signing & Capabilities** ustaw swój **Team** (Development Team).

3. Wybierz symulator iPada lub podłączony iPad.

4. Uruchom aplikację (**⌘R**).

## Użycie

1. Naciśnij **+** w pasku narzędzi.
2. Wklej adres `.m3u8` **lub** zaimportuj plik playlisty.
3. Wybierz strumień z listy po lewej stronie.
4. Odtwarzacz uruchomi transmisję automatycznie.

### Przykładowa playlista

W repozytorium znajduje się plik `sample-playlist.m3u8` z przykładowym strumieniem testowym Apple.

## Struktura projektu

```
LiveStreamPlayer/
├── LiveStreamPlayer.xcodeproj
├── LiveStreamPlayer/
│   ├── LiveStreamPlayerApp.swift
│   ├── ContentView.swift
│   ├── Models/StreamItem.swift
│   ├── Services/M3UParser.swift
│   ├── ViewModels/
│   │   ├── StreamStore.swift
│   │   └── PlayerViewModel.swift
│   └── Views/
│       ├── VideoPlayerView.swift
│       ├── AddStreamSheet.swift
│       └── StreamRowView.swift
└── sample-playlist.m3u8
```

## Uwagi techniczne

- Aplikacja używa `NSAllowsArbitraryLoads` w `Info.plist`, aby obsługiwać strumienie HTTP/HTTPS spoza domyślnej konfiguracji ATS. W produkcji warto ograniczyć to do znanych domen.
- Master playlisty HLS (z `#EXT-X-STREAM-INF`) są odtwarzane bezpośrednio — `AVPlayer` sam wybiera wariant jakości.
- Lista strumieni jest zapisywana lokalnie w `UserDefaults`.

## Licencja

Projekt wewnętrzny — Serwis ROW-POL.
