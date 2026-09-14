# Siatka — czytelny YouTube na tablecie

Nakładka webowa na problem **ogromnych, mało czytelnych miniaturek** w aplikacji YouTube Premium na tablecie.

## Co robi

Oficjalna aplikacja często używa układu telefonu i skaluje go na szeroki ekran — widać wtedy 1–1,5 gigantycznej miniatury. **Siatka** pokazuje feed w 2–4 kolumnach z kontrolą gęstości.

## Użycie

1. Otwórz `/yt/` na tablecie (Chrome / Edge / Safari).
2. Opcjonalnie: **Dodaj do ekranu głównego** (PWA).
3. „Przeglądaj w siatce” → popularne / wyszukiwanie.
4. Film otwiera się w oficjalnym playerze YouTube (Premium działa po zalogowaniu w przeglądarce).

## Userscript (oficjalna strona YouTube)

Plik: [`youtube-tablet-grid.user.js`](./youtube-tablet-grid.user.js)

1. Zainstaluj Violentmonkey / Tampermonkey.
2. Zainstaluj userscript.
3. Otwórz `youtube.com` w trybie pulpitu.

## Czego to nie robi

Nie patchuje natywnej aplikacji YouTube Premium (APK). Do tego służą zewnętrzne narzędzia typu ReVanced — poza zakresem tej nakładki.
