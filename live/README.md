# Live Stream — PWA na iPad (bez Maca)

Aplikacja webowa (PWA) do odtwarzania transmisji **HLS (.m3u8)** bezpośrednio na iPadzie w Safari. Nie wymaga Maca ani Xcode.

## Instalacja na iPadzie

### Krok 1 — Otwórz w Safari

Wejdź na adres aplikacji w **Safari** (nie w Chrome ani innej przeglądarce):

```
https://TWOJA-DOMENA/live/
```

Jeśli projekt jest wdrożony na Cloudflare Pages (repo `serwis`), adres będzie wyglądał np.:

```
https://naprawy.pages.dev/live/
```

### Krok 2 — Dodaj do ekranu początkowego

1. Naciśnij ikonę **Udostępnij** (↑) na dole ekranu
2. Przewiń w dół i wybierz **Dodaj do ekranu początkowego**
3. Potwierdź nazwę **Live Stream** i naciśnij **Dodaj**

Aplikacja pojawi się na ekranie początkowym i uruchomi się w trybie pełnoekranowym — jak natywna aplikacja.

## Użycie

1. Naciśnij **+** w lewym panelu
2. Wklej adres `.m3u8` **lub** wybierz plik playlisty z iPada (Pliki, iCloud, itp.)
3. Dotknij strumień na liście, aby odtworzyć
4. Użyj natywnych kontrolek wideo (pauza, pełny ekran, AirPlay)

## Funkcje

- Odtwarzanie HLS przez natywny odtwarzacz Safari (idealne na iPadOS)
- Import plików `.m3u8` / `.m3u`
- Parsowanie playlist z wieloma kanałami
- Zapis listy strumieni (localStorage)
- Tryb standalone po dodaniu na ekran początkowy
- Ciemny interfejs zoptymalizowany pod iPad

## Wdrożenie (hosting)

Projekt jest skonfigurowany pod **Cloudflare Pages** (`wrangler.toml` serwuje katalog główny). Po pushu na GitHub aplikacja będzie dostępna pod ścieżką `/live/`.

Lokalny podgląd (jeśli masz Node):

```bash
npx wrangler pages dev . --port 8788
# Otwórz http://localhost:8788/live/
```

## Dlaczego nie natywna aplikacja Swift?

Aplikacja Xcode w `LiveStreamPlayer/` wymaga **Maca z Xcode** do kompilacji i instalacji na iPadzie. Bez Maca jedyną praktyczną opcją jest **PWA w Safari** — działa na iPadzie bez dodatkowego sprzętu.

## Uwagi

- Niektóre strumienie mogą wymagać HTTPS
- Safari na iPadzie obsługuje HLS natywnie — nie trzeba dodatkowych bibliotek
- Lista strumieni jest zapisywana lokalnie w przeglądarce
