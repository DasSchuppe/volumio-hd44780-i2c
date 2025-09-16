# Volumio HD44780 I²C Plugin

Dieses Plugin ermöglicht die Ansteuerung eines **HD44780 LCD Displays** (z. B. QAPASS 1602A, 2004A) über ein **I²C Interface Modul (PCF8574)** auf einem Raspberry Pi mit **Volumio 3**.

---

## Voraussetzungen

- Raspberry Pi (getestet mit 3B)
- Volumio 3.x (Node.js 14.x ist enthalten)
- LCD 1602 oder 2004 mit I²C-Modul (PCF8574)
- SSH-Zugang zu Volumio

---

## I²C aktivieren

1. Per SSH verbinden:
   ```bash
   ssh volumio@volumio.local
Passwort: volumio

In der Datei /boot/config.txt prüfen, ob folgende Zeile gesetzt ist:

txt
Code kopieren
dtparam=i2c_arm=on
Neustarten:

bash
Code kopieren
sudo reboot
Prüfen, ob das Display gefunden wird:

bash
Code kopieren
i2cdetect -y 1
→ Typischerweise erscheint 0x27 oder 0x3F.

Installation
1. Repo klonen
bash
Code kopieren
cd /home/volumio
git clone https://github.com/DasSchuppe/volumio-hd44780-i2c.git
cd volumio-hd44780-i2c
2. Abhängigkeiten installieren
bash
Code kopieren
npm install --production --arch=armv7l --platform=linux
3. Plugin verpacken
bash
Code kopieren
zip -r volumio-hd44780-i2c.zip *
4. Plugin installieren
Im Volumio Webinterface:
Einstellungen → Plugins → Plugin hochladen → volumio-hd44780-i2c.zip auswählen.

Nutzung
Nach der Installation unter
Einstellungen → Plugins → Miscellanea → HD44780 I²C öffnen.

I²C-Adresse einstellen (Standard: 0x27).

Displaygröße auswählen (z. B. 16x2 oder 20x4).

Plugin aktivieren.

Das Display zeigt nun automatisch den aktuellen Wiedergabestatus an.

Troubleshooting
Plugin startet nicht
→ prüfen, ob i2c-bus und lcd installiert sind:

bash
Code kopieren
npm list i2c-bus lcd
Display bleibt leer
→ mit i2cdetect -y 1 Adresse prüfen und im Plugin anpassen.

npm Fehler wegen make/gyp
→ Build-Tools nachinstallieren:

bash
Code kopieren
sudo apt-get update
sudo apt-get install -y build-essential
Abhängigkeiten
i2c-bus

lcd

Credits
Volumio Plugin-Dokumentation

fivdi/lcd für die Display-Ansteuerung