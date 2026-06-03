# Local Notch

Version locale et fonctionnelle de la notch, sans onboarding, paramètres, mise à jour Sparkle ou liens externes de l’app d’origine.

## Contenu essentiel
- `notch2.xcodeproj`
- `boringNotch/`
- `BoringNotchXPCHelper/`
- `mediaremote-adapter/`

## Démarrage
Lancer uniquement l’app locale :

```bash
./start-notch2.sh
```

## Lancement en ligne de commande (build)
```bash
xcodebuild -project notch2.xcodeproj -scheme boringNotch -configuration Debug -derivedDataPath .build/DerivedData build
```
