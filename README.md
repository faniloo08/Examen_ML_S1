<h1 align="center">MalagasyEditor</h1>

<p align="center">
  <strong>Une plateforme d'édition de texte, destiné aux utilisateurs malagasy</strong>
</p>

## 👥 Équipe (ESIIA 5)
| Nom | Numéro | Rôle |
|----|------|--------|
| RAVOAHANGY Laza Francky | 3 | ML  |
| VONJINIAINA Josoa | 7 |  Back-end |
| RAMANIRAKARISON Tolotriniaina Ishmayah | 9 | ML  |
| ANDRIAMASINORO Aina Maminirina | 12 |  Back-end |
| RABEMANANTSOA Fanilonombana Diana | 13 |  Front-end |
| RAZANAJATOVO ANDRIANIMERINA Kinasaela | 16 |  ML |
| RASOANAIVO Aro Itokiana | 20 | ML  |

---

## 🛠 Stack Technique

### 🔙 Backend & Machine Learning
- **Langage** : Python
- **Framework** : FastAPI
- **ML** : 
- **Déploiement** : Render

### 🎨 Frontend
- **Framework** : Next.js 15 (React 19)
- **Styling** : Tailwind CSS
- **Déploiement** : Vercel (recommandé)


## ▶️ Lancer le projet en local

### Frontend
```bash
cd frontend/examml
npm install
npm run dev
```

```bash
cd backend
# Créer un venv
python -m venv venv
# Activer le venv (Windows)
.\venv\Scripts\activate
# Installer les dépendances
pip install -r requirements.txt
# Lancer le serveur
uvicorn main:app --reload
```

## Futures améliorations

- Lémmatisation
- Analyse de sentiments
- Synthèse vocale (TTS)

**Version finale :** **[Lien de l'application](https://exam-ml-s1.vercel.app/)**

**Lien vidéo démonstration** : https://drive.google.com/drive/folders/1RymRwBTAAIFKFehbJmOjWbXhwgrGOOU3?usp=drive_link
